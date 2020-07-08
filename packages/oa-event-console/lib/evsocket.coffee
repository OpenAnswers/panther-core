
#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # EvSocket

# Quick accessors for the data we want to store/use on a socket
# for our application
# It looks like socketio 0.x had an inbuilt `get` method but
# 1.x remove this feature
# This is stored on the socket as `socket.ev`
# It's also returned from the connection tracking in SocketIO

# This also contains the messaging interface to the "notifications"
# in the UI.


# logging modules
{ logger, debug } = require('oa-logging')('oa:event:evsocket')

# npm modules
# _                 = require 'lodash'

# OA modules
{ server_event }  = require './eventemitter'
{ MongoPollers }  = require './mongopollers'

{ objhash, _ }    = require 'oa-helpers'
config            = require('./config').get_instance()



# ## EvSocket

class EvSocket

  constructor: ( @socket, options = {} ) ->

    # #### @id
    # The socketio id
    @id = @socket.id

    if options.event_filter
      @event_filter options.event_filter

    # Attach mongopoller after circular dependencies are resolved
    @MongoPollers = require('./mongopollers').MongoPollers

    @_event_filter = {}
    @_event_group = 'All'
    @ping_timer_id = null;


  init: ->
    unless @ping_timer_id 
      debug "Starting server -> client ping [%s]", @id
      @ping()
  
  shutdown: ->
    debug "Removing server -> client ping [%s]", @id
    clearInterval @ping_timer_id

  ping: ->
    self = @
    @ping_timer_id = setInterval ()->
      debug "Emitting server -> client ping [%s]", self.id
      self.socket.emit 'ping', {}
    ,29000


  # ### user()
  # return the passport authed socket username
  user: ->
    unless @socket.request?.user
      throw new Errors.SocketError 'No user structure on socket.request'
    @socket.request.user.username


  # ###### rooms()
  # return the socket object of rooms, contianing member socket ids
  rooms: ->
    unless @socket.adapter?.rooms
      throw new Errors.SocketError 'No rooms structure on socket.adapter'
    @socket.adapter.rooms


  # ###### group_filter( group )
  # Get/Set a group filter.. and names
  event_group: ( event_group )->
    if event_group?
      @_event_group = event_group
      # handle when no group was specified
      @_event_group = '' if event_group is 'No Group'
      @filter_room( true )
      @_event_group
    else
      @_event_group


  # ###### event_filter( mongo_filter )
  # Get/Set an event filter.. and names
  event_filter: ( event_filter )->
    if event_filter?
      @_event_filter = event_filter
      @filter_room( true )
      @_event_filter
    else
      @_event_filter


  # ###### event_severity( severity )
  # Get/Set an event filter.. and names
  event_severity: ( event_severity )->
    if event_severity?
      @_event_severity = event_severity
      @filter_room( true )
      @_event_severity
    else
      @_event_severity

  # ### event_filter_running()
  # Return the running event filter
  event_filter_running: () ->
    @_event_filter_running


  # ### filter_room()
  # Manage the filter room for the current socket
  # The filter and group currently set are taken into account when
  # building the hash that identifies the room.
  #
  # The hash for the room name is built from the eventual mongo filter object
  #
  # The `objhash()` implementation is in oa-helpers
  #
  # The filter_room is left so it can possibly be cleaned up
  #
  filter_room: ( regen )->
    if regen or not @_filter_room?
      # Create the new hash of a filter, and group
      @_event_filter_running = _.cloneDeep @_event_filter

      # FIXME needs a "_none"
      if @_event_group isnt 'All' and @_event_group isnt undefined
        debug 'merging group to filter [%s] [%j]', @_event_group, @_event_filter
        _.merge @_event_filter_running, { group: @_event_group }

      if @_event_severity isnt 'All' and @_event_severity isnt undefined
        debug 'merging sev to filter [%s] [%j]', @_event_severity, @_event_filter
        _.merge @_event_filter_running, { severity: @_event_severity }

      old_filter_room = @_filter_room
      @_filter_room = objhash @_event_filter_running
      
      self = @
      # callback to join the correct socketio room and start the poller
      joinAndStart = () ->
        # join the new room
        debug 'joining filter room [%s] [%j]', self._filter_room, self._event_filter_running
        self.socket.join self._filter_room, () ->
          # Get a poll on the room, or create a new one
          self.MongoPollers.fetch_id_and_start self._filter_room,
            filter: self._event_filter_running
      
      # leave the old room if we were in one
      if old_filter_room?
        debug 'leaving filter room [%s]', @_filter_room
        # asynchronous call so requires 'joinAndStart' callback
        @socket.leave old_filter_room, joinAndStart
      else
        joinAndStart()

    else
      @_filter_room?


  # ### message( type, msg, timeout, data )
  # Send a message to a socket client
  message:  ( type, msg, timeout = 10, data = undefined )->
    @socket.emit 'message',
      type:     type
      message:  msg
      timeout:  timeout
      data:     data

  # ### success( message, timeout, data )
  # Send a success message to a socket client
  success: ( msg, timeout = 10, data = undefined )->
    @message 'Success', msg, timeout, data

  # ### info( message, timeout, data )
  # Send a info message to a socket client
  info: ( msg, timeout = 10, data = undefined )->
    logger.info @id, @user(), 'client', msg
    @message 'Info', msg, timeout, data

  # ### info_title( message, timeout, data )
  # Send a info message to a socket client
  info_title: ( title, msg, timeout = 10, data = undefined )->
    logger.info @id, @user(), 'client', msg
    @message title, msg, timeout, data

  # ### warn( message, timeout, data )
  # Send a warn message to a socket client
  warn: ( msg, timeout = 10, data = undefined )->
    logger.warn @id, @user(), 'client', msg
    @message 'Warning', msg, timeout, data

  # ### error( message, timeout, data )
  # Send an error message to a socket client
  error: ( msg, timeout = 10, data = undefined )->
    logger.warn @id, @user(), 'client', msg
    @message 'Error', msg, timeout, data

  # ### error( message, timeout, data )
  # Send an info message to a socket client, tag it with debug
  debug: ( msg, timeout = 10, data = undefined )->
    msg = "DEBUG: #{msg}"
    logger.debug @id, @user(), 'client', msg
    @message 'Info', msg, timeout, data

  # ### error( message, timeout, data )
  # Send a copy of an exception to a socket client
  exception: ( type, msg, timeout = 0, data = undefined )->
    logger.error msg, type
    @socket.emit 'message',
      error: type.toString()
      message: msg
      timeout: timeout
      data: data


module.exports.EvSocket = EvSocket
