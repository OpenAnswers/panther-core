//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:import-export');

const { SocketIO } = require('../../lib/socketio');
const { ImportExport } = require('../../lib/import-export');
const { Activities } = require('../../lib/activities');
const Errors = require('../../lib/errors');

const { git_commit_msg_schema } = require('../validations/index');

// NPM modules
const Promise = require('bluebird');
const lodashKeys = require('lodash/keys');
const lodashHas = require('lodash/has');
const lodashGet = require('lodash/get');
const sanitize = require('sanitize-filename');

const config = require('../../lib/config').get_instance();

const path = require('path');

SocketIO.route_return('event_rules::activate', function (socket, data, socket_cb) {
  logger.info('got event_rules::activate', data);

  const validated_data = git_commit_msg_schema.validate(data.commit_msg, { abortEarly: true });
  if (validated_data.error) {
    logger.error('event_rules::activate validation error', validated_data);
    throw new Errors.ValidationError('Invalid git commit message');
  }

  debug('git commit msg: ', validated_data);
  const { commit_msg } = data;

  const santizedFilename = sanitize(data.filename);
  if (!santizedFilename) {
    throw new Errors.ValidationError('filename not recognised');
  }

  const filePath = path.join(config.app.upload.directory, santizedFilename);

  return ImportExport.switch_to_imported(filePath, {
    user_name: socket.ev.user(),
    user_email: config.app.email,
    git: config.rules.git,
    git_push: config.rules.push,
    commit_msg,
  }).then(function (result) {
    Activities.store('rules', 'imported', socket.ev.user(), {});

    debug('activated this', result);
    logger.info('User [%s] activated rules [%s]', socket.ev.user(), filePath);
    return { filename: santizedFilename };
  });
});
