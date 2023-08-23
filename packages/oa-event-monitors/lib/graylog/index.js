/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:monitors:graylog');
var logger = logging.logger;
var debug = logging.debug;

var inspect = require('util').inspect;
var util = require('util');
var _ = require('lodash');

var Class = require('joose').Class;
var AgentRole = require('../utils/agent_role').Role;
var GELFManager = require('gelf-manager');

var rules = require('oa-event-rules');

logger.info('AGENT LOADED GRAYLOG');

var DEFAULT_GRAYLOG_PORT = 12202;

exports.Agent = Class('AgentGraylog', {
  my: {
    has: {
      properties: { is: 'ro', init: ['port'] },
    },
  },

  does: [AgentRole], // picks up props and eventCB

  has: {
    port: { is: 'rw', init: DEFAULT_GRAYLOG_PORT },
  },

  after: {
    initialize: function (args) {
      var self = this;
      this.setPort(self.getProps().port || DEFAULT_GRAYLOG_PORT);
    },
  },

  methods: {
    start: function (cb) {
      var self = this;
      var dgram = require('dgram');
      var server = dgram.createSocket('udp4');
      var gelfManager = new GELFManager({ debug: true });

      logger.info('Starting udp graylog listener');

      server.on('message', function (msg, rinfo) {
        logger.debug('gelf raw msg', msg, '');

        gelfManager.feed(msg);
      });

      gelfManager.on('message', function (msg) {
        // combined_message will be used for the summary
        msg.combined_message = msg.short_message;

        // Max MongoDB index key size is 1024 bytes. Trim the short_message
        // field to make sure that the insert isn't broken for extraodrinarily
        // long messages
        msg.short_message_trimmed = _.trunc(msg.short_message, 512);
        if (msg.full_message) {
          msg.combined_message += msg.full_message;
        }

        self.getEventCB()(msg);
      });

      gelfManager.on('error', function (err) {
        logger.error(err);
      });

      server.on('listening', function () {
        var address = server.address();
        logger.info('Server now listening at ' + address.address + ':' + address.port);
      });

      server.on('error', function (err) {
        logger.error('Server error:', err.stack);
        console.error('Server error', err);
        throw err;
      });

      var port = parseInt(this.getPort());
      logger.info('Binding to port = ' + port.toString());
      server.bind(port, cb); // Remember ports < 1024 need root
    },
  },
});
