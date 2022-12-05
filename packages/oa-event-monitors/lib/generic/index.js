/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:utils:generic');
var logger = logging.logger;
var debug = logging.debug;

var Class = require('joose').Class;
var AgentRole = require('../utils/agent_role').Role;

var GenericAgent = (exports.Agent = Class({
  does: [AgentRole], // provides getEventCB()

  methods: {
    start: function (cb) {
      var self = this;

      var data = '';
      process.stdin.on('data', function (chunk) {
        debug('received chunk', chunk);
        data += chunk;
      });

      process.stdin.on('end', function () {
        logger.debug('Full DATA', data, '');
        var lines = data.split('\n');
        var obj = {};
        lines.forEach(function (line) {
          pairs = line.split('=');
          obj[pairs[0]] = pairs[1];
        });
        self.getEventCB()(obj);
      });

      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      cb(null);
    },
  },
}));
