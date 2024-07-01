# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:model:filters')

# npm modules
Promise  = require 'bluebird'
mongoose = require 'mongoose'


# # FilterSchema

# This is the filter schema. It stores filters for users
# It may store default filters as well

FilterSchema = new mongoose.Schema

  # User the filter is associated with
  user:
    type: String

  # Name of the filter
  name:
    type: String
    required: true

  field:
    type: String
    #required: true

  value:
    type: String
    #required: true

  # f is the filter.. why not filter?
  # This is used as a mongo filter object
  f:
    type: mongoose.Schema.Types.Mixed
    default: {}

  default:
    type: Boolean
    default: false

  created_at:
    type: Date

  modified_at:
    type: Date

  # Is the filter system or not
  system:
    type: Boolean
    default: false


# Automatically populate new records with a created_at date
.pre 'save', ( next ) ->
  unless @created_at?
    @created_at = new Date()
  next()

# Automatically populate modified_at with the current date
.pre 'save', ( next ) ->
  @modified_at = new Date()
  next()

# Check if we already have this name
# .pre 'save', ( next ) ->
#   next()



# Update
## returns a `Promise` which resolves to the updates Filter or a rejects with an Error
## @return {Promise}
FilterSchema.statics.update_data = ( data )->
  self=@
  debug 'findByIdAndUpdate data', data

  unless data._id?
    return Promise.reject(new Errors.ValidationError('No _id field in update data'))
  unless data.name?
    return Promise.reject(new Errors.ValidationError('No name field in update data'))
  
  data.name = "#{data.name}"

  @findByIdAndUpdate data._id, data


# Set default
FilterSchema.statics.set_default = ( user, id )->
  debug 'set_default view', user, id

  unless id?
    return Promise.reject new Errors.ValidationError('No id in update data') 
  unless user?
    return Promise.reject new Errors.ValidationError('No user in update data') 
  self = @

  @update { user: user, default: true }, { default: false }, { multi: true}
  .then ( response )->
    logger.warn "User had no default", user, id if response.n is 0
    self.findByIdAndUpdate id, default: true

  .then ( response )->
    if response.n is 0
      Promise.reject "User had no default"
    "Default set to id [#{id}] for user [#{user}]"
    

FilterSchema.statics.setup_initial_views = ( user )->
  self = @
  new Promise ( resolve, reject )->

    views =
      mine:
        user: user
        name: 'Mine'
        field: 'owner'
        value: user
        f: { owner: user }
      all:
        user: user
        name: 'All'
        field: ''
        value: ''
        f: {}
      unack:
        user: user
        name: 'Unacknowledged'
        field: 'acknowledged'
        value: false
        default: true
        f: { acknowledged: false }
      ack:
        user: user
        name: 'Acknowledged'
        field: 'acknowledged'
        value: true
        f: { acknowledged: true }


    Promise.props
      mine:  self.create(views.mine)
      all:   self.create(views.all)
      unack: self.create(views.unack)
      ack: self.create(views.ack)
    .then ( results )->
      logger.debug results, ''
      resolve results
    .catch ( error )->
      logger.error 'FilterSchema.setup_initial_views %s', error, error.stack
      reject error

# delete filters belonging to a user
FilterSchema.statics.delete_user = ( user )->
  unless user?
    return Promise.reject new Errors.ValidationError('No user for delete') 
  @deleteOne user: user

# Export the model on this
@Filters = mongoose.model 'Filters', FilterSchema

# and make it bluebird promisey
