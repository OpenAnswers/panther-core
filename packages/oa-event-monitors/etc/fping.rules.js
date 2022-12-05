/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:rules:fping');
var logger = logging.logger;
var debug = logging.debug;

exports.rules = function (a, obj) {
  debug('var a', a);
  debug('var obj', obj);

  a.identifier = obj.hostname + ':' + obj.state + ':';
  a.node = obj.hostname;
  a.node_alias = obj.host_ip;
  a.summary = obj.hostname + ' is ' + obj.state;

  switch (obj.state) {
    case 'alive':
      a.severity = 0;
      break;

    case 'unreachable':
      a.severity = 5;
      break;

    default:
      a.severity = 4;
      break;
  }
};
