/*
 * Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:commong:rawlog');
var logger = logging.logger;
var debug = logging.debug;

var State = function State() {
  this.util = require('util');
};

State.prototype.init = function (params) {
  if (typeof params !== 'object') {
    logger.error('init params: ' + typeof params);
    return false;
  } else {
    this.agent_type = params.agent_type || 'unknown_agent';
    this.node = params.node || 'unknown_host';
    this.base_id = 'State:' + this.agent_type + ':' + this.node + ':';
  }
};

State.prototype.build_alert = function () {
  var a = new Object();
  a.identifier = this.base_id;
  a.alert_group = 'PantherState';
  a.agent = this.agent_type;
  a.node = this.node;
  a.severity = 1;
  a.last_occurrence = new Date();

  debug('built base alert', a);
  return a;
};

State.prototype.established = function () {
  logger.debug('State established');
  var a = this.build_alert();
  a.identifier += 'Established';
  a.type = 'up';
  a.summary = 'Agent ' + a.agent + ' established connection';

  return a;
};

State.prototype.start = function () {
  logger.debug('State starting');
  var a = this.build_alert();
  a.identifier += 'Start';
  a.type = 'up';
  a.summary = 'Agent ' + a.agent + ' has been started';

  return a;
};

State.prototype.amalive = function () {
  var a = this.build_alert();
  a.identifier += 'Alive';
  a.type = 'up';
  a.summary = 'Agent ' + a.agent + ' is alive';
  a.severity = 1;

  return a;
};

State.prototype.stop = function (msg) {
  var a = this.build_alert();
  a.identifier += 'Stopping';
  a.type = 'down';
  a.summary = msg || 'Agent ' + a.agent + ' is stopping';
  a.severity = 3;

  return a;
};

State.prototype.rules_reloaded = function (msg, cb) {
  var a = this.build_alert();
  a.identifier += 'rules_loaded';
  a.summary = msg || 'Agent ' + a.agent + ' received a SIGHUP';
  a.severity = 1;

  return a;
};

// core becomes global
probe_state = module.exports = new State();
