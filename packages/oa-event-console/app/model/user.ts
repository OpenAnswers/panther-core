//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:model:user');

// npm modules
const mongoose = require('mongoose');
const Promise = require('bluebird');
const PassportLocalMongoose = require('passport-local-mongoose').default;
const moment = require('moment');

// oa modules
const Errors = require('../../lib/errors');
const { _, random_string } = require('oa-helpers');

const config = require('../../lib/config').get_instance();

const admin_group = 'admin';
const user_group = 'user';
const read_group = 'read';
const default_group = user_group;

const RESET_TOKEN_LENGTH = 64;

// ## User Schema

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
    },

    first_name: {
      type: String,
    },

    last_name: {
      type: String,
    },

    group: {
      type: String,
      enum: [admin_group, user_group],
      default: default_group,
    },

    created: {
      type: Date,
      default() {
        return moment().toDate();
      },
    },

    updated: {
      type: Date,
      default() {
        return moment().toDate();
      },
    },

    last_login: {
      type: Date,
    },

    failure_count: {
      type: Number,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    reset: {
      token: {
        type: String,
        default: random_string(RESET_TOKEN_LENGTH),
      },

      created: {
        type: Date,
        default() {
          return moment().toDate();
        },
      },

      expires: {
        type: Date,
        default() {
          return moment().add(20, 'minutes').toDate();
        },
      },
    },

    preferences: {
      columns: {
        type: [String],
        default: ['summary', 'tag', 'node', 'owner', 'last_occurrence', 'first_occurrence', 'tally', 'group'],
      },
    },
  },
  { timestamps: { updatedAt: 'updated' } }
);

UserSchema.pre('save', function (next) {
  this.updated = moment().toDate();
  this.email = this.email.toLowerCase();
  return next();
});

// ### getUserList
UserSchema.statics.getUserList = function () {
  return this.find({ login: { $exists: false } })
    .select({ username: 1 })
    .sort({ username: 1 })
    .exec();
};

// ### Check if a user is admin
UserSchema.methods.isAdministrator = function () {
  return this.group === admin_group;
};

// ### generate_token( minutes )
// Generate an email token that will expire in n minutes
UserSchema.methods.generate_token = function (minutes) {
  minutes ??= 20;
  this.reset.token = random_string(64);
  this.reset.created = moment().toDate();
  return (this.reset.expires = moment().add(minutes, 'minutes').toDate());
};

// Plug passport methods into the schema
UserSchema.plugin(PassportLocalMongoose, {
  maxInterval: config.app.login.max_interval,
  lastLoginField: 'last_login',
  attemptsField: 'failure_count',
  limitAttempts: true,
  maxAttempts: config.app.login.max_attempts,
  interval: config.app.login.interval,
});

// ### Read all
UserSchema.statics.read_all = function () {
  return this.find({ username: { $exists: true, $ne: '' } })
    .select({ username: 1, group: 1, email: 1, created: 1 })
    .sort({ username: 1 })
    .exec();
};

// ### Read all without admin
UserSchema.statics.read_all_minus_admin = function () {
  return this.find({ username: { $exists: true, $ne: '' } })
    .select({ username: 1, group: 1, email: 1, created: 1 })
    .sort({ username: 1 })
    .exec();
};

// ### Read one
UserSchema.statics.read_one = function (user) {
  if (user == null) {
    return Promise.reject(new Errors.ValidationError('No user for read'));
  }
  return this.findOne({ username: user });
};

// ### Create
UserSchema.statics.create_admin = function (data, cb) {
  debug('create_admin', data);

  const user = new this(data);
  debug('create_admin', data);
  return this.register(user, data.email_token).then(function (res) {
    debug('create_admin', res);
    return cb(null, res);
  });
};

// ### Update
UserSchema.statics.update_data = function (data) {
  const self = this;
  return new Promise(function (resolve, reject) {
    debug('findByIdAndUpdate data', data);
    if (!data) {
      reject(new Errors.ValidationError('No user data attached'));
    }
    if (data.username == null) {
      reject(new Errors.ValidationError('No username field in user data', { field: 'username' }));
    }
    if (!_.isString(data.username)) {
      reject(new Errors.ValidationError('Username must be a string', { field: 'username' }));
    }
    if (!(data.username.length > 0)) {
      reject(new Errors.ValidationError('Username must not be empty', { field: 'username', value: '' }));
    }
    if (data._id == null) {
      reject(new Errors.ValidationError('No _id field in update data'));
    }

    return self
      .findByIdAndUpdate(data._id, data)
      .then(ret => resolve(ret))
      .catch({ code: 11000 }, error =>
        reject(
          new Errors.ValidationError('A user name cannot be duplicated', {
            field: 'username',
            value: data.username,
          })
        )
      );
  });
};

// ### Delete
UserSchema.statics.delete = function (user, cb) {
  if (user == null) {
    cb(new Errors.ValidationError('No user for delete'));
  }
  return this.findOneAndRemove({ username: user }, cb);
};

// #### delete_user
UserSchema.statics.delete_user = function (user) {
  if (user == null) {
    throw new Errors.ValidationError('No user for delete');
  }
  return this.deleteOne({ username: user });
};

// ### tokenExpired( token )
// Check if a reset token exists, and is expired
UserSchema.statics.tokenExpired = function (token, cb) {
  const now = moment();
  return this.findOne({ 'reset.token': token })
    .then(function (user) {
      if (!user) {
        logger.warn("token doesn't exist [%s]", token);
        return cb(`token doesn't exist [${token}]`);
      }

      if (moment().isAfter(user.email_token_expires)) {
        logger.warn('token is expired', token, user.email_token_expires);
        return cb(`token is expired [${token}] [${user.email_token_expires}]`);
      }

      return cb(null, user);
    })
    .catch(function (error) {
      logger.error(error, error.stack);
      return cb(error);
    });
};

// Export the promosified model
const User = mongoose.model('User', UserSchema);
module.exports = {
  User,
  RESET_TOKEN_LENGTH,
};
