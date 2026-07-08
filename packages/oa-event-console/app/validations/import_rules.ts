//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
const Joi = require('@hapi/joi');

const { logger, debug } = require('oa-logging')('oa:validations:import_rules');
const Errors = require('../../lib/errors');

const git_commit_msg_definition = Joi.string()
  .empty('')
  .pattern(/^[0-9a-zA-Z \-+$!#@]+$/)
  .max(256, 'utf8')
  .error(function (errors) {
    errors.forEach(function (err) {
      switch (err.code) {
        case 'string.max':
          err.message = 'Commit Message is too long';
          break;
        case 'string.pattern.base':
          err.message = 'Commit Message contains invalid characters';
          break;
      }
    });
    // debug "returning errors: ", errors
    return errors;
  });

module.exports = { git_commit_msg_schema: git_commit_msg_definition };
