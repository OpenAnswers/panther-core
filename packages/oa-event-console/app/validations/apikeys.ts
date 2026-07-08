//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const Joi = require('@hapi/joi');
const Errors = require('../../lib/errors');

const { APIKEY_LENGTH } = require('../model/apikey');

const apikey_schema = Joi.string()
  .length(APIKEY_LENGTH)
  .alphanum()
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'string.base':
        case 'any.required':
          err.message = 'apikey is required';
          break;
        case 'string.alphanum':
        case 'string.length':
          err.message = 'apikey is invalid';
          break;
      }
    });
    return errors;
  });
//new Errors.ValidationError 'apikey invalid', field: 'apikey', value: ''

const apikey_create_schema = Joi.object()
  .keys({
    apikey: Joi.object({}).required(),
  })
  .required()
  .messages({
    'any.required': 'apikey is required',
  });

const apikey_read_schema = Joi.object()
  .keys({
    apikey: apikey_schema.required(),
  })
  .required();

const apikey_delete_schema = Joi.object()
  .keys({
    apikey: apikey_schema.required(),
  })
  .required()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'any.required':
          return (err.message = 'apikey is required');
      }
    });
    return errors;
  });

module.exports = {
  apikey_schema,
  apikey_create_schema,
  apikey_read_schema,
  apikey_delete_schema,
};
