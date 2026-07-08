//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const Joi = require('@hapi/joi');
const { group_name_definition } = require('./group_name');

const { logger, debug } = require('oa-logging')('oa:validations:password');

const Errors = require('../../lib/errors');
const { RESET_TOKEN_LENGTH } = require('../model/user');

const password_reset_token_schema = Joi.string()
  .length(RESET_TOKEN_LENGTH)
  .alphanum()
  .required()
  .error(errors => new Errors.ValidationError('Invalid reset token'));

const password_reset_schema = Joi.object()
  .keys({
    token: password_reset_token_schema,
    password: Joi.string().required(),
    confirm: Joi.string()
      .required()
      .valid(Joi.ref('password'))
      .error(errors => new Errors.ValidationError("Passwords don't match, try again")),
  })
  .required()
  .with('password', 'confirm');

const password_requested_schema = Joi.object()
  .keys({
    email: Joi.string()
      .min(3)
      .email()
      .required()
      .error(function (errors) {
        debug('password_requested ', errors);
        return new Errors.ValidationError('Invalid email address');
      }),
  })
  .required();

module.exports = {
  password_requested_schema,
  password_reset_token_schema,
  password_reset_schema,
};
