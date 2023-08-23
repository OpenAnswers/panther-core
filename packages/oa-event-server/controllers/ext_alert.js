/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:server:controllers:ext_alert');
var logger = logging.logger;
var debug = logging.debug;

Filters = require(__dirname + '/../models/filter');

var util = require('util');
var inspect = util.inspect;
var ObjectId = require('mongoose').Types.ObjectId;

function get(id, fn) {
  if (users[id]) {
    fn(null, users[id]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function oNotAuthorised(msg) {
  logger.debug('f() NotAuthorised');
  this.name = 'NotAuthorised';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

function handleQuerySort(query) {
  console.log('Query Q  = ' + inspect(query));
  for (var prop in query) {
    logger.debug('PROP: ' + query[prop]);
    var result = undefined;
    if ((result = prop.match(/sort\(([\ \-\+]?)(\w+)\)/))) {
      logger.debug('Query has sort in it');
      logger.debug('result = ' + inspect(result));
      var ord = result[1] == ' ' ? 1 : -1;
      var column = result[2];
      /*
       * special case for first_occurrence:
       * the value for this is taken as being the first array value
       * in the upsert_timestamps sub-document on the alert, so
       * we must override the column name specified by the GET
       */
      if (result[2] == 'first_occurrence') {
        column = 'upsert_timestamps.0';
      }
      return new Array(column, ord);
    }
  }
}

module.exports = {
  secure: true,

  /*
   * note, req.is only seems to be in the trunk git version of express
   * simply installing with "npm install express" will not, at present
   * get you a fully working express install
   *
   * solution:
   * $ git clone https://github.com/visionmedia/express.git
   * $ npm install ./express/
   */

  create: function (req, res, next) {
    logger.debug('EXT alerts create body: ' + inspect(req.body));
    res.send({ success: false });
  },

  index: function (req, res, next) {
    /*
     * get users default filter
     */

    var filterfinder = {};
    if (req.query.filter) {
      debug('index query is', req.query);
      var f = JSON.parse(req.query.filter);
      debug('inde fileter is', f[0]);

      if (f[0] && f[0].property && f[0].property == '_id') {
        filterfinder._id = new ObjectId(f[0].value);
        filterfinder.user = req.session.user;
      } else {
        logger.error('GET filter: ' + inspect(req.query.filter));
        return res.send({ success: false });
      }
    } else filterfinder = { name: 'fallback', user: null, system: true };

    debug('index filterfinder is', filterfinder);
    var uf = {};
    Filters.findOne(filterfinder, function (err, filter) {
      if (err) {
        logger.error(err);
        return res.send({ success: false });
      }

      if (!filter) {
        logger.error('No Filter found using: ' + inspect(filterfinder));
        return res.send({ success: false });
      }
      if (typeof filter.f != 'object') {
        throw new Error('Filter is not an object');
        return;
      }

      debug('FILTER is', filter.f);
      var the_filter = filter.f;

      var alerts_to_send = [];
      var alert_ids_sent = [];

      /*
       * find the alerts for this users filter
       */
      logger.debug('finding Alerts with query: ' + typeof the_filter + ' / ' + inspect(the_filter, true, 4));

      var time_before_alerts_retrieved = new Date();

      var finder = Alerts.find(the_filter, { notes: 0, history: 0 });

      if (req.query.sort && typeof req.query.sort == 'string') {
        try {
          var query_sort = JSON.parse(req.query.sort);
          var property = query_sort[0].property || 'identifier';
          var direction = query_sort[0].direction || 'ASC';
          if (direction == 'ASC') finder.sort({ property: 1 });
          else finder.sort({ property: -1 });
        } catch (er) {
          logger.warn('Failed to parse query sorter: ' + inspect(req.query.sort));
        }
      }

      logger.debug('FINDER: ' + inspect(finder, false, 3, true));

      finder.execFind(function (err, docs) {
        if (err) {
          logger.error('execFind : ' + err);
          return res.send({ success: false });
        }

        logger.debug('found ' + docs.length + ' alerts');

        docs.forEach(function (lert) {
          /*
           * we now need to munge the alerts retrieved from the database
           * ever so slightly, to ensure that the timestamps are picked out correctly
           */
          var l = lert.toClient();

          alerts_to_send.push(l);
        });

        /*
         * send the list of alerts to the client
         */

        res.send({ success: true, rowCount: alerts_to_send.length, data: alerts_to_send });

        /*
         * inform the oafserver that a new set of alerts has been sent
         * to the client/browser and it should not starting sending
         * deltas from the point in time demarcated by time_before_alerts_retrieved
         */

        debug('SESSION', req.session);
        debug('SESSION_ID', req.sessionID);

        /*
         * populate a delatas object with the initial set of
         * alert.id values.
         * this is so the server knows which ids the client
         * currently has
         */
        /* WiP 
        var deltas = new DeltaManager( { 
          ids: alert_ids_sent, 
          session_id: req.sessionID,
          filter: filter,
          time_sent: time_before_alerts_retrieved.getTime()
        } );

        oafserver.events.emit( 'new_delta', deltas );

        oafserver.events.emit( 'sentalerts', { 
          session_id: req.sessionID,
          filter: filter, 
          time_from: time_before_alerts_retrieved.getTime() } );
    end WiP */
      });
    });
  },

  update: function (req, res, next) {
    var conditions = { _id: req.params.id, _id: new ObjectId(req.body._id) };
    Alerts.findOne(conditions, function (err, data) {
      if (err) {
        logger.error(err);
        return res.send({ success: false });
      }
      if (!data || data.length == 0) {
        logger.error('No data found for id=' + req.params.id + ', _id=' + req.body._id);
        return res.send({ success: false });
      }

      var update_set = {};
      var update_push = {};
      var update_with = {};

      var h = { timestamp: new Date() };

      var messages = [];
      if (req.session.user) h.user = req.session.user;
      else h.user = 'nobody';

      // has the owner been set?
      if (req.body.owner && req.body.owner != '') {
        // current owner?
        if (data.owner && data.owner != '')
          messages.push('owner changed from [' + data.owner + '] to [' + req.body.owner + ']');
        else messages.push('owner set to [' + req.body.owner + ']');

        update_set.owner = req.body.owner;
      }
      // has the acknowledged status been changed?
      if (req.body.acknowledged != data.acknowledged) {
        if (req.body.acknowledged === 0) messages.push('Un-Acknowledged');
        else messages.push('Acknowledged');

        update_set.acknowledged = req.body.acknowledged;
      }
      // has the severity been changed?
      if (req.body.severity != data.severity) {
        messages.push('Severity changed from [' + data.severity + '] to [' + req.body.severity + ']');
        update_set.severity = req.body.severity;
      }

      async.series(
        {
          do_external_class: function (acb) {
            if (req.body.external_class && req.body.external_class != '') {
              if (data.external_class != req.body.external_class) {
                update_set.external_class = req.body.external_class;
                messages.push('External Class set to [' + req.body.external_class + ']');
                ExternalCommands.update_alert(req.body.external_class, data.toClient(), function (er, ups) {
                  if (err) acb(err);

                  for (var key in ups) {
                    update_set[key] = ups[key];
                  }
                  acb(null);
                });
              } else acb(null);
            } else acb(null);
          },
          update_alert: function (acb) {
            // have any changes been made?
            if (messages.length > 0) {
              update_with['$set'] = update_set;

              // convert each message in a history item
              var message_updates = [];
              messages.forEach(function (message) {
                h.msg = message;
                message_updates.push(h);
              });
              // push all of the history items
              update_with['$pushAll'] = { history: message_updates };

              debug('Alerts.update', conditions, update_with);

              Alerts.update(conditions, update_with, acb);
            }
          },
        },
        function (err, results) {
          if (err) {
            logger.error(err);
            res.send({ success: false });
          } else {
            debug('Alerts.updated', results);
            res.send({ success: true });
          }
        }
      );
    });
  },

  // /alerts/:id
  show: function (req, res, next) {
    Alerts.findOne({ _id: req.params.id }, function (err, a) {
      res.send(a);
    });
  },

  // /alerts/:id/edit
  edit: function (req, res, next) {
    get(req.params.id, function (err, user) {
      if (err) return next(err);
      res.render(user);
    });
  },

  destroy: function (req, res, next) {
    var conditions = { _id: req.params.id, _id: new ObjectId(req.body._id) };

    Alerts.findOne(conditions, function (err, data) {
      if (err) {
        logger.error(err);
        return res.send({ success: false });
      }
      if (!data || data.length == 0) return res.send({ success: false });

      debug('destroy found data', data);

      logger.info('Removing row');
      //oafserver.events.emit( "deleted", { id: req.params.id, identifier: data.identifier } );
      data.remove(function (derr) {
        if (derr) logger.error(derr);

        res.send({ success: !derr });
      });
    });
  },
};
