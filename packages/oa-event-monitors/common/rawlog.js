/*
 * Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
 * All rights reserved.
 * This file is subject to the terms and conditions defined in the Software License Agreement.
 */

// Logging
var logging = require('oa-logging')('oa:event:monitors:common:rawlog');
var logger = logging.logger;
var debug = logging.debug;

var fs = require('fs');

var RawLog = function (options, callback) {
  if (arguments.length != 2) {
    throw new Error('Incorrect arguments to RawLog');
    return;
  }
  this.options = options;

  // parse options

  // is log rotation in operation ?
  if (options.maxsize) {
    // no
  }

  if (options.filename == undefined) {
    logger.error('No Filename specified for RawLog');
    callback(null);
    return;
  }

  this.open(options.filename, callback);
};

RawLog.prototype.open = function (filename, callback) {
  this.logstream = fs
    .createWriteStream(filename, { flags: 'a', encoding: null, mode: 0644 })
    .addListener('open', function (fd) {
      logger.info('opened file: ' + filename);
      callback(null);
    })
    .addListener('error', function (err) {
      logger.error('Failed to open: ' + filename + ', err: ' + err);
      callback(err);
    });
};

RawLog.prototype.log = function (data, callback) {
  if (this.logstream.writable) {
    debug('RawLog writen', data);
    this.logstream.write(data + '\n');
  } else {
    debug('RawLog', this.logstream);
    logger.error('RawLog.write failed writing to [%s]', this.logstream.path);
  }
};

module.exports = RawLog;
