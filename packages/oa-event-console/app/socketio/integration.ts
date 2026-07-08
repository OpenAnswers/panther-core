//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:rule');

// npm modules
const moment = require('moment');

// oa modules
const Errors = require('../../lib/errors');
const { SocketIO } = require('../../lib/socketio');
const { Integration } = require('../model/integration');
const config = require('../../lib/config').get_instance();

// Read all
SocketIO.route('integrations::read', (socket, data, socket_cb) => debug('got integrations::read', data));

// Create
SocketIO.route('integration::create', (socket, data, socket_cb) => debug('integration::create', data.group, data.rule));

// Read
SocketIO.route('integration::read', (socket, data, socket_cb) => debug('got integration::read', data));

// Update
SocketIO.route('integration::update', function (socket, data, socket_cb) {
  logger.info('Updating integration %j', data, socket.id, socket.ev.user());
  return Integration.update(data)
    .then(function (response) {
      debug('update response', response);
      socket_cb(response);
      return SocketIO.io.emit('integrations::updated');
    })
    .catch(Errors.ValidationError, function (err) {
      logger.error('admin user update failed', data, err.message, err);
      return socket.ev.error(err.message);
    })
    .finally(() => debug('wtf?'));
});

// Delete
SocketIO.route('integration::delete', function (socket, data, socket_cb) {
  logger.info('Deleting integration', socket.id, data);
  return Integration.deleteOne({ _id: data._id })
    .then(function (response) {
      socket.ev.info(`Deleted integration ${data._id}`);
      socket_cb(response);
      return SocketIO.io.emit('integrations::updated');
    })
    .catch(Errors.ValidationError, function (err) {
      logger.error('admin user delete failed', data, err.message, err);
      return socket.ev.exception(err.name, err.message);
    });
});
