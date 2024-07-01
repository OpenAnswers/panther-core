# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # ApiKey Schema

# Activities are used as a log for anything happening in the system so
# users can have a view of that later.
# They can be queried by an activity `category` and activity `type`

# #### Modules

# Logging
{logger, debug} = require('oa-logging')('oa:event:model:apikey')

# Npm modules
mongoose = require 'mongoose'
moment   = require 'moment'
Promise  = require 'bluebird'

# OA modules
Errors            = require 'oa-errors'
{ SocketIO }      = require '../../lib/socketio'
{ random_string } = require 'oa-helpers'

APIKEY_LENGTH = 32

# `generate_apikey()` generates a random 32 byte string
generate_apikey = ()->
  random_string(APIKEY_LENGTH)

# ## Schema 

# ApiKey 
ApiKeySchema = new mongoose.Schema
  
  # The ApiKey is a uniqe index
  apikey:
    type:     String
    required: true
    default:  generate_apikey
    index:    true
    unique:   true

  # Time the activity took place
  created:
    type:     Date
    default:  ()->
      moment().toDate()
    required: true

  # The username associated with the apikey
  username:
    type:     String
    required: true

  # ApiKey will be used for
  # console, server, http, syslogd, graylog
  integration:
    type: String
    enum: ['console', 'server', 'http', 'syslogd', 'graylog']


# ### Events

# Don't propogate updates out to any users that are listening
# This should be restricted to admins who join a room
ApiKeySchema.post 'save', (doc) ->
  SocketIO.io?.to('apikeys').emit('apikeys::updated', doc)


# ### tokenExpired( token )
# Check if a reset token exists, and is expired
ApiKeySchema.statics.user_tokens_Async = ( username )->
  debug 'user_tokens_Async running for username', username
  unless username
    throw new Errors.ValidationError 'Invalid User', username: username
  @find username: username
  .then ( doc )->
    debug 'user_tokens_Async returned for [%s]', username, doc
    unless doc
      msg = "User doesn't have a token [#{username}]"
      logger.warn msg
      throw new Errors.ValidationError msg,
        field: 'username'
        value: username

    return doc

  .catch ( error )->
    logger.error error, error.stack
    throw error

ApiKeySchema.statics.delete_user = ( username )->
  @deleteOne username: username

# #### Export

# Model promisification and export
ApiKey = mongoose.model 'ApiKey', ApiKeySchema
module.exports =
  ApiKey: ApiKey
  APIKEY_LENGTH: APIKEY_LENGTH


