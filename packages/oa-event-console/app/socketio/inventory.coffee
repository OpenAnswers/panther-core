# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug} = require('oa-logging')('oa:event:socketio:inventory')

# node modules
path = require 'path'

# npm modules
moment = require 'moment'

Joi = require '@hapi/joi'

# oa modules
{ is_numeric
  format_string, _ } = require 'oa-helpers'

{ SocketIO }      = require '../../lib/socketio'
Errors            = require '../../lib/errors'

{ Inventory }     = require '../model/inventory'
{ Mongoose }      = require '../../lib/mongoose'
{inventory_delete_schema} = require '../validations'

config            = require('../../lib/config').get_instance()



# Inventory delete
SocketIO.route_return 'inventory::delete', ( socket, request ) ->
  debug 'got inventory::delete', request

  { value, error } = inventory_delete_schema.validate request

  if error
    return Promise.reject( new Errors.ValidationError('Incorrect format') )
    #return new Errors.ValidationError('Incorrect format')


  debug 'validated inventory::delete', value
  validated_ids = value.data

  # convert passed id's to mongo ObjectID's

  object_ids = Mongoose.recids_to_objectid validated_ids

  # Setup a query
  remove_query = _id: $in: object_ids
  debug 'deleting many inventory with: ', remove_query

  Inventory.deleteMany remove_query
  .then ( removed_docs )->
    debug "inventory deleted", removed_docs.n
    doc =
      ids: validated_ids
      rows: removed_docs.n
  .catch (err)->
    logger.error "inventory::delete", err
    throw new Errors.ValidationError('Incorrect format')



