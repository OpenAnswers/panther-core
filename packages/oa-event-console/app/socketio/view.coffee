# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:view')

# npm modules
Promise           = require 'bluebird'
moment            = require 'moment'
mongoose          = require 'mongoose'
ValidationError   = mongoose.Error.ValidationError
ValidatorError    = mongoose.Error.ValidatorError

# oa modules
{ random_string } = require 'oa-helpers'
{ SocketIO }      = require '../../lib/socketio'
Errors            = require '../../lib/errors'

{ Filters }       = require '../model/filters'


# ### verify_socket_data = ( data, user )->
# Generic validation function for update and insert to use
# Using Promise.method so error handling is nice and easy for the
# whole update/insert transaction
verify_socket_data = Promise.method ( data, user )->

  unless data?
    throw new Errors.ValidationError('No data in message')
  unless data.view?
    throw new Errors.ValidationError('No "view" in message data')
    
  view = data.view
  view.user = user

  unless view.user?
    throw new Errors.ValidationError('No "user" in view data')
  
  unless view.name?
    throw new Errors.ValidationError('No "name" in view data')
  
  unless view.field?
    throw new Errors.ValidationError('No "field" in view data')
  
  unless view.value?
    throw new Errors.ValidationError('No "value" in view data')
  
  if view.name is ''
    throw new Errors.ValidationError("Name must have value")

  unless view.name.match /^\w/
    throw new Errors.ValidationError("Name must start with an standard character [#{view.name}]")

  if view.name.length > 30
    throw new Errors.ValidationError("Name must be less than 30 character [#{view.name}]")

  unless view.name.match /^[\w\s\-!\?]+$/
    throw new Errors.ValidationError("Name can contain spaces or simple characters [#{view.name}]")

  if view.field == '' and view.value != ''
    throw new Errors.ValidationError('Value without field')
  
  # Plains numbers become numbers.
  # use "" to change
  if view.value isnt '' and !isNaN view.value
    debug 'number value', view.value
    view.value = +view.value

  # // escaped strings are regex's
  re_match = /^\/(.*)\/$/.exec view.value
  if re_match
    debug 'regex value', view.value, re_match[1]
    view.value = new RegExp re_match[1]

  # "" strings are strings
  re_match = /^"(.*)"$/.exec view.value
  if re_match
    debug 'string value', view.value
    view.value = "#{re_match[1]}"

  # columns that contain booleans, ideally this method should understand the column types.
  if view.field in ['acknowledged']
    view.value = if view.value == "true" then true else false

  view.f = {}
  if view.field isnt ''
    debug 'setting f', view.f
    view.f[view.field] = view.value
    debug 'set f', view.f

  view



# Read all
SocketIO.route 'views::read', ( socket, data, socket_cb ) ->
  debug 'got views::read', data
  Filters.find( user: socket.ev.user() ).sort( name: 'asc' )
  .then ( response )->
    debug 'sending views::read response', response
    socket_cb response
    # users: Filter.all


# Read
SocketIO.route 'view::read', ( socket, data, socket_cb )->
  debug 'got view::read', data
  Filters.read_one data.view
  .then ( response )->
    debug 'sending view::read response', response
    socket_cb response


# Create
SocketIO.route 'view::create', ( socket, data, socket_cb ) ->
  debug 'view::create', socket.id, data
  
  verify_socket_data data, socket.ev.user()
  .then ( view )->
    logger.info 'New view for [%s] name [%s] [%s] [%s] [%j]',
      view.user, view.name, view.field, view.value, view.f, ''

    # FIXME uses native mongodb collection
    # FIXME remember to disable PromisifyAll for mongodb
    Filters.collection.insert view

  .then ( response )->
    socket_cb response
    debug 'view::create inserted:', response.result
    SocketIO.io.emit 'views::updated'

  .catch Errors.BadRequestError, Errors.ValidationError, ValidationError, ( err )->
    logger.error 'View create failed', data.view, err.message, err
    socket.ev.error err.message


# Update
SocketIO.route 'view::update', ( socket, data, socket_cb )->
  debug 'view::update', socket.id, data
  data.view.user = socket.ev.user()

  verify_socket_data data, socket.ev.user()
  .then ( view )->
    logger.info 'Update view for [%s] name [%s] [%j] [%s] [%s]',
      view.user, view.name, view.f, view.field, view.value,  ''
    Filters.update_data view

  .then ( response )->
    debug 'update response', response
    socket_cb response
    SocketIO.io.emit 'views::updated'

  .catch Errors.ValidationError, ValidationError, ( err )->
    logger.error 'View update failed', data, err.message, err
    socket.ev.error err.message

  .finally ->
    debug 'wtf?'


# Delete
SocketIO.route 'view::delete', ( socket, data, socket_cb )->
  logger.info 'Deleting view', socket.id, data
  
  Filters.find _id: data._id
  .then ( response ) ->
    if response.length > 0 and response[0].default
      throw "Cannot delete default view"

    return Filters.deleteOne _id: data._id
    .then ( deletion_response )->
      deleted_label = response?[0]?.name or data._id
      socket.ev.info "Deleted view #{deleted_label}"
      socket_cb response
      SocketIO.io.emit 'views::updated'
    .catch Errors.ValidationError, ValidationError, ( err )->
      logger.error 'View delete failed', data, err.message, err
      socket.ev.exception err.name, err.message


# Set a default
SocketIO.route 'view::set_default', ( socket, id, socket_cb )->
  logger.info 'Setting default view', socket.id, socket.ev.user(), id

  Filters.set_default socket.ev.user(), id
  .then ( response )->
    socket.ev.info "Default view set"
    socket_cb "Default view set"
    SocketIO.io.emit 'views::updated'
    
  .catch Errors.ValidationError, ( err )->
    logger.error 'View set_default failed', data, err.message, err
    socket.ev.exception err.name, err.message
