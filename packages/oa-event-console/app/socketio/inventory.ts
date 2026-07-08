//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Logging module
const { logger, debug } = require('oa-logging')('oa:event:socketio:inventory');

// node modules
const path = require('path');

// npm modules
const moment = require('moment');

const Joi = require('@hapi/joi');

// oa modules
const { is_numeric, format_string, _ } = require('oa-helpers');

const { SocketIO } = require('../../lib/socketio');
const Errors = require('../../lib/errors');

const { Inventory } = require('../model/inventory');
const { Mongoose } = require('../../lib/mongoose');
const { inventory_delete_schema } = require('../validations');

const config = require('../../lib/config').get_instance();

// Inventory delete
SocketIO.route_return('inventory::delete', function (socket, request) {
  debug('got inventory::delete', request);

  const { value, error } = inventory_delete_schema.validate(request);

  if (error) {
    return Promise.reject(new Errors.ValidationError('Incorrect format'));
  }
  //return new Errors.ValidationError('Incorrect format')

  debug('validated inventory::delete', value);
  const validated_ids = value.data;

  // convert passed id's to mongo ObjectID's

  const object_ids = Mongoose.recids_to_objectid(validated_ids);

  // Setup a query
  const remove_query = { _id: { $in: object_ids } };
  debug('deleting many inventory with: ', remove_query);

  return Inventory.deleteMany(remove_query)
    .then(function (removed_docs) {
      let doc;
      debug('inventory deleted', removed_docs.n);
      return (doc = {
        ids: validated_ids,
        rows: removed_docs.n,
      });
    })
    .catch(function (err) {
      logger.error('inventory::delete', err);
      throw new Errors.ValidationError('Incorrect format');
    });
});
