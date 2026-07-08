//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const Joi = require('@hapi/joi');
const { group_name_definition } = require('./group_name');

const { logger, debug } = require('oa-logging')('oa:validations:schedule');

const Errors = require('../../lib/errors');

const schedule_uuid_schema = Joi.string()
  .guid({ version: ['uuidv1'] })
  .required()
  .error(errors => new Errors.ValidationError('Invalid schedule uuid'));

const weekdays_collection_schema = Joi.array()
  .items(Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'))
  .error(errors => new Errors.ValidationError('Invalid schedule weekeday'));

const schedule_update_days_schema = Joi.object()
  .keys({
    uuid: schedule_uuid_schema,
    days: weekdays_collection_schema,
  })
  .required();

const schedule_delete_schema = Joi.object()
  .keys({
    uuid: schedule_uuid_schema,
  })
  .required();

module.exports = {
  schedule_update_days_schema,
  schedule_delete_schema,
};
