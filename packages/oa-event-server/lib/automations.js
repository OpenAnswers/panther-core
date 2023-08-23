/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:server:automations');
var logger = logging.logger;
var debug = logging.debug;

var async = require('async');
var fs = require('fs');
var inspect = require('util').inspect;
var path = require('path');
var Trigger = require('./triggers').Trigger;
var Action = require('./actions').Action;
var OAmonHome = require('./OAmonHome').OAmonHome;

var DEFAULT_AUTOMATIONS_DIRECTORY = path.join(__dirname, '../automations');
var DEFAULT_WATCH_TIMEOUT = 10 * 1000;
var DEFAULT_WATCH_TRIGGERS = DEFAULT_WATCH_TIMEOUT;
var DEFAULT_WATCH_ACTIONS = DEFAULT_WATCH_TIMEOUT;
var DEFAULT_ACTION_NAME = 'default';

var oamonhome = new OAmonHome();

var Class = require('joose').Class;

var AutomationManager = (exports.AutomationManager = Class({
  has: {
    automations_directory: {
      is: 'ro',
      init: DEFAULT_AUTOMATIONS_DIRECTORY,
      getterName: 'getAutoDir',
    },
    actions_directory: {
      is: 'rw',
      getterName: 'getActionsDir',
      setterName: 'setActionsDir',
    },
    triggers_directory: {
      is: 'rw',
      getterName: 'getTriggersDir',
      setterName: 'setTriggersDir',
    },
    logger: { is: 'rw' },
    triggers: { is: 'rw', init: {} },
    actions: { is: 'rw', init: {} },
  },
  after: {
    initialize: function (props) {
      console.log('AutomationsManager: after init');
      this.setTriggersDir(this.getAutoDir() + '/triggers');
      this.setActionsDir(this.getAutoDir() + '/actions');
    },
  },
  methods: {
    setup: function (setup_cb) {
      // inside async, 'this' will be async's this, so make a copy here to self
      var self = this;
      async.series(
        {
          actions: function (cb) {
            self.loadActions(cb);
          },
          triggers: function (cb) {
            self.loadTriggers(cb);
          },
        },
        function (err, results) {
          setup_cb(err);
        }
      );
    },

    start: function (cb) {
      async.forEach(
        Trigger.all(),
        function (trig, trig_cb) {
          trig.start(trig_cb);
        },
        function (err) {
          if (err) logger.error(err);
          cb(err);
        }
      );
    },

    /*
     * loaders for the triggers
     */
    loadTriggers: function (finished_cb) {
      var self = this;
      this.loadAutomationComponent(
        this.getTriggersDir(),
        function (filepath, cb) {
          var trigger = Trigger.load(filepath);
          cb(null, trigger);
        },
        finished_cb
      );
    },

    /*
     * loaders for the actions
     */
    loadActions: function (finished_cb) {
      var self = this;
      this.loadAutomationComponent(
        this.getActionsDir(),
        function (filepath, cb) {
          var action = Action.load(filepath);
          debug('Loaded Action: ', action);
          cb(null, action);
        },
        finished_cb
      );
    },

    sanitizeFiles: function (filepath, cb) {
      debug('sanitizing filepath: ', filepath);
      var filename = path.basename(filepath);
      if (filename.match(/^[0-9]+.*/)) {
        logger.debug('filename OK: ' + filename);
        cb(true);
      } else {
        logger.info('filename ignored: ' + filename);
        cb(false);
      }
    },
    /*
     * load a component [filter|action]
     */
    loadAutomationComponent: function (directory, load_component, finished_cb) {
      var self = this;
      var autos = this;

      fs.readdir(directory, function (err, files) {
        if (err) {
          logger.warn('Failed to read directory: ' + directory);
          finished_cb(err);
        } else {
          /*
           * take the list of files from the directory read and remove out cruft
           */
          async.filter(files, autos.sanitizeFiles, function (filtered_files) {
            if (filtered_files.length == 0) {
              logger.info('No automation components found in: ' + directory);
              finished_cb(null, []);
            } else {
              logger.info('Loading component from: ' + filtered_files.join(', '));
              /*
               * filtered_files is just the filenames so we need to prepend
               * back onto each of them the dircetory that its loaded from
               * giving us a full path
               */
              var file_paths = filtered_files.map(function (file) {
                return directory + '/' + file;
              });
              logger.debug('filepaths: ', file_paths.join(', '));

              /*
               * now using the component loader actually deal with the files
               */
              async.map(file_paths, load_component, function (err, results) {
                if (err) {
                  logger.error('loadAutomationComponent ' + err);
                  finished_cb(err);
                } else {
                  debug('loaded component: ', results);
                  finished_cb(null, results);
                }
              }); //async.map
            }
          }); //async.filter
        }
      }); //fs.readdir
    },
  },
}));
