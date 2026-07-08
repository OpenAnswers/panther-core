//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # ApiKey Schema

// Activities are used as a log for anything happening in the system so
// users can have a view of that later.
// They can be queried by an activity `category` and activity `type`

// #### Modules

// Logging
const { logger, debug } = require('oa-logging')('oa:event:model:apikey');

// Npm modules
const mongoose = require('mongoose');
const moment = require('moment');
const Promise = require('bluebird');

// OA modules
const Errors = require('oa-errors');
const { SocketIO } = require('../../lib/socketio');
const { random_string } = require('oa-helpers');

const APIKEY_LENGTH = 32;

// `generate_apikey()` generates a random 32 byte string
const generate_apikey = () => random_string(APIKEY_LENGTH);

// ## Schema

// ApiKey
const ApiKeySchema = new mongoose.Schema({
  // The ApiKey is a uniqe index
  apikey: {
    type: String,
    required: true,
    default: generate_apikey,
    index: true,
    unique: true,
  },

  // Time the activity took place
  created: {
    type: Date,
    default() {
      return moment().toDate();
    },
    required: true,
  },

  // The username associated with the apikey
  username: {
    type: String,
    required: true,
  },

  // ApiKey will be used for
  // console, server, http, syslogd, graylog
  integration: {
    type: String,
    enum: ['console', 'server', 'http', 'syslogd', 'graylog'],
  },
});

// ### Events

// Don't propogate updates out to any users that are listening
// This should be restricted to admins who join a room
ApiKeySchema.post('save', doc => SocketIO.io?.to('apikeys').emit('apikeys::updated', doc));

// ### tokenExpired( token )
// Check if a reset token exists, and is expired
ApiKeySchema.statics.user_tokens_Async = function (username) {
  debug('user_tokens_Async running for username', username);
  if (!username) {
    throw new Errors.ValidationError('Invalid User', { username });
  }
  return this.find({ username })
    .then(function (doc) {
      debug('user_tokens_Async returned for [%s]', username, doc);
      if (!doc) {
        const msg = `User doesn't have a token [${username}]`;
        logger.warn(msg);
        throw new Errors.ValidationError(msg, {
          field: 'username',
          value: username,
        });
      }

      return doc;
    })
    .catch(function (error) {
      logger.error(error, error.stack);
      throw error;
    });
};

ApiKeySchema.statics.delete_user = function (username) {
  return this.deleteOne({ username });
};

// #### Export

// Model promisification and export
const ApiKey = mongoose.model('ApiKey', ApiKeySchema);
module.exports = {
  ApiKey,
  APIKEY_LENGTH,
};
