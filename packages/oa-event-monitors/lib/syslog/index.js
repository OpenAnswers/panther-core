/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:monitors:syslog');
var logger = logging.logger;
var debug = logging.debug;

inspect = require('util').inspect;
util = require('util');

var Class = require('joose').Class;
var LogParser = require('./logfile').Parser;
var AgentRole = require('../utils/agent_role').Role;

var SyslogAgent = (exports.Agent = Class({
  does: [AgentRole],

  methods: {
    start: function (cb) {
      var self = this;

      logger.info('Starting syslog AGENT');

      var parser = new LogParser({ logfilePath: self.getProps().logfile, tokenCB: self.getEventCB() });
      parser.start();
      cb(null);
    },
  },
}));
