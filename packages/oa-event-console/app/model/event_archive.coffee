# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:model:event_archive')

# npm modules
mongoose = require 'mongoose'
moment   = require 'moment'
Promise  = require 'bluebird'

# oa modules
{ SocketIO }      = require "../../lib/socketio"


# ## EventArchive

# Archive of cleared or deleted events

EventArchiveSchema = new mongoose.Schema
  
  # Time the activity took place
  expire:
    type:     Date
    default:  ()->
      moment().add( 24, 'hours' ).toDate()
    required: true
    index:
      expireAfterSeconds: 0

  # The archived event
  event:
    type:     mongoose.Schema.Types.Mixed
    required: true

  # Category/grouping of activity
  operation:
    type:     String
    required: true



# Model promisifcation and export
EventArchive = mongoose.model 'EventArchive', EventArchiveSchema
Promise.promisifyAll EventArchive
Promise.promisifyAll EventArchive.prototype
Promise.promisifyAll EventArchive.collection
module.exports.EventArchive = EventArchive