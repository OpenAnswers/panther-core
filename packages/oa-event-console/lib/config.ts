//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Config

// Simple module to load and store express app config

// The express Path module will be mixed in so the default
// paths will be available via Config as well

// Logging modules
const { logger, debug } = require('oa-logging')('oa:event:console:config');

// Node modules
const fs   = require('fs');

// npm modules
const yaml = require('js-yaml');
const _    = require('lodash');

// OA modules
const Errors = require('oa-errors');
const { format_string, random_string } = require('oa-helpers');
const { EventRules,
  Agents }        = require('oa-event-rules');
const { Path } = require('./path');

// Our app has a rules path
Path.add_local('rules', 'rules');


// Store for config instances
// defaults to `default` when nothing is provided
const instances = {};


// External method to get a config instance
const get_instance = function( name ) {
  name ??= 'default';
  return instances[name] ?? (instances[name] = new Config(name, {}));
};


const load_file = function( config_path, name ) {
  name ??= 'default';
  const config_full_path = Path.p.resolve(config_path);
  const data = fs.readFileSync(config_full_path);
  const doc  = yaml.load(data);
  doc.config_file = config_path;
  
  instances[name] = new Config(name, doc);

  debug('we have an instnace!', instances[name]);

  return instances[name];
};


// ## Class

class Config {
  config_file: any;
  path: any;
  app: any;
  mongodb: any;
  http: any;
  event_server: any;
  event_monitors: any;
  smtp: any;
  session: any;
  rules: any;

  static load_file( config_path, name ) {
    name ??= 'default';
    const config_full_path = Path.p.resolve(config_path);
    const data = fs.readFileSync(config_full_path);
    const doc  = yaml.load(data);
    doc.config_file = config_path;
    
    return instances[name] = new Config(name, doc);
  }

  constructor( name, opts ) {
    opts ??= {};
    if (opts.config_file) {
      this.config_file = opts.config_file;
    }

    this.path = Path;

    const app_defaults = {
      domain:       'localhost',
      client_id:    'local0',
      name:         'Panther',
      console:      'local',
      email:        'support@openanswers.co.uk',
      url:          'http://localhost:3001',
      support_url:  'https://openanswers.github.io/panther-docs/',
      signup_url:   'https://signup.panther.support',
      view_limit:   2000,
      uuid_enabled:  false,
      assets_build_dir: 'builtAssets',
      private_path: 'private',
      apikey_limit: 7,
      swagger_docs: false,
      swagger_json: 'swagger.json',

      archive_time: {
        clear: 24,
        delete: 4
      },

      integrations: {
        logs: {
          hours: 24 * 7
        }
      },

      syslog_port:   5000,

      key: {
        apikey: {
          "uuid-blah-uuid": "event_monitor_http"
        }
      },

      upload: {
        directory: "/tmp/rule-upload",
        maxsize: 1024*1024
      }, // 1MB

      login: {
        interval: 50,
        max_attempts: 10,
        max_interval: 60 * 5 * 1000
      }
    };

    this.app = _.merge(app_defaults, opts.app);

    
    // mongo db
    const mongodb_defaults = {
      uri:          'mongodb://127.0.0.1:27017/oa',
      database:     'oa',
      collection:   'alerts',
      timer:        12 * 1000, // 1 second
      //id_timer:     5 * 60 * 1000 # 5 minutes
      // maximum consequtive connection failures before exiting
      max_connects: 20
    };

    this.mongodb = _.merge(mongodb_defaults, opts.mongodb);


    // ### Http
    const http_defaults =
      {port:         3001};

    this.http = _.merge(http_defaults, opts.http);


    // Event server config
    const event_server_defaults = {
      host: 'localhost',
      port: 4002
    };
    this.event_server = _.merge(event_server_defaults, opts.event_server);


    // Event monitors config
    const event_monitors_defaults = {
      syslogd: {
        host: 'localhost',
        port: 1503
      },
      http: {
        host: 'localhost',
        port: 5001
      }
    };

    this.event_monitors = _.merge(event_monitors_defaults, opts.event_monitors);


    // ### Smtp
    const smtp_defaults = {
      host:         'mta.example.com',
      port:         25,
      secure:       false,
      ignoreTLS:    true
    };

    this.smtp = _.merge(smtp_defaults, opts.smtp);
    

    // ### Session
    const session_defaults = {
      secret:       random_string(64),
      timeout:      2 * 24 * 60 * 60 * 1000 // 2 days
    };

    this.session = _.merge(session_defaults, opts.session);
    

    // ### Rules
    const rules_defaults = {
      // Source this from `rules`?
      types: [ 'server', 'syslogd', 'http', 'graylog' ],
      agents: [ 'syslogd' ],
      file: '{type}.rules.yml',
      path: Path.rules,

      git: false,
      push: false,
      push_url: 'http://git.example.com/panther/panther-event-rules',
      push_branch: null,

      // Storage for the rule sets
      // TODO move these into their own structure so they dont clash with above
      server:   null,
      http:     null,
      syslogd:  null,
      graylog:  null
    };

    this.rules = _.merge(rules_defaults, opts.rules);
    
    debug('Config setup from %s', this.config_file, this);
    logger.info('Generated new config name [%s]', name);
  }


  // Helper to build a rules path from config
  rules_path( type ){
    if (!(_.indexOf(this.rules.types, type) > -1)) {
      const err = new Errors.ValidationError(`No rule type [${type}]`);
      logger.error(err);
      return (() => { throw err; })();
    }
      //return false

    const rules_path = Path.join(this.rules.path, format_string(this.rules.file, {type}));
    return Path.resolve(rules_path);
  }

  // Helper to load configured rules
  rules_load( type, opts ){
    opts = _.defaults({}, opts);
    switch (type) {
      case 'server': opts.server = true; break;
      default: opts.agent = true;
    }
    opts.path =  this.rules_path(type);
    return this.rules[type] = new EventRules(opts);
  }
}


module.exports = {
  Config,
  get_instance,
  load_file
};
