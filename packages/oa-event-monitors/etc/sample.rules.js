/*
 * Copyright (C) 2012, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.  
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:rules:sample')
var logger = logging.logger
var debug = logging.debug

exports.rules = function( a, obj )
{
  debug( "var obj", obj )
  a.identifier = obj.col1 + ":" + obj.col2 + ":" + obj.col3;
  a.summary = obj.col3;
  a.node = 'test';
  a.severity = 1;
};
