//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:settings');

const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

const Promise: any = require('bluebird');
const needle = require('needle');
const lodashKeys = require('lodash/keys');
const lodashHas = require('lodash/has');
const lodashGet = require('lodash/get');
const config = require('../../lib/config').get_instance();

const { event_server } = config;
const settings_url = 'http://' + event_server.host + ':' + event_server.port + '/api/v1/settings';

// Client joining the activities stream

SocketIO.route_return('settings::server::read', function (socket, data, socket_cb) {
  const tracking_url = settings_url + '/tracking';
  debug('got settings::server::read url', tracking_url);

  return needle('get', tracking_url, {}, { json: true })
    .then(function (response) {
      if (response.statusCode !== 200) {
        throw new Errors.HttpError404();
      }

      const { body } = response;
      return body;
    })
    .catch(function (error) {
      logger.error(error);
      throw error;
    });
});

SocketIO.route_return('settings::server::write', function (socket, data, socket_cb) {
  debug('got settings::server::write', data);

  if (!lodashHas(data, 'tracking')) {
    return Promise.resolve({});
  }

  const value = lodashGet(data, 'tracking', 0);

  return needle('post', settings_url + '/tracking', { value })
    .then(function (response) {
      if (response.statusCode !== 200) {
        throw new Errors.HttpError404();
      }
      debug('writing setting', response.body);
      return response.body;
    })
    .catch(function (error) {
      SocketIO.io.emit('tracking::unavailable');
      return { tracking: null };
    });
});
