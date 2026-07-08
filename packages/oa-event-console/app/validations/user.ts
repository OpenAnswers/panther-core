//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const Joi = require('@hapi/joi');
const { group_name_definition } = require('./group_name');

const { logger, debug } = require('oa-logging')('oa:validations:user');

const Errors = require('../../lib/errors');

const username_definition = Joi.string()
  .alphanum()
  .min(4)
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'string.base':
          err.message = 'Username must be a string';
          break;
        case 'string.min':
          err.message = 'Username must be at least 4 characters';
          break;
        case 'string.alphanum':
          err.message = 'Username can only contain alphanumeric';
          break;
        case 'string.empty':
          err.message = 'Username must not be empty';
          break;
      }
    });
    return errors;
  });

const email_definition = Joi.string()
  .min(4)
  .email()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'string.base':
          err.message = 'No email field in user data';
          break;
        case 'string.min':
        case 'string.empty':
          err.message = 'Email must not be empty';
          break;
        case 'string.email':
          err.message = 'Email address is invalid';
          break;
      }
    });
    return errors;
  });

const users_read_definition = Joi.object({})
  .required()
  .error(function (errors) {
    debug('users_read: ', errors);
    return new Errors.ValidationError('read is invalid');
  });

const user_update_definition = Joi.object()
  .keys({
    _id: Joi.string().alphanum().required(),
    email: email_definition.required(),
    group: group_name_definition.required(),
    username: username_definition.required(),
  })
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'object.unknown':
        case 'any.required':
          err.message = 'No user in data';
          break;
      }
    });
    return errors;
  });

const user_create_definition = Joi.object()
  .keys({
    user: Joi.object()
      .keys({
        username: username_definition.required(),
        group: group_name_definition.required(),
        email: email_definition.required(),
      })
      .required()
      .error(function (errors) {
        errors.forEach(function (err) {
          switch (err.code) {
            case 'any.required':
              err.message = 'No user data';
              break;
          }
        });
        return errors;
      }),
  })
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'object.unknown':
        case 'any.required':
          err.message = 'No user in data';
          break;
      }
    });
    return errors;
  });

const user_read_definition = Joi.object()
  .keys({
    user: username_definition,
  })
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'object.unknown':
        case 'any.required':
          err.message = 'No user in data';
          break;
      }
    });
    return errors;
  });

const user_delete_definition = Joi.object()
  .keys({
    user: username_definition.required(),
  })
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'object.unknown':
        case 'any.required':
          err.message = 'No user in data';
          break;
      }
    });
    return errors;
  });

const user_reset_password_definition = Joi.object()
  .keys({
    user: username_definition.required(),
  })
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'object.unknown':
        case 'any.required':
          err.message = 'No user in data';
          break;
      }
    });
    return errors;
  });

module.exports = {
  users_read_schema: users_read_definition,
  user_create_schema: user_create_definition,
  user_read_schema: user_read_definition,
  user_update_schema: user_update_definition,
  user_delete_schema: user_delete_definition,
  user_reset_password_schema: user_reset_password_definition,
};
