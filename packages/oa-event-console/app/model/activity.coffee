# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Activity Schema

# Activities are used as a log for anything happening in the system so
# users can have a view of that later.
# They can be queried by an activity `category` and activity `type`

# ### Modules

# Logging
{logger, debug} = require('oa-logging')('oa:event:model:activity')

# Npm modules
mongoose = require 'mongoose'
moment   = require 'moment'
Promise  = require 'bluebird'

# OA modules
{ SocketIO }      = require "../../lib/socketio"


# ------------------
# ## Schema

# Activity 
ActivitySchema = new mongoose.Schema
  
  # Time the activity took place
  time:
    type:     Date
    default:  () -> moment().toDate()
    required: false

  # The username associated with the activity
  username:
    type:     String
    required: true

  # Category/grouping of activity
  category:
    type: String
    required: true

  # Type of activity in a category/group
  type:
    type: String
    required: true

  # Any data associated with the activity
  # Usually includes ids
  metadata:
    type:     mongoose.Schema.Types.Mixed
    required: false

  # A precompiled message for the user
  message:

    # In text format
    text:
      type:     String

    # In html format 
    html:
      type:     String

    markdown:
      type:     String

# ----------------

# ## Events

# Ensure we have the current date attached
ActivitySchema.pre 'save', (next) ->
  unless @time
    @time = moment().toDate()
  next()

# Propogate activity out to any users that are listening
ActivitySchema.post 'save', (doc) ->
  if SocketIO.io?.to
    SocketIO.io.to('activities').emit('activity', doc)


# ### Export
# Model promisifcation and export
Activity = mongoose.model 'Activity', ActivitySchema
Promise.promisifyAll Activity
Promise.promisifyAll Activity.prototype
module.exports.Activity = Activity
