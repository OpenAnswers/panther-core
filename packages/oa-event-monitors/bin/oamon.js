/*
 * Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */
const OaMon = require('../common');
var oamon = new OaMon();
// Logging
var logging = require('oa-logging')('oa:event:monitors:bin:oamon');
var logger = logging.logger;
var debug = logging.debug;
// Hearbest debug
oamon.on('heartbeating', function () {
  logger.debug('got heartbeating');
});
oamon.start(function () {
  logger.info('oamon started');
});
module.exports = oamon;
