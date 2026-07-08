//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:certificate');

// Config early
const config = require('../../lib/config').get_instance();
const Promise = require('bluebird');

// node modules
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));

// npm modules
const moment = require('moment');
const mongoose = require('mongoose');
const _ = require('lodash');

// Errors from Mongoose
const { ValidationError } = mongoose.Error;
const { ValidatorError } = mongoose.Error;

// oa modules
const { random_string } = require('oa-helpers');
const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

// Model
const { Certificate } = require('../model/certificate');

// Read client event source configuration archive
SocketIO.route('certificate::client::archive', function (socket, data, socket_cb) {
  logger.info('reading client configuration archive', data);

  if (data == null) {
    throw new Errors.ValidationError('No data in message');
  }
  if (data.path == null) {
    throw new Errors.ValidationError('No "path" in message data');
  }
  if (data.file == null) {
    throw new Errors.ValidationError('No "file" in message data');
  }

  const client_archive_path =
    config.app.private_path === '/'
      ? path.join(config.app.private_path, data.path)
      : path.join(config.path.base, config.app.private_path, data.path);

  return fs
    .readFileAsync(path.join(client_archive_path, data.file), { encoding: 'binary' })
    .then(function (client) {
      debug('sending certificate::client::archive response', client);
      if (_.isFunction(socket_cb)) {
        return socket_cb(null, { client });
      }
    })
    .catch(function (error) {
      logger.error('certificate::client::archive failed', data, error, '');
      if (_.isFunction(socket_cb)) {
        return socket_cb(`${error}`);
      }
    });
});
