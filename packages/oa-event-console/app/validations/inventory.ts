//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const Joi = require('@hapi/joi');
const { group_name_definition } = require('./group_name');

const { logger, debug } = require('oa-logging')('oa:validations:inventory');

const Errors = require('../../lib/errors');

const inventory_id_schema = Joi.string()
  .alphanum()
  .error(errors => new Errors.ValidationError('Invalid inventory::delete id'));

const inventory_delete_schema = Joi.object()
  .keys({
    data: Joi.array()
      .items(inventory_id_schema)
      .required()
      .error(function (errors) {
        debug('inventory delete ', errors);
        return new Errors.ValidationError('Invalid inventory::delete');
      }),
  })
  .required();

module.exports = { inventory_delete_schema };
