/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:server:external_commands');
var logger = logging.logger;
var debug = logging.debug;

var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;
var inspect = require('util').inspect;

var Class = require('joose').Class;
var Activated = require('./utils').Activated;

var DEFAULT_ARGS_NOT_SET = { OAF_ARG_COUNT: 0 };
var DEFAULT_EXTERNAL_COMMANDS_DIRECTORY = path.join(__dirname, '../external_commands');

exports.run_trigger = function (trigger_name, env, fn) {
  var e = env || { NOENVSET: 1 };

  ExternalClasses.findOne({ trigger_name: trigger_name }, function (err, result) {
    debug('trace name returned', result);

    if (err) fn(err);
    else if (!result) {
      logger.error('No configured trigger named: ' + trigger_name + ' - not in the database');
      fn('missing trigger');
    } else {
      var command_to_run = result.command;
      if (result.command && result.command.indexOf('/') != 0) {
        /*
         * command does not start with an absolute path
         * so assume it is relative to $OAFHOME/EventServer/external_commands
         */

        command_to_run = path.join(__dirname, '../external_commands/' + result.command);
      }
      debug('running command', command_to_run);

      // no arguments are passed through, the alerts fields are passed in via the environment

      var cmd = spawn(command_to_run, [], { env: e });

      cmd.on('exit', function (return_code) {
        logger.info('external command: ' + command_to_run + ' return code = ' + return_code);
      });
      cmd.stdout.on('data', function (data) {
        logger.debug(trigger_name + ': ' + data);
        fn(null, data);
      });
    }
  });
};

/*
 * trigger_name: String, column from the externalclasses table
 * intial_alert: Object, for the alert that that needs updating
 * fn: callback( err, script_response )
 *
 * purpose
 * runs an external command passing the alerts fields via the
 * environment and reads back the output of new column assignments
 *
 */
exports.update_alert = function (trigger_name, initial_alert, fn) {
  exports.run_trigger(trigger_name, initial_alert, function (err, data) {
    if (err) {
      logger.error('Failed to run_trigger: ' + err);
      fn(err);
    } else {
      logger.debug('update_alert got data: ' + data);
      var lines = new String(data).split('\n');
      var pattern = /^([a-zA-Z_]+)=(.*)/;

      var external_updates = {};
      for (l in lines) {
        var line = lines[l];
        logger.debug('GOT line: ' + line);
        var matches = pattern.exec(line);
        debug('matches:', matches);
        if (matches === null) {
          debug('Failed to match line [%s]');
          logger.info('Did not find a regex match');
          continue;
        }

        if (matches[1] != undefined && matches[2] != undefined) {
          var key = matches[1];
          var value = matches[2];

          /*
           * validate that key's we get back are valid columns
           */

          logger.debug('KEY = ' + key + ' VALUE = ' + value);
          if (oafserver.alerts.hasColumn(key)) {
            external_updates[key] = value;
          } else {
            logger.warn('External command attempted update on unknown field [' + key + ']');
          }
        }
      }

      logger.debug('alert updates = ' + inspect(external_updates));
      fn(null, external_updates);
    }
  });
};

var ExternalCommand = (exports.ExternalCommand = Class({
  has: {
    //    logger:   { is: 'ro', required: true },
    cmd: { is: 'ro', required: true },
    stdout: { is: 'rw' }, // used to keep a record of the stdout/err
    stderr: { is: 'rw' },
    env: {
      is: 'rw',
      init: function (attr_name, config) {
        logger.debug('ExternalCommand has env of type [' + typeof config[attr_name] + ']');

        var env_object = new Object();
        switch (typeof config[attr_name]) {
          case 'array':
            var o = config[attr_name];
            o['OAF_ARG_COUNT'] = config[attr_name].length;

            this.setEnv(o);
            break;
          case 'object':
            var o = config[attr_name];
            o['OAF_ARG_COUNT'] = 1;
            this.setEnv(o);
            break;
          case 'undefined':
          default:
            this.setEnv(DEFAULT_ARGS_NOT_SET);
            break;
        }
      },
    },
  },
  does: Activated,
  after: {
    initialize: function (config) {
      /*
       * all external commands must have an absolute path, if this cmd does
       * not have one, then prepend a directory
       */
      var cmd = this.getCmd();
      if (cmd.charAt(0) != '/') {
        this.setCmd(DEFAULT_EXTERNAL_COMMANDS_DIRECTORY + '/' + cmd);
      }
      /*
       * check the path to the external command exists and activate this if it is
       */
      var cmd_exists = fs.existsSync(this.getCmd());
      if (cmd_exists) logger.debug('ExternalCommand checking for existence of [' + this.getCmd() + '] <- OK');
      else logger.error('ExternalCommand checking for existence of [' + this.getCmd() + '] <- MISSING');

      this.setActivated(cmd_exists);
    },
  },
  methods: {
    make_the_env: function () {
      /*
       * probably a better cleaner way of doing this, but basically we are constructing
       * a shell enviroment object, but we may have 1 or more alerts to pass
       * so we prefix each env with and index number_ and set a counter variable
       * NOTE: the indexed variables start at 0 (zero)
       * NOTE: OAF_ARG_COUNT will hold the number of alerts
       */
      var e = this.getEnv();

      var new_env = new Object();
      switch (typeof this.getEnv()) {
        case 'object':
          new_env['OAF_ARG_COUNT'] = 1;
          for (var key in e) {
            new_env['0_' + key] = e[key];
          }
          break;
        case 'array':
          new_env['ARRAY_OAF_ARG_COUNT'] = e.length;
          for (var index = 0; index < e.length; index++) {
            for (var key in e[index]) {
              new_env[index + '_' + key] = e[index][key];
            }
          }
          break;
        default:
          logger.error("can't make an env with this: " + inspect(e));
          break;
      }
      debug('made this env object', new_env);
      return new_env;
    },
    run: function (fn) {
      var self = this;
      if (!this.getActivated()) {
        logger.error('Can not run the command [' + this.getCmd() + '] as its not activated');
      } else {
        // ensure stdout/err buffers are emptied
        var stdout = '';
        var stderr = '';
        self.setStdout('');
        self.setStderr('');

        /*
         * run the command, no args are passed directly via rgv
         * pass parameters via the environment instead
         */
        var cmd = spawn(this.getCmd(), [], { env: this.make_the_env() });

        cmd.on('exit', function (return_code) {
          logger.info('external command: ' + self.getCmd() + ' return code = ' + return_code);
          /*
           * collect up the stdout/err
           */

          self.setStdout(stdout);
          self.setStderr(stderr);

          fn(null, return_code);
        });
        cmd.stdout.on('data', function (data) {
          stdout += data;
          logger.debug(self.getCmd() + ': ' + data);
        });
        cmd.stderr.on('data', function (data) {
          stderr += data;
          logger.debug(self.getCmd() + ': ' + data);
        });
      }
    },
  },
}));
