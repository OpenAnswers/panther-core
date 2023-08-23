/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:client_manager');
var logger = logging.logger;
var debug = logging.debug;

// Modules
var Class = require('joose').Class;
var Severity = require('./severity').Model;
var async = require('async');
var inspect = require('util').inspect;
var _ = require('underscore')._;
//require( 'toolkit' );

var bus = require('./ipcbus').internal_bus;

var DEFAULT_INTERVAL = 20 * 1000;

var ClientManager = (exports.ClientManager = Class('ClientManager', {
  has: {
    socket: Joose.I.Object,
    sio: Joose.I.Object,
    severity_map: Joose.I.Array,
    lastSent: { is: 'rw' },
    filterID: { is: 'rw' },
    filterQuery: { is: 'rw' },
    serialDeltaId: { is: 'rw' },
    deltaTimerId: { is: 'rw', init: false },
    chartTimerId: { is: 'rw', init: false },
    interval: { is: 'rw', init: DEFAULT_INTERVAL },
    chartInterval: { is: 'rw', init: DEFAULT_INTERVAL },
    serials: Joose.I.Array,
    sevListener: { is: 'rw' },
    prefListener: { is: 'rw' },
    updateListener: { is: 'rw' },
  },

  after: {
    initialize: function (props) {
      /*
       * register socket.io event handlers
       */
      var self = this;
      var sid = props.socket.id;

      props.socket.on('close', function (message) {
        logger.warn(sid + ' : close [' + message + ']');
        self.socketDisconnect();
      });

      props.socket.on('disconnect', function (message) {
        logger.warn(sid + ' : disconnect [' + message + ']');
        self.socketDisconnect();
      });

      props.socket.on('setfilter', function (data) {
        debug(sid, 'setfilter', data);
        self.SocketSetFilter(data);
      });

      props.socket.on('acknowledge', function (data) {
        debug(sid, 'setfilter', data);
        self.SocketAcknowledge(data);
      });

      props.socket.on('severity', function (data) {
        debug(sid, 'severity', data);
        self.SocketSeverity(data);
      });

      props.socket.on('assign', function (data) {
        debug(sid, 'assign', data);
        self.SocketAssign(data);
      });

      props.socket.on('delete', function (data) {
        debug(sid, 'delete', data);
        self.SocketDelete(data);
      });

      props.socket.on('external_class', function (data) {
        self.SocketExternalClass(data);
      });

      props.socket.on('startchart', function (data) {
        self.SocketStartChart(data);
      });

      props.socket.on('ping', function (data) {
        debug(sid, 'monitor client pinged', data);
        props.socket.emit('pong');
      });

      props.socket.on('error', function (data) {
        logger.error(sid, 'error : ' + data);
      });

      // Query and remember the value for each severity
      async.series(
        [
          function (cb) {
            var finder = Severity.find({ system: true }, { value: 1 });
            finder.sort('value');
            finder.exec(cb);
          },
        ],
        function (err, results) {
          self.severity_map = results[0].map(function (s) {
            return s.value;
          });
        }
      );

      // shorthand for the current user
      var username = self.sessionUserIfExists(function () {
        logger.error(sid + ' : No user in session during ClientManager setup');
        return;
      });

      // Send the users severity values
      var push_severities = function () {
        Severity.getUsers(username, function (err, sevs) {
          self.socket.emit('severity', { data: sevs });
        });
      };

      // send severities on object construction
      push_severities();

      // listen for and send severity colour changes on user updates
      self.setSevListener = bus.on('Severity.' + username, function () {
        logger.debug(sid + ' : Sending new severity values...');
        push_severities();
      });

      /*
       * subscribe to any changes the user makes to their preferences
       */
      self.setPrefListener = bus.on('Preferences.' + username, function (prefs) {
        logger.info(sid + ' : Preferences have been updated: ' + username + ':' + inspect(prefs));
        if (prefs.delta_interval && prefs.delta_interval > 1) {
          self.setInterval(prefs.delta_interval * 1000);
          self.restartDeltas();
        }
      });

      self.setUpdateListener = bus.on('Updates.*', function (data) {
        self.updateDeltas();
      });
    },
  },

  methods: {
    socketDisconnect: function () {
      /*
       * upon disconnect of client, remove the timer sending deltas and the charting data
       */

      logger.info(this.socket_log() + 'removing socket delta and chart timer');

      var dtid = this.getDeltaTimerId();
      if (dtid) clearInterval(dtid);

      var tid = this.getChartTimerId();
      if (tid) clearInterval(tid);

      var deleteSerialsId = this.getDeltaTimerId();
      if (deleteSerialsId) clearInterval(deleteSerialsId);

      // Remove the event listeners otherwise these come
      // back from the dead. Not sure if theses are what is
      // stoping the object from being garbage collected or
      // something else and these hand around bevause of it.
      if (this.getSevListener()) this.getSevListener().removeListener();
      if (this.getPrefListener()) this.getPrefListener().removeListener();
      if (this.getUpdateListener()) this.getUpdateListener().removeListener();
    },

    /*
     * helper to ensure we only get actual serial numbers
     */
    filterSerials: function (in_serials, cb) {
      async.filter(
        in_serials,
        function (serial, acb) {
          acb(!isNaN(parseFloat(serial)) && isFinite(serial));
        },
        cb
      );
    },

    // Use to build an update message to send out
    // With a list of full records
    updateEmitFromSerials: function (serials, cb) {
      var self = this;

      var updates = [];
      var update_serials = [];

      var serial_query = { autoincr_id: { $in: serials } };
      Alerts.find(serial_query).exec(function (err, docs) {
        async.forEach(
          docs,
          function (row, loop_cb) {
            debug('update: ' + row.autoincr_id);
            updates.push(row.toClient());
            update_serials.push(row.autoincr_id);

            loop_cb();
          },
          function (err) {
            if (updates.length > 0) {
              self.debug('UPDATEs: ' + update_serials.join(', '));

              self.sio.emit('updates', {
                since: new Date(),
                updates: updates,
              });

              // emit updates so a 'filter_serials` update can be sent
              // after other people have triggered updates
              bus.emit('Updates.*', { data: true });
            } else {
              logger.warn('update emit nothing');
            }
          }
        );
      });
    },

    updateAlerts: function (serials, setwith, cb) {
      var self = this;
      /*
       * validate serials is an array of numbers
       */
      this.filterSerials(serials, function (checked_serials) {
        var query = { autoincr_id: { $in: checked_serials } };

        // ensure that state_change gets updated
        if (setwith['$set'].state_change == undefined) setwith['$set'].state_change = new Date();

        Alerts.update(query, setwith, { multi: true }, function (err, count) {
          if (err) {
            self.socket_error(
              ' : ClientManager updateAlerts Alerts.update failed to ' + 'update serials:' + serials + ' : ' + err
            );
            return logger.error(self.socket_log() + err);
          }

          logger.debug(self.socket_log() + 'updating [' + count + '] records ');

          if (logger.isTraceEnabled())
            debug(self.socket_log() + 'updated these serials: [' + checked_serials.join(', ') + ']');

          self.updateEmitFromSerials(checked_serials);
        });
      });
    },

    SocketAcknowledge: function (data, cb) {
      var self = this;

      if (logger.isTraceEnabled) debug(self.socket_log() + ' : Acknow', data);

      var session_user = self.sessionUserIfExists(function () {
        return null;
      });

      self.info('Acknowledge these serials: ' + data.serials.join(', '));

      this.updateAlerts(data.serials, {
        $set: { acknowledged: !!data.set, owner: session_user },
        $push: {
          history: {
            msg: data.set ? 'acknowldeged' : 'unacknowledged',
            timestamp: new Date().getTime(),
            datetime: new Date(),
            user: session_user,
          },
        },
      });
    },

    SocketSeverity: function (data) {
      var self = this;

      self.debug('set sev these serials: ' + data.serials.join(', '));

      var session_user = self.sessionUserIfExists(function () {
        return null;
      });

      this.updateAlerts(data.serials, {
        $set: { severity: data.severity },
        $push: {
          history: {
            msg: 'Severity changed to ' + data.severity,
            datetime: new Date(),
            timestamp: new Date().getTime(),
            user: session_user,
          },
        },
      });

      this.filterSerials(data.serials || [], function (checked_serials) {
        async.forEach(data.serials, function (serial, cb) {
          Alerts.findOne({ autoincr_id: serial }, function (ferr, row) {
            if (ferr) return cb(ferr);
            if (row) {
              // Row may be null if it's been deleted by automations
              logger.info(
                self.socket_log() +
                  'severity for ' +
                  serial +
                  ' : ' +
                  row.identifier +
                  ' : set to ' +
                  data.severity +
                  ' by ' +
                  session_user
              );
            } else {
              logger.warn(
                self.socket_log() + 'setting severity for ' + serial + ' failed because alert has been deleted'
              );
            }
          });
        });
      });
    },
    SocketAssign: function (data) {
      var self = this;

      var session_user = self.sessionUserIfExists(function () {
        return null;
      });

      self.debug('assigning these serials: ' + data.serials.join(', '));

      this.updateAlerts(data.serials, {
        $set: { owner: data.to },
        $push: {
          history: {
            msg: 'Assigned to ' + data.to,
            datetime: new Date(),
            timestamp: new Date().getTime(),
            user: session_user,
          },
        },
      });
    },
    SocketDelete: function (data) {
      var self = this;

      var session_user = self.sessionUserIfExists(function () {
        return null;
      });

      var time_now = new Date();

      self.debug('deleting these serials: ' + data.serials.join(', '));
      deleted_serials = [];

      this.filterSerials(data.serials || [], function (checked_serials) {
        async.forEach(
          data.serials,
          function (serial, cb) {
            Alerts.findOne({ autoincr_id: serial }, function (ferr, row) {
              if (ferr) return cb(ferr);
              var id = row ? row.identifier : 'null';
              Alerts.remove({ autoincr_id: serial }, function (err) {
                logger.info(self.socket_log() + ' removed: ' + serial + ' by: ' + session_user + ' :  ' + id);
                deleted_serials.push(serial);
                cb();
              });
            });
          },
          function (async_err) {
            if (async_err) logger.error('async error');

            logger.info('DB deletions done, emitting to clients');

            self.sio.emit('deletes', {
              since: time_now,
              data: deleted_serials,
            });
          }
        );
      });
    },

    SocketExternalClass: function (data) {
      logger.debug(self.socket_log() + 'set external_class these serials: ' + data.serials.join(', '));

      var update_set = {};

      this.filterSerials(data.serials, function (serials) {
        async.forEach(
          serials,
          function (serial, cb) {
            Alerts.findOne({ autoincr_id: serial }, function (ferr, row) {
              if (ferr) return cb(ferr);
              ExternalCommands.update_alert(data.set, row.toClient(), function (eer, ups) {
                if (eer) return cb(eer);
                for (var key in ups) {
                  update_set[key] = ups[key];
                }
                update_set['external_class'] = data.set;
                Alerts.update({ autoincr_id: serial }, { $set: update_set }, cb);
              });
            });
          },
          function (err) {
            if (err) {
              self.socket_error(err);
            }
          }
        );
      });

      //this.updateAlerts( data.serials, { $set: { external_class: data.set } } );
    },
    SocketSetFilter: function (data) {
      var self = this;

      debug(self.socket_log(), 'setFilter:', data);
      self.info('Setting filter id: ' + data.fid);

      if (data.fid == undefined) return self.socket_error('Undefined filter id');

      this.setFilterID(data.fid);

      // clear a timer for any previous deltas
      if (this.getDeltaTimerId()) clearInterval(this.getDeltaTimerId());

      var self = this;

      async.waterfall(
        [
          function (cb) {
            Filters.findById(self.getFilterID(), cb);
          },
          function (found_filter, cb) {
            if (!found_filter) {
              msg = 'filter not found [' + data.fid + ']';
              logger.error(msg);
              cb(new Error(msg));
            }

            var time_now = new Date();

            // build the Alerts finder query
            var query = Alerts.find(found_filter.f);
            // anything whos state has changed before now.
            // we need this time stamp to work out the subsequent deltas
            query.where('state_change').lte(time_now);
            // ignore anything thats been flagged as deleted
            query.where('deleted_at').exists(false);

            query.exec(function (err, docs) {
              cb(err, time_now, found_filter.f, docs);
            });
          },
        ],
        // waterfall completed
        function (err, time, f, docs) {
          if (err) {
            return self.socket_error(err);
          }

          self.setLastSent(time);
          self.setFilterQuery(f);

          var lerts = [];

          docs.forEach(function (doc) {
            lerts.push(doc.toClient());
          });

          // send the alerts to the client
          if (lerts.length > 0) self.socket.emit('inserts', { since: self.getLastSent(), data: lerts });
          else self.socket.emit('empty', { since: self.getLastSent() });

          self.startDeltas();
          self.info('sent initial inserts and started deltas');
        }
      );
    },

    SocketStartChart: function (data) {
      var self = this;
      // send the initial data
      self.SocketSendChartData(data, true, function (err) {
        throw err;
      });

      // send future updates
      var tid = setInterval(function () {
        //self.debug(  "Sending new chart data" );
        self.SocketSendChartData(data, false, function (err) {
          throw err;
        });
      }, self.getChartInterval());

      // keep track of the timer id
      this.setChartTimerId(tid);
    },
    SocketSendChartData: function (data, is_initial, cb) {
      var self = this;

      var session_user = self.sessionUserIfExists(function () {
        return;
      });

      var filter_query = Filters.find({ user: session_user }, { name: 1, f: 1 });
      filter_query.exec(function (err, filters) {
        async.map(
          filters,
          function (filter, cb) {
            Alerts.find(filter.f, { severity: 1 }, function (alert_err, results) {
              if (alert_err) {
                self.socket_error('alert find error: ' + alert_err);
                return cb(alert_err);
              }

              // construct empty chart data with all severity values set to 0
              var sevmap = {
                _id: filter._id,
                name: filter.name,
                total: 0,
              };
              self.severity_map.forEach(function (sev) {
                sevmap['sev' + sev] = 0;
              });

              // override the severity value with a count from those matched
              results.forEach(function (row) {
                sevmap['sev' + row.severity]++;
                sevmap.total++;
              });
              cb(alert_err, sevmap);
            });
          },
          function (err, sevmap) {
            debug(self.socket_log() + 'SEVMAP: ' + inspect(sevmap));

            async.filter(
              sevmap,
              function (item, ok_cb) {
                // remove from the array any items that have a zero total
                // but only if its not the intial set of data
                ok_cb(is_initial || item.total);
              },
              function (results) {
                debug(self.socket_log() + 'sending chart data');
                self.socket.emit('chartdata', { data: results });
              }
            );
          }
        );
      });
    },

    startDeltas: function () {
      var self = this;
      var dtid = setInterval(function () {
        //get an accurate time now for when new deltas will be queried from
        var time_now = new Date().getTime();

        self.trace('Client delta interval: ' + self.getInterval());

        var query = Alerts.find(self.getFilterQuery()); //.lean();

        query
          .where('state_change')
          .gte(self.getLastSent())
          //.where( 'state_change' ).lte( time_now )
          //.sort( 'autoincr_id' )
          .exec(function (err, rows) {
            if (err) return logger.error(self.socket_log() + err);

            var updates = [];
            var update_serials = [];
            var inserts = [];
            var insert_serials = [];

            self.debug('Last sent:    ' + self.getLastSent());
            self.debug('time_now:     ' + time_now);

            async.forEach(
              rows,
              function (row, cb) {
                debug(self.socket_log() + 'found updated row: ' + row.autoincr_id);

                if (row.state_change == row.first_occurrence) {
                  debug('insert: ' + row.autoincr_id);
                  inserts.push(row.toClient());
                  insert_serials.push(row.autoincr_id);
                } else {
                  debug('update: ' + row.autoincr_id);
                  updates.push(row.toClient());
                  update_serials.push(row.autoincr_id);
                }

                cb();
              },
              function (err) {
                if (updates.length > 0) self.debug('UPDATEs: ' + update_serials.join(', '));

                if (inserts.length > 0) self.debug('INSERTS: ' + insert_serials.join(', '));

                self.socket.emit('deltas', {
                  since: self.getLastSent(),
                  updates: updates,
                  inserts: inserts,
                  deletes: [],
                });

                var total_time = new Date().getTime() - time_now;
                self.debug('Took ' + total_time + ' milliseconds');
                self.setLastSent(time_now);
              }
            );
          });
      }, self.getInterval());

      // keep track of the timer id
      this.setDeltaTimerId(dtid);
    },

    // When an update occurs people might need to remove events
    // From their view. This will send a serial list after an
    // update goes out so that a console can remove events not
    // in it's filter any more.
    // This function is triggerred bt the 'Updates.*' event

    // Each Filter should really have a socket namespace to manage
    // stuff like this
    updateDeltas: function () {
      var self = this;

      // Get the filter
      var filter = self.getFilterQuery();

      // Don't to anything in the default view
      // It's unessecary as it contains everything (and also large).
      if (!filter || filter === '{}' || filter == '') {
        self.debug('updateDelta not doing all filter: [' + filter + ']');
        return undefined;
      }

      //self.debug( 'setting up updateDeltas setTimeout' );

      setTimeout(function () {
        // We only want the serials
        var fields = { autoincr_id: 1 };
        // Query the alerts collection directly to avoid mongoooseness
        var docs = Alerts.collection.find(filter, fields).toArray(function (err, results) {
          if (err) {
            logger.error('serial delta find failed: ' + err.message);
            return err;
          }
          // get the serials from the documents
          var serials = results.map(function (doc) {
            return doc.autoincr_id;
          });
          self.debug('alert serials to send for query [' + self.getFilterQuery() + '] count [ ' + serials.length);
          self.trace('alert serials to send for query [' + self.getFilterQuery() + '] serials [ ' + serials.join(','));

          // Send the serials to the console client so it can delete
          // anything it has locally that's not needed
          self.socket.emit('filter_serials', { serials: serials });
        });
      }, 2000);
    },

    restartDeltas: function () {
      var self = this;

      self.debug('Restarting delta_interval');
      self.info('Client delta interval: ' + self.getInterval());

      if (this.getDeltaTimerId()) clearInterval(this.getDeltaTimerId());

      this.startDeltas();
    },
    isUndefinedOrNull: function (obj) {
      return _.isUndefined(obj) || _.isNull(obj);
    },

    // Needed something to handle when components
    // of request.session disapear
    sessionUserIfExists: function (cb) {
      if (this.isUndefinedOrNull(this.socket.request)) {
        var msg = "socket.request doesn't exist: ";
        logger.error(msg + inspect(this.socket));
        self.socket.disconnect(msg);
        return cb(msg);
      }
      if (this.isUndefinedOrNull(this.socket.request.session)) {
        var msg = "socket.request.session doesn't exist: ";
        logger.error(this.socket_log() + msg + inspect(this.socket.request));
        self.socket.disconnect(msg);
        return cb(msg);
      }
      if (this.isUndefinedOrNull(this.socket.request.session.user)) {
        var msg = "socket.request.session.user doesn't exist: ";
        logger.error(this.socket_log() + msg + inspect(this.socket.request.session));
        self.socket.disconnect(msg);
        return cb(msg);
      }
      return this.socket.request.session.user;
    },

    // Logging helpers witha socket id built in
    socket_id_or_null: function () {
      return this.socket.id || 'null';
    },
    socket_error: function () {
      this.error(err);
      self.socket.emit('error', { error: err });
      return err;
    },
    socket_log: function () {
      return this.socket_id_or_null() + ' : ';
    },
    trace: function (msg) {
      return debug(this.socket_log() + msg);
    },
    debug: function (msg) {
      return logger.debug(this.socket_log() + msg);
    },
    info: function (msg) {
      return logger.info(this.socket_log() + msg);
    },
    error: function (msg) {
      return logger.error(this.socket_log() + msg);
    },
  },
}));
