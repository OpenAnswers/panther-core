/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:monitors:monitor_client');
var logger = logging.logger;
var debug = logging.debug;

var fs = require('fs');
var inspect = require('util').inspect;
var path = require('path');

var io = require('socket.io-client');
var Class = require('joose').Class;
var _ = require('lodash');
var events2 = require('eventemitter2');

var Errors = require('oa-errors');

var DEFAULT_ENDPOINT = 'http://localhost:4003';
var DEFAULT_RETRY_COUNT = 0;
var DEFAULT_RETRY_TIMEOUT = 5 * 1000;
var BUFFER_MSECS = 0;

var MonitorClient = (exports.MonitorClient = Class('MonitorClient', {
  has: {
    endpoint: { is: 'rw', init: DEFAULT_ENDPOINT },
    retryCount: { is: 'rw', init: DEFAULT_RETRY_COUNT },
    retryTimeout: { is: 'rw', init: DEFAULT_RETRY_TIMEOUT },
    reliable: { is: 'rw', init: false },
    reliableStorageFn: { is: 'rw' },
    profile: { is: 'rw', init: undefined },
    socket: { is: 'rw', init: undefined },
    buffering: { is: 'rw', init: BUFFER_MSECS }, // 0 = disabled, greater than 0 = interval in millseconds
    bufferInterval: { is: 'rw', init: false },
    queue: Joose.I.Array, // appended to list with new events identifiers
    q_data: Joose.I.Object, // key is an identifier
  },

  methods: {
    start: function (cb) {
      var self = this;

      logger.debug('Starting....');

      if (this.getReliable()) {
        //??
      }

      var sock = io.connect(this.getEndpoint(), {
        transports: ['websocket'],
        //        'connect timeout'           : this.getRetryTimeout(),
        'try multiple transports': false,
        reconnect: true,
        'reconnection delay': 1000,
        'reconnection limit': 3 * 1000,
        'max reconnection attempts': this.getRetryCount(),
      });

      sock.on('connecting', function (transport) {
        logger.debug('Attempting connection...');
      });

      sock.on('reconnect_failed', function () {
        logger.error('All reconnections failed....');
      });

      sock.on('connect', function () {
        logger.info('Socket connected', arguments);

        if (self.getSocket() == undefined) {
          self.setSocket(sock);

          sock.on('greetings', function (data, reply_cb) {
            logger.debug('greetings received');
            // inform server that we have recieved greetings
            reply_cb(null);
            debug('greetings data', data);
            debug('current Profile = ', self.getProfile());

            if (self.getProfile() == undefined) {
              self.setProfile(data.profile);
              debug('client starting has completed');
              cb(null);
            } else {
              logger.warn('multiple greetings received - ignoring');
            }
          });
        } else {
          logger.error('I already have a socket!');
        }
      });

      sock.on('reconnect', function (transport_type, connection_count) {
        logger.warn('socket reconnect ' + inspect(arguments));
      });

      sock.on('reconnecting', function (transport_type, connection_count) {
        logger.warn('socket reconnecting ' + inspect(arguments));
        if (connection_count >= self.getRetryCount()) {
          logger.error('Connection failed to reconnect.');
          logger.info('Buffer size [' + sock.sendBuffer.length() + ']');
          logger.debug('BUFFER: ' + inspect(sock.sendBuffer, true, 5));
        }
      });

      sock.on('disconnect', function () {
        logger.warn('socket disconnected ' + inspect(arguments));
      });

      sock.on('error', function (e) {
        logger.error(e ? e : 'unknown error');
        // Try and reconnect (for a failed connection at startup)
        sock.socket.reconnect();
      });

      sock.on('close', function () {
        logger.info('socket closed ' + inspect(arguments));
      });

      /*
       * create an interval timer to flush the buffered events
       */
      if (this.isBuffering()) {
        var interval_id = setInterval(function () {
          self.flushBufferQueue();
        }, self.getBuffering());
        this.setBufferInterval(interval_id);
      }
    },

    isBuffering: function () {
      return this.getBuffering() > 0;
    },

    addEventToQueue: function (ev, cb) {
      var ident = ev._pre_identifier || ev.identifier;
      var latest_occurrence = ev.last_occurrence || new Date();
      if (ev.tally == undefined) ev.tally = 1;

      if (this.q_data[ident] == undefined) {
        logger.debug('Adding new event to queue: ' + ident);
        // event not already in the outbound queue
        this.queue.push(ident);

        // keep track of this occurrence in case event happens again before being sent
        ev._occurrences = [latest_occurrence];
        this.q_data[ident] = ev;
      } else {
        // event is already in the outbound queue.
        logger.info('Update existing event in queue' + ident.substr(0, 48) + '...');
        logger.debug('Updating event on queue' + ident);

        ev.tally += this.q_data[ident].tally;
        ev._occurrences = this.q_data[ident]._occurrences;
        ev._occurrences.push(latest_occurrence);

        delete this.q_data[ident];

        // add to the object for sending later
        this.q_data[ident] = ev;
      }

      // only log if somehting is interesting
      if (this.queue.length > 2) logger.info('queue length: [' + this.queue.length + ']');
      else logger.debug('queue length: [' + this.queue.length + ']');

      debug('queue contents: ', function () {
        this.queue.join(',');
      });
      debug('queue contents: ', this.q_data);
    },

    flushBufferQueue: function () {
      debug('Flushing to server, queue.length: ', this.queue.length);

      // check there was something on the queue first
      if (this.queue.length <= 0) return;
      logger.debug('Flushing to server, queue.length: ' + this.queue.length);

      // collect up whats on the queue into an array of events
      var self = this;
      var events = [];
      this.queue.forEach(function (ident) {
        var ev = self.q_data[ident];
        self.cleanupAlertFields(ev);
        events.push(ev);
      });
      // if any events were collected send them to the server
      if (events.length > 0) {
        logger.debug('buffer.length = ' + this.getSocket().sendBuffer.length);
        logger.info('Sending ' + events.length + ' queued events to the server');
        this.getSocket().emit('insert_events', events);
        events.forEach(function (ev) {
          var ev_identifier = ev._pre_identifier || ev.identifier;
          logger.info('Sent q event to the server: [' + ev_identifier + ']');
        });
      }

      this.emptyBufferQueue();
    },

    emptyBufferQueue: function () {
      this.queue = [];
      this.q_data = {};
    },

    sendAlert: function (ev, cb, qcb) {
      if (!this.validateAlertFields(ev)) {
        var err = new Errors.ValidationError('Validate event failed');
        err.ev = ev;
        if (cb) cb(err, ev);
        if (qcb) qcb(err, ev);
        return;
      }

      if (!this.cleanupAlertFields(ev)) {
        var err = new new Errors.ValidationError('Cleanup event failed')();
        err.ev = ev;
        if (cb) cb(err, ev);
        if (qcb) qcb(err, ev);
        return;
      }
      /*
       * under a reliable transport mode we keep a copy of the alert
       * on local storage until we have received an ack, this is
       * slower but thats the price!
       */
      if (this.getReliable()) this.saveAlert(ev);
      logger.debug('queue buffer.length = ' + this.getSocket().sendBuffer.length);

      if (this.isBuffering()) {
        logger.debug('adding event to queue');
        this.addEventToQueue(ev, cb);
      } else {
        var ev_identifier = ev._pre_identifier || ev.identifier;
        logger.info('Sent event to the server: [' + ev_identifier + ']');
        this.getSocket().emit('insert_event', ev, cb);
      }
      if (qcb) qcb(null, { message: 'Event sent to server', status: 'queued' });
      /*
      this.getSocket().emit( 'insert_event', ev, function( back ) {
        logger.debug( 'event received by server ' + ev.identifier );
      });
      */
    },

    sendOneAlert: function (ev, cb, qcb) {
      if (!this.validateAlertFields(ev)) {
        var err = new Errors.ValidationError('Validate event failed');
        if (cb) cb(err, ev);
        if (qcb) qcb(err, ev);
        return;
      }

      if (!this.cleanupAlertFields(ev)) {
        var err = new Errors.ValidationError('Cleanup event failed');
        if (cb) cb(err, ev);
        if (qcb) qcb(err, ev);
        return;
      }

      this.getSocket().emit('insert_event', ev, function (err, ack) {
        if (err) {
          logger.error('Shutting down on ack error:' + err);
          if (cb) cb(err);
        } else {
          logger.info('Shutting down on ack:' + ack);
          if (cb) cb();
        }
        process.exit(err ? 1 : 0);
      });
      if (qcb) qcb(null, { message: 'One event sent to server', status: 'queued' });
    },

    validateAlertFields: function (ev) {
      // Ensure that all columns that have been marked by the server
      // as being mandatory exist in this alert
      var mandatory_columns = this.getProfile().columns.mandatory;
      var missing_columns = _.difference(mandatory_columns, _.keys(ev));

      if (_.isEmpty(missing_columns)) return true;

      logger.error('Event is missing mandatory column(s): [' + missing_columns.join(',') + '] [' + _.keys(ev) + ']');
      return false;
    },

    cleanupAlertFields: function (ev) {
      /*
       * Ensure that timestamps are expressed ISO8601 Dates
       */
      var ret = true;
      _.each(['first_occurrence', 'last_occurrence', 'state_change'], function (name) {
        if (!_.isUndefined(ev[name]) && !_.isDate(ev[name])) {
          logger.warn('Field not a date [' + name + '] [' + ev[name] + '] converting to date...');
          ev[name] = new Date(ev[name]);
          if (!_.isDate(ev[name])) {
            logger.error('Field still not a Date [' + name + '] [' + ev[name] + ']');
            ret = false;
          }
        }
      });
      return ret;
    },
  }, // methods
}));
