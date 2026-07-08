//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:validations:rules');

const Joi = require('@hapi/joi');
const Errors = require('../../lib/errors');

const rule_name_schema = Joi.string().pattern(/^[0-9a-zA-Z \-+$!#@]+$/);

const rules_group_name_schema = rule_name_schema.error(function (errors) {
  debug('Rule/Group name', errors);
  return new Errors.ValidationError('Rule/Group name contains invalid characters');
});

const rules_agent_name_schema = Joi.string()
  .alphanum()
  .min(3)
  .error(function (errors) {
    debug('Rule/Agent name', errors);
    return new Errors.ValidationError('Rule/Agent name contains invalid characters');
  });

module.exports = {
  rules_group_name_schema,
  rules_agent_name_schema,
};
