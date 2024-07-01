# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:model:integration_log')

# npm modules
mongoose = require 'mongoose'
moment   = require 'moment'
Promise  = require 'bluebird'

# oa modules
{ SocketIO }      = require "../../lib/socketio"

config = require('../../lib/config').get_instance()


# ## IntegrationLog

# A log for Integration runs so users can have a view of that later.

IntegrationLogSchema = new mongoose.Schema
  
  # Time the activity took place
  time:
    type:     Date
    default:  ()->
      moment().toDate()
    required: false

  # The initiator of the integrations
  initiatior:
    type:     String
    required: true

  # Type/nmae of integration that has been run
  type:
    type:     String
    required: true

  # Any unstructured data associated with the Integration run
  metadata:
    type:     mongoose.Schema.Types.Mixed
    required: false

  # The http request sent out
  request:
    type:     String
    required: true

  # The http response recieved, could be a local error
  response:
    type:     String
    required: true

  # Expire this log entry after...
  expire:
    type:     Date
    default:  ()->
      moment().add( config.app.integrations.logs.hours, 'hours' ).toDate()
    required: true
    index:
      expireAfterSeconds: 0

# Ensure we have the current date attached
# IntegrationLogSchema.pre 'save', (next) ->
#   unless @time
#     @time = moment().toDate()
#   next()



# Model promisifcation and export
IntegrationLog = mongoose.model 'IntegrationLog', IntegrationLogSchema
Promise.promisifyAll IntegrationLog
Promise.promisifyAll IntegrationLog.prototype

module.exports.IntegrationLog = IntegrationLog