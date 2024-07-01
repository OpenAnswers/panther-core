# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:apikeys')

# npm modules
moment            = require 'moment'
Joi               = require '@hapi/joi'

# oa modules
{ _
  random_string } = require 'oa-helpers'
{ SocketIO }      = require '../../lib/socketio'
{ ApiKey }        = require '../model/apikey'
Errors            = require '../../lib/errors'
config            = require('../../lib/config').get_instance()

{apikeys_read_schema, apikey_create_schema, apikey_delete_schema} = require '../validations'



# Read all
SocketIO.route 'apikeys::read', ( socket, data, cb ) ->
  debug 'got apikeys::read', data

  validatedData = apikeys_read_schema.validate data
  if validatedData.error
    if validatedData.error instanceof Errors.ValidationError
      throw validatedData.error
    if validatedData.error instanceof Joi.ValidationError
      throw new Errors.ValidationError validatedData.error.message
    logger.error "apikeys::read validation error", validatedData.error
    throw new Errors.ValidationError 'Invalid apikeys::read'


  ApiKey.find()
  .then ( results ) ->
    debug 'sending apikeys::read response', results

    data = {amount: results.length, limit: config.app.apikey_limit}
    disable = false

    if data.amount >= data.limit
      disable = true
      logger.info "API Key Limit Reached"

    cb null, {apikeys:results, max:disable, data:data}


# Create
SocketIO.route_return 'apikey::create', ( socket, data ) ->
  debug 'apikey::create', data.user

  validatedData = apikey_create_schema.validate data
  if validatedData.error
    if validatedData.error instanceof Errors.ValidationError
      throw validatedData.error
    if validatedData.error instanceof Joi.ValidationError
      throw new Errors.ValidationError validatedData.error.message
    logger.error "apikey::create validation error", validatedData.error
    throw new Errors.ValidationError 'Invalid apikey::create'


  return ApiKey.count()
  .then ( apiUsageDoc ) ->
    logger.info 'apikey usage %d/%d', apiUsageDoc, config.app.apikey_limit
    throw new Errors.ValidationError "ApiKey usage exceeded" if apiUsageDoc >= config.app.apikey_limit
  
    apikey = new ApiKey()
    apikey.username = socket.ev.user()
    apikey.created = new Date

    return apikey.save()
    .then ( doc )->
      logger.info '%s %s New apikey added. key [%s]', socket.id, socket.ev.user(), doc.apikey
      SocketIO.io.emit 'apikey::updated'
      'apikey setup'


# Read
SocketIO.route_return 'apikey::read', ( socket, data ) ->
  debug 'got apikey::read', data

  validatedData = apikey_read_schema.validate data
  if validatedData.error
    if validatedData.error instanceof Errors.ValidationError
      throw validatedData.error
    if validatedData.error instanceof Joi.ValidationError
      throw new Errors.ValidationError validatedData.error.message
    logger.error "apikey::read validation error", validatedData.error
    throw new Errors.ValidationError 'Invalid apikey::read'

  ApiKey.findById validatedData.value.apikey
  .then ( response ) ->
    debug 'sending apikey::read response', response
    response


# Delete
SocketIO.route_return 'apikey::delete', ( socket, data ) ->
  logger.info '%s %s Deleting apikey', socket.id, socket.ev.user(), data

  validatedData = apikey_delete_schema.validate data
  if validatedData.error
    if validatedData.error instanceof Errors.ValidationError
      throw validatedData.error
    if validatedData.error instanceof Joi.ValidationError
      throw new Errors.ValidationError validatedData.error.message
    logger.error "apikey::delete validation error", validatedData.error
    throw new Errors.ValidationError 'Invalid apikey::delete'

  ApiKey.remove apikey: validatedData.value.apikey
  .then ( result ) ->
    SocketIO.io.emit 'apikey::updated'
    logger.info '%s %s Deleted API key', socket.id, socket.ev.user(), validatedData.value.apikey
    result
