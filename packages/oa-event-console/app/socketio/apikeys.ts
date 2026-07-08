//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:apikeys');

// npm modules
const moment = require('moment');
const Joi = require('@hapi/joi');

// oa modules
const { _, random_string } = require('oa-helpers');
const { SocketIO } = require('../../lib/socketio');
const { ApiKey } = require('../model/apikey');
const Errors = require('../../lib/errors');
const config = require('../../lib/config').get_instance();

const {
  apikeys_read_schema,
  apikey_read_schema,
  apikey_create_schema,
  apikey_delete_schema,
} = require('../validations');

// Read all
SocketIO.route('apikeys::read', function (socket, data, cb) {
  debug('got apikeys::read', data);

  const validatedData = apikeys_read_schema.validate(data);
  if (validatedData.error) {
    if (validatedData.error instanceof Errors.ValidationError) {
      throw validatedData.error;
    }
    if (validatedData.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validatedData.error.message);
    }
    logger.error('apikeys::read validation error', validatedData.error);
    throw new Errors.ValidationError('Invalid apikeys::read');
  }

  return ApiKey.find().then(function (results) {
    debug('sending apikeys::read response', results);

    data = { amount: results.length, limit: config.app.apikey_limit };
    let disable = false;

    if (data.amount >= data.limit) {
      disable = true;
      logger.info('API Key Limit Reached');
    }

    return cb(null, { apikeys: results, max: disable, data });
  });
});

// Create
SocketIO.route_return('apikey::create', function (socket, data) {
  debug('apikey::create', data.user);

  const validatedData = apikey_create_schema.validate(data);
  if (validatedData.error) {
    if (validatedData.error instanceof Errors.ValidationError) {
      throw validatedData.error;
    }
    if (validatedData.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validatedData.error.message);
    }
    logger.error('apikey::create validation error', validatedData.error);
    throw new Errors.ValidationError('Invalid apikey::create');
  }

  return ApiKey.count().then(function (apiUsageDoc) {
    logger.info('apikey usage %d/%d', apiUsageDoc, config.app.apikey_limit);
    if (apiUsageDoc >= config.app.apikey_limit) {
      throw new Errors.ValidationError('ApiKey usage exceeded');
    }

    const apikey = new ApiKey();
    apikey.username = socket.ev.user();
    apikey.created = new Date();

    return apikey.save().then(function (doc) {
      logger.info('%s %s New apikey added. key [%s]', socket.id, socket.ev.user(), doc.apikey);
      SocketIO.io.emit('apikey::updated');
      return 'apikey setup';
    });
  });
});

// Read
SocketIO.route_return('apikey::read', function (socket, data) {
  debug('got apikey::read', data);

  const validatedData = apikey_read_schema.validate(data);
  if (validatedData.error) {
    if (validatedData.error instanceof Errors.ValidationError) {
      throw validatedData.error;
    }
    if (validatedData.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validatedData.error.message);
    }
    logger.error('apikey::read validation error', validatedData.error);
    throw new Errors.ValidationError('Invalid apikey::read');
  }

  return ApiKey.findById(validatedData.value.apikey).then(function (response) {
    debug('sending apikey::read response', response);
    return response;
  });
});

// Delete
SocketIO.route_return('apikey::delete', function (socket, data) {
  logger.info('%s %s Deleting apikey', socket.id, socket.ev.user(), data);

  const validatedData = apikey_delete_schema.validate(data);
  if (validatedData.error) {
    if (validatedData.error instanceof Errors.ValidationError) {
      throw validatedData.error;
    }
    if (validatedData.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validatedData.error.message);
    }
    logger.error('apikey::delete validation error', validatedData.error);
    throw new Errors.ValidationError('Invalid apikey::delete');
  }

  return ApiKey.deleteOne({ apikey: validatedData.value.apikey }).then(function (result) {
    SocketIO.io.emit('apikey::updated');
    logger.info('%s %s Deleted API key', socket.id, socket.ev.user(), validatedData.value.apikey);
    return result;
  });
});
