// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging modules
const { logger, debug } = require('oa-logging')('oa:event:rules:event_rules');

// npm modules
const Promise = require('bluebird');
const yaml = require('js-yaml');
const tmp = Promise.promisifyAll(require('tmp'));
const moment = require('moment');

// node modules
const { readFileSync, watch } = require('node:fs');
const { writeFile, stat } = require('node:fs/promises');
const mvAsync = Promise.promisify(require('mv'));
const path = require('path');
const git = Promise.promisifyAll(require('gift'));

// Wrap mv with ENOENT-tolerant resolution: if the source doesn't exist,
// resolve with a marker string instead of rejecting.
const moveFileAsync = (src, dest) =>
  new Promise((resolve, reject) =>
    mvAsync(src, dest)
      .then(res => resolve(res))
      .catch(function (error) {
        if (error.code === 'ENOENT') return resolve('no existing file to copy');
        return reject(error);
      })
  );

// oa modules
const Errors = require('oa-errors');
const { throw_error, _, delay, objhash } = require('oa-helpers');

const { RuleSet } = require('./rule_set');
const { Groups } = require('./groups');
const { Event } = require('./event');

const { Action } = require('./action');
const { Select } = require('./select');
const { Option } = require('./option');

const { Agents } = require('./agents');
const { Schedules } = require('./schedules');

const { validate_server_rules, joi_error_summary } = require('./validations');

// ## EventRules

// EventRules is the grouping of all the rules for the event system
// It houses the syslog rules, global rules, group rules and metadata
// for the rules system
//
// `@globals` has the global RuleSet
// `@groups` contains the RuleSet for each group, by key

// CJS-only guard: see oa-errors/src/errors.ts — top-level `this.X = X` only works under CommonJS.
if (typeof module === 'undefined' || (this as unknown) !== module.exports) {
  throw new Error(
    'CommonJS module context required — top-level `this.X = X` exports do not work in ESM. Rewrite as `export { X }` before changing module type.'
  );
}

this.EventRules = class EventRules {
  static load(path) {
    debug('Reading yaml file', path);

    try {
      const data = readFileSync(path, 'utf8');
      debug('loaded data', data);
      const y = yaml.load(data);
      debug('loaded yaml', y);
      return y;
    } catch (err) {
      debug('loading failed', err);
      if (err instanceof yaml.YAMLException) {
        logger.error('Invalid YAML', err.reason);
        return throw_error('Invalid YAML');
      } else {
        logger.error('Unknown error ', err);
        return throw_error('Unknown error loading rule file');
      }
    }
  }

  //catch e
  //logger.error 'Error loading yaml', e

  // convenience static to commit and push a file
  static git_commit_and_push(yaml_path, msg, opts) {
    if (opts == null) {
      opts = {};
    }
    if (!opts.git) {
      logger.warn(`Attempting to commit,push but GIT is disabled at ${yaml_path}`);
      return Promise.resolve(true);
    }

    return new Promise(function (resolve, reject) {
      // setup paths
      const path_repo = path.dirname(yaml_path);
      const yaml_filename = path.basename(yaml_path);
      // setup repo as promised
      const repo = Promise.promisifyAll(git(path_repo));
      return repo
        .commitAsync(msg, {
          all: true,
          author: `${opts.user_name} <${opts.user_email}>`,
        })
        .then(function (res) {
          logger.info('Committed', res);
          if (opts.git_push) {
            return repo.remote_pushAsync('origin', 'master');
          } else {
            return res;
          }
        })
        .then(res => resolve(res))
        .catch(function (err) {
          logger.error('Commit failed', err);
          return reject(err);
        });
    });
  }

  constructor(opts) {
    if (opts == null) {
      opts = {};
    }
    debug('creating new EventRules with:', opts);
    //@cb   = opts.cb || ->

    // Option, reload_rules automatically
    this.reload_rules = opts.reload_rules || true;

    // rules are being saved
    // FIXME: 0 - working
    this.saving_counter = 0;

    // git commit msgs
    this.edit_msgs = [];

    // Callback to run on rules reload
    this.reload_cb = opts.reload_cb || null;

    // yaml doc
    this.doc = opts.doc;

    // path to yaml
    this.path = opts.path; //|| @constructor.default_path()

    // Queue of watch events
    this.watch_events = [];

    if (opts.server) {
      this.type = 'server';
    } else if (opts.agent) {
      this.type = 'agent';
    } else {
      this.type = 'none';
    }

    if (this.doc) {
      this.build_from_yaml();
    } else {
      this.load_yaml();
    }

    if (this.path) {
      this.watch_rules();
    }
  }

  build_from_yaml() {
    debug('Generating rules object for:', this.doc, this.type);
    switch (this.type) {
      case 'server':
        logger.info('Generating server rules from doc');
        this.generate_rules_server(this.doc);
        break;
      case 'agent':
        logger.info('Generating agent rules from doc');
        this.generate_rules_agent(this.doc);
        break;
      case 'none':
        logger.info('Generating rules from doc');
        this.generate_rules(this.doc);
        break;
    }

    return (this.edited = false);
  }

  // ###### watch_rules()

  // Uses a queue and delay of 1 second so things like truncating the
  // file before writing it out don't get picked up
  // Not perfect if there are lots of seperate events triggered on the
  // file but good enough for the moment
  watch_rules() {
    this.stop_rules_watch();
    if (!this.reload_rules) {
      return;
    }
    const self = this;
    const watch_dir = path.dirname(this.path);
    const watch_file = path.basename(this.path);
    logger.info('Setting up file watch on [%s] for [%s]', watch_dir, watch_file);
    return (this.watch = watch(watch_dir, function (event, path) {
      debug('change detected ev[%s] path[%s]', event, path);
      if (path !== watch_file) {
        return;
      }
      logger.info('Rules file changed, waiting 1 seconds for node fs:watch', path, event);

      self.watch_events.push({ event, path });

      // Delay a bit so multiple quick events are batched
      // into a single reload
      return delay(1000, function () {
        debug('timer for watch change is running', self.watch_events.length);
        if (!(self.watch_events.length > 0)) {
          return;
        }
        self.reload(event, path);
        return (self.watch_events = []);
      });
    }));
  }

  stop_rules_watch() {
    if (this.watch && this.watch.close) {
      return this.watch.close();
    } else {
      return false;
    }
  }

  // ###### @load_yaml( path )
  // Load a yaml file into the rules object model
  load_yaml(yaml_path) {
    if (yaml_path == null) {
      yaml_path = this.path;
    }
    this.doc = this.constructor.load(yaml_path);
    return this.build_from_yaml();
  }

  // ###### @reload()
  // Reload the file on disk.
  // Used for discarding in memory changes.
  reload(ev, evpath) {
    if (ev == null) {
      ev = 'reload';
    }
    if (evpath == null) {
      evpath = this.path;
    }
    this.load_yaml();
    if (this.reload_cb) {
      return this.reload_cb(ev, evpath);
    }
  }

  // ###### have_edits()
  // Flag to check if a rule set has modification that
  // have not been saved
  have_edits() {
    return this.edited;
  }

  // ###### set_edited_flag()
  // Set the edited flag
  set_edited_flag() {
    return (this.edited = true);
  }

  append_edited_msg(msg) {
    this.edit_msgs.push(msg);
    return logger.debug('APPENDING msg ', msg);
  }

  have_edited_msgs() {
    return this.edit_msgs.length > 0;
  }

  // ###### @to_yaml_obj( options )
  // Dump the rules back to yaml format
  //
  // Options:
  //
  // - `hash` `true/false` a sha1 hash of the complete yaml object
  //    will be attached.
  to_yaml_obj(options) {
    if (options == null) {
      options = {};
    }
    const o = {};
    if (this.agent) {
      o.agent = this.agent.to_yaml_obj();
    }
    if (this.globals) {
      o.globals = { rules: this.globals.to_yaml_obj() }; // Why does this need `rules:`?
    }
    if (this.groups) {
      o.groups = this.groups.to_yaml_obj();
    }

    if (this.schedules) {
      o.schedules = this.schedules.to_yaml_obj();
    }
    if (options.hash) {
      const hash = objhash(o);
      o.hash = hash;
    }

    o.metadata = {};
    o.metadata.save_date = Date.now();
    return o;
  }

  // ###### @to_yaml()
  // Convert to yaml text
  to_yaml(options) {
    return yaml.dump(this.to_yaml_obj(options));
  }

  // ###### @save_yaml_async()
  //
  // Save event rules back to the yaml file, first creating a
  // temp file, moving the current file to a backup, then moving
  // the temp file into place.
  //
  save_yaml_async(yaml_path) {
    if (yaml_path == null) {
      yaml_path = this.path;
    }
    const self = this;
    return new Promise(function (resolve, reject) {
      // mv file to file.date
      // save new file

      //return true

      // increment lock and test
      self.saving_counter += 1;
      debug('saving_counter = ', self.saving_counter);
      if (self.saving_counter !== 1) {
        logger.error('ASSERT saving counter', self.saving_counter);
        return reject('rules are being saved by someone else');
      }

      const doc = self.to_yaml();

      debug('save_yaml generated a yaml doc', '\n' + doc);

      let tmp_path = '';
      let tmp_cleanup_cb = null;

      // First create a temp file to write to
      return tmp
        .fileAsync()
        .then(function (path, fd, cleanup_cb) {
          debug('Tmp file save path fd cb', path, fd, cleanup_cb);
          // .spread allows an array of arguments to be passed into this function
          tmp_path = path;
          tmp_cleanup_cb = cleanup_cb;

          // Now write the tmp yaml file, create a backup
          logger.info('Writing yaml document to [%s]', tmp_path);
          return writeFile(tmp_path, doc);
        })
        .then(function (res) {
          debug('save_yaml: after tmp write', res);
          return stat(yaml_path);
        })
        .then(function (stat) {
          // Backup the current file
          const datestamp = moment().format('YYYYMMDD-hhmmss');
          const backup_file = `${yaml_path}.${datestamp}`;

          logger.info('Creating backup yaml document [%s]', backup_file);

          return moveFileAsync(yaml_path, backup_file);
        })
        .then(function (res) {
          debug('save_yaml: yaml renamed to backup', res);

          // Put the new file into place
          logger.info('Moving yaml document to [%s]', tmp_path);
          return mvAsync(tmp_path, yaml_path);
        })
        .then(function (res) {
          debug('save_yaml: temp yaml renamed to real', res);
          logger.info(`YAML rules file written [${yaml_path}]`);
          self.edited = false;
          return resolve();
        })
        .catch(function (error) {
          logger.error('Error saving yaml file [%s]', error, error.stack);
          debug('save_yaml running temp cleanup after error');
          return reject(error);
        });
    }).finally(function () {
      // decrement the lock
      self.saving_counter -= 1;
      return debug('finally save_yaml_async', self.saving_counter);
    });
  }

  // Reload from file
  //@constructor.load @path

  // ###### save_yaml_git_async()
  // Save event rules back to the yaml file and commit to git
  // instead of saving a backup file.
  save_yaml_git_async(yaml_path, opts) {
    if (yaml_path == null) {
      yaml_path = this.path;
    }
    if (opts == null) {
      opts = {};
    }
    const self = this;
    return new Promise(function (resolve, reject) {
      // increment lock and test
      self.saving_counter += 1;
      debug('saving_counter = ', self.saving_counter);
      if (self.saving_counter !== 1) {
        return reject('rules are being saved by someone else');
      }

      // Gen our rules yaml
      const doc = self.to_yaml();
      debug('save_yaml_git generated a yaml doc', '\n' + doc);

      // Setup git paths
      const path_repo = path.dirname(yaml_path);
      const yaml_filename = path.basename(yaml_path);
      logger.info('Writing yaml document to git [%s] [%s]', yaml_path, path_repo);

      // Place to store the repo ref
      const repo = Promise.promisifyAll(git(path_repo));
      const repo_index = null;

      return writeFile(yaml_path, doc)
        .then(function (res) {
          debug('save_yaml_git: yaml written to file', yaml_path);
          logger.info(`YAML rules file written [${yaml_path}]`);
          self.edited = false;
          return repo.addAsync(yaml_filename);
        })
        .then(function (res) {
          debug('save_yaml_git: yaml_filename added to git [%s] [%s]', res, yaml_filename);

          let commit_msg = `Rules UI deploy - ${opts.user_name}`;
          if (self.have_edited_msgs()) {
            commit_msg += '\n' + self.edit_msgs.join('\n');
            self.edit_msgs = [];
          }

          return self.git_commit_Async(repo, commit_msg, {
            all: true,
            author: `${opts.user_name} <${opts.user_email}>`,
          });
        })
        .then(function (res) {
          let ret;
          debug('save_yaml_git: git commit res', res);
          return (ret = opts.git_push ? repo.remote_pushAsync('origin', 'master') : false);
        })
        .then(function (res) {
          debug('save_yaml_git: push res or false', res);
          return resolve(res);
        })
        .catch(function (error, out, err) {
          logger.error('Error saving yaml file to git[%s]', error, error.stack);
          logger.error('stdout', error.stdout);
          logger.error('stderr', error.stderr);
          debug('error', out, err);
          return reject(error);
        });
    }).finally(function () {
      // decrement the lock
      debug('decrementing counter', self.saving_counter);
      return (self.saving_counter -= 1);
    });
  }

  // `git_commit_Async`
  // Create a function so we can capture stdout and stderr on
  // the error message.
  git_commit_Async(repo, msg, opts) {
    if (opts == null) {
      opts = {};
    }
    return new Promise((resolve, reject) =>
      repo.commit(msg, opts, function (error, stdout, stderr) {
        if (error) {
          error.stdout = stdout;
          error.stederr = stderr;
          reject(error);
        }
        return resolve(stdout);
      })
    );
  }

  groups_array() {
    return this.groups.store_order;
  }

  has_group(group) {
    return this.groups.has_group(group);
  }

  // This was an attempt to expose a single interface via EventRules
  // to all the underlying modules. This means the public API to
  // would all be via EventRules,  but this might grow way too big
  action_names() {
    return _.keys(Action.types);
  }

  select_names() {
    return _.keys(Select.types);
  }

  option_names() {
    return _.keys(Option.types);
  }

  find(ids) {
    const self = this;
    let r = [];

    _.forEach(ids, function (id) {
      if (self.groups) {
        return (r = _.flatten(self.groups.find(id)));
      }
    });
    return r;
  }

  // Generate all the data from the yaml definitions
  // Agent
  // Globals
  // Groups
  // Schedules
  generate_rules() {
    //global_discard
    //global_dedupe
    this.schedules = Schedules.generate(this.doc.schedules, this);

    // Agent specifics
    this.agent = Agents.generate(this.doc.agent, this);

    // Globals
    if (this.doc.globals == null) {
      throw_error('definition missing globals');
    }

    this.globals = RuleSet.generate(this.doc.globals, this);

    debug('generate rules setup globals', this.globals);

    // Groups
    if (this.doc.groups == null) {
      throw_error('definition missing groups');
    }

    this.groups = Groups.generate(this.doc.groups, this);

    debug('generate rules has setup groups', this.groups.store_order);

    // Return the document
    return this.doc;
  }

  // Generate all the data from the yaml definitions
  // Server
  generate_rules_server() {
    const { error, value } = validate_server_rules(this.doc);

    if (error) {
      for (var err of Array.from(error.details)) {
        logger.info('Validation failed', err.message);
      }

      const summaries = joi_error_summary(error);

      throw new Errors.ValidationError('Server Rules: ' + summaries.join(','));
    }

    // Schedules
    // must be parsed first as they are refrenced after
    this.schedules = Schedules.generate(this.doc.schedules, this);

    // Globals

    if (this.doc.agent) {
      this.agent = Agents.generate(this.doc.agent);
    }

    if (this.doc.globals == null) {
      throw_error('Rule yaml definition is missing `globals`');
    }

    this.globals = RuleSet.generate(this.doc.globals, this);
    // TODO
    debug('generate rules setup globals', this.globals);

    // Groups
    if (this.doc.groups == null) {
      throw_error('Rule yaml definition is missing `groups`');
    }

    this.groups = Groups.generate(this.doc.groups, this);

    debug('generate rules has setup groups', this.groups.store_order);

    return this.doc;
  }

  // Generate all the data from the yaml definitions
  // Agent
  generate_rules_agent() {
    if (!this.doc.agent) {
      throw_error('Rule yaml definition is missing `agent`');
    }
    this.agent = Agents.generate(this.doc.agent, this);
    return this.doc;
  }

  // FIXME time to replace the @Identifier with a hash
  // current thinking is google's Farmhash

  // ###### `run( event )`

  // The main entry point for events.
  // A json event goes into the rules
  // A copy of the event, possibly modified
  //  comes out after rules processing
  // options{ tracking_matches: true|false }
  run(event_obj, options) {
    if (options == null) {
      options = {};
    }
    const self = this;
    if (!(event_obj instanceof Event)) {
      // Create a rule Event with some extras
      event_obj = Event.generate(event_obj);
    }

    if (options.tracking_matches) {
      event_obj.set_tracking(options.tracking_matches);
    }

    debug('starting rules procesing for event', event_obj.original);
    const ts_start = Date.now();

    // Sync
    // apply global rules first
    if (self.globals) {
      self.globals.run(event_obj);
      // close off any global match tracking
      event_obj.close_matched_global();
    }
    // apply group rules
    if (self.groups) {
      self.groups.run(event_obj);
    }

    // finally set identifier
    if (self.globals || self.groups) {
      const gl = self.globals ? 'true' : 'false';
      const gr = self.groups ? 'true' : 'false';
      debug('setting identifier GL=%s, GR=%s', gl, gr);
      event_obj.populate_identifier();
    } else {
      event_obj.populate_pre_identifier();
    }

    const ts_total = Date.now() - ts_start;
    debug('rule processing took %s ms', ts_total);
    // # Promised
    // self.globals.run event_obj
    // .then (event_obj) ->
    //   self.groups.run event_obj
    // #.then (event_obj) ->
    //   #self.globals_post.run event_obj
    // .catch (err) ->
    //   console.error 'Error', err, err.stack
    //   throw_error err

    //event_obj

    // A `EventRule.{id}` event will be fired when the rule
    // processing is complete. It will contain the event_obj

    return event_obj;
  }

  // ###### `agent_map( input_message )`

  // Sends a raw input message through the agent mappings so
  // we have all the fields right for the rules to start
  agent_map(input_message, event_obj) {
    if (event_obj == null) {
      event_obj = {};
    }
    const self = this;

    // Create a rule Event with some extras
    if (!(event_obj instanceof Event)) {
      event_obj = Event.generate(event_obj);
    }

    event_obj.set_input_object(input_message);

    this.agent.run(event_obj);

    return event_obj;
  }

  // ###### `rules( new_object, input_message_object )`

  // This is the event console *monitors* entry point.
  // Keeping it with the same signature for the moment
  rules(new_object, input_message) {
    const event_obj = this.agent_map(input_message, new_object);
    const processed = this.run(event_obj);

    // monitors expect the incoming object to be modified
    _.assign(new_object, processed.copy);

    // Dump the simple js object back out to the rules processing
    return new_object;
  }
};
