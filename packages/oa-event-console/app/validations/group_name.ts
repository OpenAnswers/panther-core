//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const Joi = require('@hapi/joi');
const Errors = require('../../lib/errors');

const group_name_definition = Joi.string()
  .min(1)
  .alphanum()
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'string.base':
          err.message = 'Group must be a string';
          break;
        case 'string.min':
        case 'string.empty':
          err.message = 'Group must not be empty';
          break;
        case 'string.alphanum':
          err.message = 'Group can only contain alphanumeric';
          break;
      }
    });
    return errors;
  });
//group_name_definition = Joi.string().valid('admin', 'user')
//    new Errors.ValidationError 'Group name invalid', field: 'group', value: ''

module.exports.group_name_definition = group_name_definition;
