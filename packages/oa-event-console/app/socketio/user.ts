//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:user');

// npm modules
const moment = require('moment');
const Promise = require('bluebird');

// oa modules
const { _, random_string } = require('oa-helpers');
const { SocketIO } = require('../../lib/socketio');
const { User } = require('../model/user');
const { Filters } = require('../model/filters');
const { ApiKey } = require('../model/apikey');
const { send_email_Async } = require('../../lib/email');
const Errors = require('../../lib/errors');
const { send_email } = require('../../lib/email');
const config = require('../../lib/config').get_instance();

const Joi = require('@hapi/joi');

const {
  users_read_schema,
  user_read_schema,
  user_update_schema,
  user_create_schema,
  user_delete_schema,
  user_reset_password_schema,
} = require('../validations/index');

// Read all
SocketIO.route_return('users::read', function (socket, data, cb) {
  debug('got users::read', data);

  const validatedData = users_read_schema.validate(data, { stripUnknown: true });
  if (validatedData.error) {
    if (validatedData.error instanceof Errors.ValidationError) {
      throw validatedData.error;
    }
    if (validatedData.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validatedData.error.message);
    }
    logger.error('users::read validation error', validatedData.error);
    throw new Errors.ValidationError('Invalid users data');
  }

  return User.read_all_minus_admin().then(function (response) {
    debug('sending users::read response', response);
    return response;
  });
});

// Create
SocketIO.route_return('user::create', function (socket, data) {
  const validated_data = user_create_schema.validate(data, { abortEarly: true });

  //  unless data.user
  //    throw new Errors.ValidationError 'No user in data'
  //  unless data.user.username?
  //    throw new Errors.ValidationError 'No username field in user data', field: 'username'
  //  unless _.isString(data.user.username)
  //    throw new Errors.ValidationError 'Username must be a string', field: 'username'
  //  unless data.user.username.length > 0
  //    throw new Errors.ValidationError 'Username must not be empty', field: 'username', value: ''
  //
  //  unless data.user.group?
  //    throw new Errors.ValidationError 'No group field in user data', field: 'group'
  //  unless _.isString(data.user.group)
  //    throw new Errors.ValidationError 'Group must be a string', field: 'group'
  //  unless data.user.group.length > 0
  //    throw new Errors.ValidationError 'Group must not be empty', field: 'group', value: ''
  //
  //  unless data.user.email?
  //    throw new Errors.ValidationError 'No email field in user data', field: 'email'
  //  unless _.isString(data.user.email)
  //    throw new Errors.ValidationError 'Email must be a string', field: 'email'
  //  unless data.user.email.length > 0
  //    throw new Errors.ValidationError 'Email must not be empty', field: 'email', value: ''
  //
  //  validationResponse = Joi.string().email().validate data.user.email
  //  if validationResponse.error?
  //    throw new Errors.ValidationError 'Email address is invalid', field: 'email', value: data.user.email
  //

  if (validated_data.error) {
    if (validated_data.error instanceof Errors.ValidationError) {
      throw validated_data.error;
    }
    if (validated_data.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validated_data.error.message);
    }
    logger.error('user::create validation error', validated_data.error);
    throw new Errors.ValidationError('Invalid user data');
  }

  data.user.email_token = random_string(64);
  data.user.email_token_expires = moment().add(14, 'days').toDate();

  // Create the user in the DB
  return User.register(data.user, data.user.email_token)
    .then(function (user_res) {
      logger.info(
        'New user added by [%s]. User [%s] Group [%s]',
        socket.ev.user(),
        data.user.username,
        data.user.group,
        data.user.email
      );

      SocketIO.io.emit('users::updated');
      // User has been created succesfully, now populate the default views
      return Filters.setup_initial_views(data.user.username);
    })
    .then(function (filter_res) {
      logger.info('Initial views added for user [%s]', data.user.username);

      // Create a longer lived reset token

      return User.findOne({ username: data.user.username }).then(function (user) {
        user.generate_token(2880); // two days for the initial login
        return user.save();
      });
    })
    .then(function (updatedUserRes) {
      // with the newly created user and longer lived reset token, send out the email
      const reset_url = `${config.app.url}/password/reset/${updatedUserRes.reset.token}`;
      return send_email({
        to: updatedUserRes.email,
        from: config.app.email,
        subject: `${config.app.name} User account created`,
        template: {
          name: 'new-user-creation',
          values: {
            username: updatedUserRes.username,
            token: updatedUserRes.reset.token,
            reset_url,
          },
        },
      }).catch(function (err) {
        debug('email send', err);
        return logger.error(`Failed to send email to username: ${data.user.username}`);
      });
    })
    .then(emailResponse => `User ${data.user.username} setup in the ${data.user.group} group`);
});

// Update
SocketIO.route_return('user::update', function (socket, data) {
  logger.info('%s Updating user', socket.ev.user());

  const validation = user_update_schema.validate(data);
  if (validation.error) {
    if (validation.error instanceof Errors.ValidationError) {
      throw validation.error;
    }
    if (validation.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validation.error.message);
    }
    throw new Errors.ValidationError('invalid request');
  }

  const validatedData = validation.value;
  debug('%s is Updating user [%s] with data: ', socket.ev.user(), validatedData.username, validatedData);

  return User.update_data(validatedData).then(function (response) {
    logger.info('%s User updated [%s]', socket.ev.user(), validatedData.username);
    debug('update response', response);
    SocketIO.io.emit('users::updated');
    return response;
  });
});

// Read
SocketIO.route('user::read', function (socket, data, cb) {
  debug('got user::read', data);

  const validation = user_read_schema.validate(data);
  if (validation.error) {
    if (validation.error instanceof Errors.ValidationError) {
      throw validation.error;
    }
    if (validation.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validation.error.message);
    }
    throw new Errors.ValidationError('invalid request');
  }

  const validatedData = validation.value;

  return User.read_one(validatedData.user)
    .then(function (response) {
      debug('sending user::read response', response);
      return cb(null, response);
    })
    .catch(function (error) {
      logger.info('User.read_one failed', error);
      return null;
    });
});

// Delete
SocketIO.route('user::delete', function (socket, data, cb) {
  logger.info('Deleting user', socket.id, data);

  const validation = user_delete_schema.validate(data);
  if (validation.error) {
    if (validation.error instanceof Errors.ValidationError) {
      throw validation.error;
    }
    if (validation.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validation.error.message);
    }
    throw new Errors.ValidationError('invalid request');
  }

  const validatedData = validation.value;

  return Promise.props({
    user: User.delete_user(validatedData.user),
    filters: Filters.delete_user(validatedData.user),
    apikeys: ApiKey.delete_user(validatedData.user),
  })
    .then(function (results) {
      debug('Deletion results', results);
      socket.ev.info(`Deleted user ${validatedData.user}`);
      cb(null, results.user);
      return SocketIO.io.emit('users::updated');
    })
    .catch(Errors.ValidationError, function (err) {
      logger.error('admin user delete failed', data, err.message, err);
      return socket.ev.exception(err.name, err.message);
    });
});
// user: req.body.user
// status:
//   deleted: true

// Reset PAssword
SocketIO.route('user::reset_password', function (socket, data, cb) {
  logger.info('Resetting users password', socket.id, data.user);

  const validation = user_reset_password_schema.validate(data);
  if (validation.error) {
    if (validation.error instanceof Errors.ValidationError) {
      throw validation.error;
    }
    if (validation.error instanceof Joi.ValidationError) {
      throw new Errors.ValidationError(validation.error.message);
    }

    throw new Errors.ValidationError('invalid request');
  }

  const validatedData = validation.value;

  return User.findOne({ username: validatedData.user })
    .then(function (user) {
      user.generate_token(1440);
      return user.save();
    })
    .then(function (user) {
      const reset_url = `${config.app.url}/password/reset/${user.reset.token}`;

      return send_email_Async({
        to: user.email,
        subject: `${config.app.name} - Your password has been reset`,
        template: {
          name: 'password-reset-admin',
          values: {
            token: user.reset.token,
            expires: user.reset.expires,
          },
        },
      });
    })
    .then(function (result) {
      socket.ev.info(`The user ${validatedData.user} has been sent a password reset`);
      return cb(null, true);
    })
    .catch(Errors.ValidationError, function (err) {
      logger.error('Password reset failed', validatedData, err, err, err.stack);
      return socket.ev.exception(err.name, err.message);
    });
});

// .catch Errors.EmailError, ( err )->
//   logger.error 'failed sending email', data, err.message, err
//   socket.ev.exception 'Failed to send email', err.name, err.message
