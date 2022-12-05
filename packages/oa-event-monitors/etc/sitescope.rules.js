/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:rules:sitescope');
var logger = logging.logger;
var debug = logging.debug;

exports.rules = function (a, obj) {
  debug('var obj', obj);
  a.identifier = obj.group_path + ':' + ':' + obj.monitor_id + '_' + obj.status;
  a.agent_group = obj.group_path;
  a.summary = obj.name;
  a.node = 'test';

  switch (obj.status) {
    case 'good':
      a.severity = 1;
      break;

    case 'disabled':
      a.severity = 0;
      break;

    case 'error':
      a.severity = 4;
      break;

    default:
      a.severity = 3;
      break;
  }

  switch (obj.group) {
    case 'BDBLAW':
      a.customer = 'BDB';
      break;
    case 'Camelot':
      a.customer = 'Camelot';
      break;
    case 'NEF':
      a.customer = 'NEF';
      break;
    case 'Ofsted':
      a.customer = 'Ofsted';
      break;

    default:
      a.customer = obj.group;
      break;
  }
};
