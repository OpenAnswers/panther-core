/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

var logging = require('oa-logging')('oa:event:monitors:syslog:parser');
var logger = logging.logger;
var debug = logging.debug;

var inspect = require('util').inspect;

exports.parse = function parse(msg) {
  var self = this;
  self.msg = msg;

  var sysmsg = undefined;

  if ((sysmsg = msg.match(/^([A-Z][a-z]+)\s+(\d+) ((\d+):(\d+):(\d+)) (\S+) (\S+): (.*)/))) {
    self.month = sysmsg[1];
    self.dom = sysmsg[2];
    self.time = sysmsg[3];
    self.hours = sysmsg[4];
    self.minutes = sysmsg[5];
    self.seconds = sysmsg[6];
    self.hostname = sysmsg[7];
    self.daemon = sysmsg[8];
    self.message = sysmsg[9];

    var d;
    self.pid = undefined;
    if ((d = self.daemon.match(/(.*)\[(\d+)\]/))) {
      self.daemon = d[1];
      self.pid = d[2];
    }
  } else {
    if (msg.match(/^([A-Z][a-z]+)\s+(\d+) ((\d+):(\d+):(\d+)) (\S+) (\S+)/)) {
      logger.warn('match 1 ');
    } else if (msg.match(/^([A-Z][a-z]+)\s+(\d+) ((\d+):(\d+):(\d+)) (\S+)/)) {
      logger.warn('match 2 ');
    } else if (msg.match(/^([A-Z][a-z]+)\s+(\d+) ((\d+):(\d+):(\d+))/)) {
      logger.warn('match 3 ');
    } else if (msg.match(/^([A-Z][a-z]+)\s+(\d+)/)) {
      logger.warn('match 4 ');
    } else if (msg.match(/^([A-Z][a-z]+)/)) {
      logger.warn('match 5 ');
    }

    throw new Error('Failed to parse: ' + self.msg);
  }
};
