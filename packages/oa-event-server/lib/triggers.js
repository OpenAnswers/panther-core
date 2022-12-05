/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:server:triggers');
var logger = logging.logger;
var debug = logging.debug;

var path = require('path');
var inspect = require('util').inspect;
var Joose = require('joose');
var Class = Joose.Class;
var Action = require('./actions').Action;
var InternalAction = require('./actions').InternalAction;
var Activated = require('./utils').Activated;
var Filepath = require('./utils').Filepath;

var MongooseDocument = require('mongoose').Document;
var bus = require('./ipcbus').internal_bus;

var DEFAULT_INTERVAL = 60;

var Trigger = (exports.Trigger = Class('Trigger', {
  does: [Activated, Filepath],

  /*
   * my: {} is class static attributes and functions
   * its used for loading and registering actual trigger objects
   */
  my: {
    has: {
      triggers: Joose.I.Object,
    },
    methods: {
      registerTrigger: function (name, value) {
        logger.info('Registering [' + name + ']');
        debug('Registerered a name:value', name, value);
        return (this.triggers[name] = value);
      },
      load: function (filepath) {
        var trig = require(filepath);
        trig.filepath = filepath;
        debug('Trigger loaded via require', trig);

        /*
         * if no trigger name was specified then use the files name instead
         */
        if (trig.name == undefined) trig.name = path.basename(filepath);

        if (trig.action == undefined) {
          logger.error(trig.name + ' missing an action');
          return;
        }

        if (trig.when == undefined) {
          logger.error('[' + trig.name + '] missing when: {} section');
          return;
        }

        /*
         * find out when this trigger is supposed to fire
         * then mixin to the instance of this class some suitable
         * start and stop methods which will override those defined
         * by Trigger.methods.(start|stop)
         */
        if (trig.when.periodic != undefined) {
          logger.debug('[' + trig.name + '] Adding periodic role');
          trig.trait = PeriodicActionRole;
        } else if (trig.when.on != undefined) {
          logger.debug('[' + trig.name + '] Adding event on role');
          trig.trait = EventedActionRole;
        }

        if (typeof trig.action == 'object') {
          /*
           * trigger definition contains:
           * action: { update: { ... } }
           */
          if (trig.action.update != undefined) return this.registerTrigger(trig.name, new TriggerUpdate(trig));
          else if (trig.action.execute != undefined)
            /*
             * or trigger definition contains:
             * action: { execute: { ... } }
             */
            return this.registerTrigger(trig.name, new TriggerAction(trig));
          else {
            logger.error('[' + trig.name + '] is missing a valid action on: ' + inspect(trig.action));
            return;
          }
        } else if (typeof trig.action == 'string') {
          /*
           * trigger defintion containging:
           * action: 'delete'
           * is handled slightly differently to previous two cases for update and execute
           * this may change in the future
           */
          switch (trig.action) {
            case 'delete':
              return this.registerTrigger(trig.name, new TriggerDelete(trig));
              break;
            default:
              logger.error('[' + trig.name + '] action has an unsupported string value: ' + trig.action);
              return;
              break;
          }
        } else {
          logger.error('unsuported trigger action: ' + inspect(trig.action));
          return;
        }
      },
      /*
       * find a trigger by name
       */
      find: function (name) {
        return this.triggers[name];
      },
      /*
       * return all trigger object as an array
       */
      all: function () {
        var trigs = new Array();
        for (var i in this.triggers) {
          trigs.push(this.triggers[i]);
        }
        return trigs;
      },
    },
  },

  /*
   * now onto the instance attributes and methods
   */

  has: {
    /*
     * name: all triggers are required to have a symbolic name,
     * use the value from the trigger definition, otherwise the Class loader
     * will default to the file name
     */
    name: { is: 'rw', required: true },

    /*
     * query: an object defining what the trigger will query for
     * this should be a Mongoose query
     */
    query: { is: 'ro' },

    /*
     * when: when will the trigger fire,
     */
    when: { is: 'ro', required: true },

    /*
     * TBC
     */
    on_success: { is: 'ro' },
    on_failure: { is: 'ro' },
  },

  after: {
    initialize: function (props) {
      if (['object', 'function'].indexOf(typeof props.query) < 0)
        throw new Error('[' + this.getName() + '] has an invalid query type: ' + typeof props.query);

      if (typeof props.when != 'object')
        throw new Error('[' + this.getName() + '] has an invalid when type: ' + typeof props.query);
    },
  },

  methods: {
    fetchQuery: function () {
      if (typeof this.getQuery() == 'function') return this.getQuery()();
      else return this.getQuery();
    },

    /*
     * start:
     * base classes method, which does nothing by default, mixins applied during
     * object instantiation / loading are expected to provide this method
     */
    start: function (cb) {
      logger.warn('[' + this.getName() + '] did not have a mixed in start method');
      cb(null);
    },
    stop: function (cb) {
      logger.warn('[' + this.getName() + '] did not have a mixed in stop method');
      cb(null);
    },
  },
}));

/*
 * TriggerAction
 * The main type of trigger which queries for documents from mongodb
 * and then executes an associated Action for the rows returned
 */
var TriggerAction = (exports.TriggerAction = Class({
  isa: Trigger,

  has: {
    /*
     * action: as loaded from the trigger file
     */
    action: { is: 'ro', required: true },

    /*
     * execute: a list of Action names that will be run in turn when a trigger finds
     * find a macth.
     * note: this is merely what is in the trigger definition file
     */
    execute: { is: 'ro' }, // names of actions can be string or Array of strings

    /*
     * actionObjects: is a array of Action object references that have already been
     * loaded by Action.load
     */
    actionObjects: { is: 'rw', isPrivate: true, builder: 'buildActionObjects' },
    columns: { is: 'rw', builder: 'buildColumns' },
    /*
     * each: [true|false] should the trigger run its action for each row
     * thats found, or pass the entire result set to the action
     */
    each: { is: 'ro', init: true },
  },
  methods: {
    /*
     * builders in the has: { ..., ... } section above will only get called
     * if the constructor was not passed the attribute in question.
     * so these are our fallbacks
     */
    buildColumns: function (config) {
      if (config.action.columns == undefined) return new Array();
      else if (typeof config.action.columns == 'string') return config.action.columns.split(',');
      else if (typeof config.action.columns == 'object' && config.action.columns instanceof Array)
        return config.action.columns;
      else throw new Error('[' + this.getName() + '] unknown columns type: ' + typeof config.action.columns);
    },
    /*
     * buildActionObjects() is not passed to the constructor via the trigger definition file
     * it is created by finding the actual named Action which must have already been loaded
     */
    buildActionObjects: function (config) {
      logger.debug('[' + this.getName() + '] building actions');

      var action_objects = [];
      var execute_names = [];
      if (typeof config.action.execute == 'array') execute_names.concat(config.action['execute']);
      else if (typeof config.action.execute == 'string') execute_names = config.action.execute.split(',');

      debug('building trigger [%s] actions [%s]', this.getName(), execute_names.join(', '));

      for (var index = 0; index < execute_names.length; index++) {
        var action = Action.find(execute_names[index]);
        if (action) {
          logger.debug('[%s] found action: %s', this.getName(), action.getName());
          action_objects.push(action);
        }
      }
      return action_objects;
    },
    /*
     * fire: the main part of the Trigger
     * its responsible for querying mongodb, getting some (if any) results, and then
     * exectuting the actions in turn for each result
     */
    fire: function (cb) {
      var self = this;
      debug('[%s] this', this.getName(), this);
      debug('Trigger [%s] selecting... %s for query:', this.getName(), this.getColumns().join(','), this.fetchQuery());

      Alerts.find(self.fetchQuery(), self.getColumns(), function (err, results) {
        if (err) {
          cb('Failed to find alerts for trigger [' + self.getName() + ']: ' + err);
        } else if (results.length == 0) {
          debug('Trigger [%s] has no results so will NOT be executing any actions', self.getName());
          cb(null);
        } else {
          /*
           * sanity check that we did get back a mongoose document
           */
          var i = results[0] instanceof MongooseDocument;
          logger.debug('Trigger first result is instanceof Document is:', i);

          if (results.length > 0)
            logger.info('Trigger [' + self.getName() + '] running with ' + results.length + ' records');

          /*
           * go over each result
           */
          async.forEachSeries(
            results,
            function (doc, eachdoc_cb) {
              /*
               * pass each result to the Action's in turn
               */
              var action_objs = self.getActionObjects();
              debug('action objs', action_objs);
              async.forEachSeries(
                self.getActionObjects(),
                function (action, action_cb) {
                  logger.debug(
                    'Trigger [ ' + self.getName() + '] ' + doc._id + ' -> action [' + action.getName() + ']'
                  );
                  action.execute(doc, self.fetchQuery(), action_cb);
                },
                function (err) {
                  if (err) logger.error('Failure in action detected: ' + err);

                  /*
                   * when we reach here, we have executed all actions for one row queried
                   */
                  eachdoc_cb(err);
                }
              ); // each action
            },
            function (err) {
              if (err) logger.error('Failure in results: ' + err);

              /*
               * when here, we have executed all actions for all rows queried by the trigger
               */
              cb(err);
            }
          );
        }
      });
    },
  },
}));

/*
 * TriggerDelete
 * will delete whatever records are matched by the query
 */
var TriggerDelete = (exports.TriggerDelete = Class({
  isa: Trigger,

  methods: {
    fire: function (cb) {
      var self = this;
      Alerts.find(self.fetchQuery(), function (err, docs) {
        if (err) {
          logger.error('[' + self.getName() + '] : ' + err);
          return cb(err);
        }

        logger.debug('[' + self.getName() + '] found ' + docs.length + ' clears to delete');
        if (docs.length == 0) return cb(null);

        Alerts.remove(self.fetchQuery(), function (err, deleted_result) {
          if (err) {
            logger.error('[' + self.getName() + '] : ' + err);
            return cb(err);
          }

          logger.info('[%s] deleted [%s] documents', self.getName(), deleted_result.n, '');
          var delete_ids = docs.map(function (doc) {
            return doc._id;
          });
          bus.emit('Deletes.*', 'triggers', delete_ids);

          cb(err);
        });
      });
    },
  },
}));

var TriggerUpdate = (exports.TriggerUpdate = Class({
  isa: Trigger,
  has: {
    updateFunction: { is: 'rw' },
  },

  after: {
    initialize: function (config) {
      if (config.action == undefined || config.action.update == undefined)
        throw new Error('[' + this.getName() + '] has unhandled action type');

      if (typeof config.action.update == 'function') this.setUpdateFunction(config.action.update);
      else if (typeof config.action.update == 'object')
        this.setUpdateFunction(function () {
          return config.action.update;
        });
    },
  },

  methods: {
    fire: function (cb) {
      var self = this;
      var f = self.getUpdateFunction();

      /*
       * ensure that the state_change is updated
       */
      var time_now = new Date();
      f.state_change = time_now;

      Alerts.update(self.fetchQuery(), f(), { multi: true }, function (err, update_count) {
        if (err) logger.error('[' + self.getName() + '] failed to update: ' + err);
        logger.info('[' + self.getName() + '] updated ' + update_count + ' documents');
        cb(err);
      });
    },
  },
}));

/*
 * Mixin's follow
 * these define what happens when thr trigger is started ot stopped
 * they oeverride the base classes (Trigger) start method with a
 * more suitable one
 */
var PeriodicActionRole = (exports.PeriodicActionRole = Class({
  has: {
    sample: { is: 'rw', builder: 'buildSamplePeriod' },
    timer: { is: 'rw' },
  },
  methods: {
    buildSamplePeriod: function (config) {
      if (config.when.periodic != undefined) {
        /*
         * the sample period comes from trigger definition
         * via when.periodic
         */
        return config.when.periodic;
      }
    },
    start: function (cb) {
      /*
       * a periodic trigger runs every n seconds
       */
      var self = this;
      if (this.getActivated()) {
        logger.info('[' + this.getName() + '] is activated and is being started');
        var timer_id = setInterval(function () {
          /*
           * execute the trigger when the timer has reached its interval
           */
          self.fire(function (err) {
            if (err) logger.error('Failure in trigger: ' + err);
          });
        }, this.getSample() * 1000);
        this.setTimer(timer_id);
      } else logger.info('[' + this.getName() + '] is deactivated');

      cb(null);
    },
    stop: function (cb) {
      /*
       * deactivate the timer, thus stopping the trigger
       */
      var self = this;
      self.deactivate();
      cb(clearInterval(self.getTimer()));
    },
  },
}));

var EventedActionRole = (exports.EventedActionRole = Class({}));
