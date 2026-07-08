/*
 * Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:actions');
var logger = logging.logger;
var debug = logging.debug;

var async = require('async');
var inspect = require('util').inspect;
var path = require('path');

var Joose = require('joose');
var Class = Joose.Class;
var Activated = require('./utils').Activated;
var ExternalCommand = require('./external_commands').ExternalCommand;
var MongooseDocument = require('mongoose').Document;

var DEFAULT_EXTERNAL_ACTIONS_DIRECTORY = path.join(__dirname, '/../external_commands');

var Action = (exports.Action = Class({
  my: {
    has: {
      actions: Joose.I.Object,
    },
    methods: {
      registerAction: function (name, value) {
        return (this.actions[name] = value);
      },
      load: function (filepath) {
        var act = require(filepath);
        act.filepath = filepath;
        /*
         * make up a name for the action if none was specified
         */
        if (act.name == undefined) act.name = path.basename(filepath);

        switch (act.type) {
          case 'internal_function':
            return this.registerAction(act.name, new InternalFunction(act));
            break;
          case 'internal_update':
            return this.registerAction(act.name, new InternalUpdateAction(act));
            break;
          case 'internal_delete':
            return this.registerAction(act.name, new InternalDeleteAction(act));
            break;
          case 'external':
            return this.registerAction(act.name, new ExternalAction(act));
            break;
          default:
            logger.error('Unknown action type: ' + inspect(act));
            throw new Error('Unsuported Action type: ' + act.type);
            break;
        }
      },
      find: function (name) {
        var action = this.actions[name];
        if (action == undefined) {
          logger.warn('Failed to find named action: ' + name);
          debug('actions:', this.actions);
        }
        return action;
      },
      all: function () {
        var acts = new Array();
        for (var i in this.actions) acts.push(this.actions[i]);
        return acts;
      },
    }, // methods
  }, // statics
  has: {
    each: { is: 'ro', init: false },
    name: {
      is: 'ro',
      init: function (attr_name, config) {
        // if no action name was specified then use the filename instead
        return config[attr_name] || this.filename();
      },
    },
  },
  does: Activated,
  methods: {
    /*
     * execute() should be overridden by the InternalAction or ExternalAction
     */
    execute: function () {
      console.log('Abstract base method...');
    },
  },
}));

var InternalFunction = (exports.InternalFunction = Class({
  isa: Action,
  has: {
    command: { is: 'ro', required: true },
  },
  methods: {
    execute: function (lert, trig_query, cb) {
      this.getCommand()(lert, cb);
    },
  },
}));

var InternalAction = (exports.InternalAction = Class({
  isa: Action,
  has: {
    criteria: { is: 'rw', builder: 'buildCriteria' },
  },
  before: {
    execute: function (lert) {
      logger.debug('Validating lert....');
      if (lert == undefined) throw new Error('undefined alerts to execute action against');

      if (!(lert instanceof MongooseDocument)) {
        throw new Error('Lert is not a Mongoose Document');
      }
    },
  },
  after: {
    initialize: function (props) {
      if (typeof props.criteria == 'object') {
        debug('[%s] wrappering function around object: ', this.getName(), props.criteria);
        return function (lert) {
          return props.criteria;
        };
      }
    },
  },
  methods: {
    buildCriteria: function (config) {
      /*
       * if no criteria for an internal action was specified, presume
       * it means update for this _id, i.e. the row found by the trigger
       */
      return function (lert) {
        return { _id: lert._id };
      };
    },
  },
}));

var InternalUpdateAction = (exports.InternalUpdateAction = Class({
  isa: InternalAction,
  has: {
    setit: { is: 'ro', required: true },
  },
  methods: {
    execute: function (lert, trig_query, cb) {
      var self = this;

      debug('[%s] executing InternalUpdate with lert:', lert, this.getName());
      var criteria_fn = this.getCriteria() || trig_query;
      var criteria = criteria_fn(lert);
      var setthis = self.getSetit()(lert);
      debug('[%s] executing InternalUpdate on', criteria, this.getName());
      debug('[%s] executing InternalUpdate setthis', setthis, this.getName());

      Alerts.update(
        criteria,
        { $currentDate: { state_change: true }, $set: setthis },
        { multi: true },
        function (err, updated_count) {
          if (err) logger.error('[' + self.getName() + '] ' + err + ' criteria: ' + inspect(criteria));

          if (updated_count != undefined) logger.debug('[' + self.getName() + '] updated ' + updated_count + ' rows');

          cb(err);
        }
      );
    },
  },
}));

var InternalDeleteAction = (exports.InternalDeleteAction = Class({
  isa: InternalAction,
  methods: {
    execute: function (lert, trig_query, cb) {
      var self = this;
      var criteria = trig_query;
      if (typeof this.getCriteria() == 'function') criteria = this.getCriteria()(lert);

      Alerts.remove(criteria, function (err, results) {
        if (err) logger.error('[' + self.getName() + '] ' + err);
        logger.info('[' + self.getName() + '] deleted ' + results + ' rows');
        cb(err);
      });
    },
  },
}));

var ExternalAction = (exports.ExternalAction = Class({
  isa: Action,
  after: {
    initialize: function (props) {
      if (props.on != undefined) {
        debug('PROPS.ON', props.on);
        var obj = new Object();
        for (var prop in props.on) {
          var on_action = new InternalAction(props.on[prop]);
          obj[prop] = on_action;
        }
        this.setOn(obj);
      }
      if (this.getCommand().charAt(0) != '/') {
        var command_without_path = this.getCommand();
        this.setCommand(DEFAULT_EXTERNAL_ACTIONS_DIRECTORY + '/' + command_without_path);
      }
      /*
       * create the external command object once, which will validate the program to run exists
       */

      this.setExternalCmd(new ExternalCommand({ cmd: this.getCommand() }));
    },
  },
  has: {
    /*
     * external actions default to executing FOR EACH row returned by the trigger
     */
    command: { is: 'rw' }, // override base class so we can set it
    externalCmd: { is: 'rw' }, // override base class so we can set it
    each: { is: 'ro', init: true },
    on: {
      is: 'rw',
      init: function (attr_name, config) {
        return {
          default: {
            type: 'internal',
            name: 'default',
            command: {
              function: function () {
                logger.debug('Called fallback default');
              },
            },
          },
        };
      },
    },
    update_with: {
      is: 'rw',
      init: function (attr_name, config) {
        debug('update_WITH', arguments);
      },
    },
  },
  methods: {
    // Triggers iterate their result set and call execute() once per document
    // (see triggers.js `TriggerAction.fire`). We spawn the configured
    // external command once for that single lert, pass the alert fields as
    // env vars, then dispatch to the on-handler matching the command's
    // return code (or the 'default' handler).
    execute: function (lert, trig_query, cb) {
      var self = this;
      debug('executing external action against:', lert);

      var external_command = self.getExternalCmd();
      var shell_env = lert.toShellEnv();
      debug('Passing this in the ENV to command', shell_env);
      external_command.setEnv(shell_env);

      external_command.run(function (err, return_code) {
        logger.debug('CMD-OUT: ' + external_command.getStdout());
        logger.debug('CMD-ERR: ' + external_command.getStderr());
        if (err) return cb && cb(err);

        var on_handlers = self.getOn();
        var on_handler_action = on_handlers[return_code] || on_handlers['default'];
        debug('on handler:', on_handler_action);
        on_handler_action.execute(lert, trig_query, cb);
      });
    },
  },
}));
