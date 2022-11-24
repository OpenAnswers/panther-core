#
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # Mongoose

# Manage the mongoose connection. Provide some helper functions

# ### Modules
# Logging
{ logger, debug}  = require('oa-logging')('oa:event:mongoose')

# Npm
mongoose          = require 'mongoose'
Promise           = require 'bluebird'

# OA
{ SocketIO }      = require './socketio'
config            = require('./config').get_instance()
{ timer
  _
  objhash }       = require 'oa-helpers'
{ server_event }  = require './eventemitter'



# ### Mongoose client

# Simple wrapper for including mongoose, attaching some data  and providing some
# helper functions


class Mongoose
  self = @
  @mongoose:  mongoose
  @db = @mongoose.connection
  @last_query_time: new Date
 
  # Connection Limits
  @connected: false
  @connect_limit: config.mongodb.max_connects
  @connect_count: 0

  # External collections, model controlled by event_server
  @alerts = @db.collection('alerts')
  @alertoccurrences = @db.collection('alertoccurrences')
  @event_rsyslog = @db.collection('event_rsyslog')
  @rulematches = @db.collection('rulematches')
  @inventory = @db.collection('inventories')
    
  # Emit errors
  @db.on 'error', (error) ->
    logger.error 'Mongoose error:', error.message, error.stack, error
    server_event.emit 'error', error

  @db.on 'disconnect', ()->
    logger.error 'Mongoose is disconnected from the mongo database'

  # Emit connect
  @db.once 'open', (cb) ->
    logger.info 'Mongoose is connected to the mongo database'
    server_event.emit 'mongodb::connect', "db connected", self.db

  # Play nice on exit
  process.on 'SIGINT', ->
    logger.info 'Closing mongoose connection'
    mongoose.connection.close ->
      logger.info 'Mongoose connection disconnected on sigint'
      process.exit 0


  # initial connect
  @connect: ( connect_cb ) ->
    self = @
    if @connected
      connect_cb null, @db
      return @db
    debug 'creating a mongoose connection', config.mongodb
    unless config.mongodb.uri
      if connect_cb
        return connect_cb("config.mongodb.uri is undefined")
      else
        throw new Error "config.mongodb.uri is undefined"

    @do_connect( connect_cb )
    @db

  @do_connect: ( connect_cb )->
    self = @
    @connect_count += 1
    if @connect_count >= @connect_limit
      server_event.emit 'fatal', "Too many connection attempts: #{self.connect_count}"
    debug 'DB ', @db;
    # https://mongoosejs.com/docs/5.x/docs/deprecations.html
    # used by :
    #   User.update_data -> User.findByIdAndUpdate()
    @db.openUri config.mongodb.uri, {useCreateIndex: true, useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true}
    .then (onFulFill, onRejected)->
     if onRejected
        logger.error "connection rejected", onRejected
        debug 'connect err!', err, config.mongodb.uri
        logger.warn "Error with initial connection. Retrying[#{self.connect_count}] in 2s", err.stack
        setTimeout ->
          self.do_connect()
        , 2000
        return
      if onFulFill
        logger.info "connection open cb", config.mongodb.uri
        self.connect_count = 0;
        self.connected = true
        connect_cb null, self.db if connect_cb
        self.db
      
  # ###### @.recids_to_objectid( ids )

  # Create mongoose object ids from id strings
  @recids_to_objectid = (ids) ->
    for id in ids
      @recid_to_objectid id


  # ###### @.recid_to_objectid( ids )

  # Create a mongoose object id from an id string
  @recid_to_objectid = (id) ->
    mongoose.Types.ObjectId id


  # ###### @.recid_to_objectid_false( ids )

  # Catch all objectid errors, return false
  @recid_to_objectid_false = (id) ->
    unless id?
      return false

    unless _.isString id
      return false
  
    unless /^[0-9a-z]{24}$/i.test id
      return false

    mongoose.Types.ObjectId id

  @recids_to_objectids_false = (ids)->
    oids = []
    for id in ids
      oid = @recid_to_objectid_false id
      oids.push oid if oid != false
    oids

  # ###### @.recid_to_objectid_safe( ids )

  # Catch all objectid errors, throwing nice info on where you went wrong
  @recid_to_objectid_safe = (id) ->
    unless id
      throw new Errors "No event id on message"

    unless _.isString id
      throw new Error "Event id not a string [#{typeof id}] [#{id}]"
  
    unless /^[0-9a-z]{24}$/i.test id
      throw new Error "Invalid event id on msg [#{id}]"

    mongoose.Types.ObjectId id


  # Allow something to run on the stream of events in the mongodb
  # capped collection.
  #@event_raw_stream: ( cb )->
  @event_raw_stream: ->
    filter = {}

    if @raw_stream
      return @raw_stream

    @raw_stream = @event_rsyslog
      .find filter, { tailable: true, awaitData: true, noCursorTimeout: true, numberOfRetries: Number.MAX_VALUE}
      .comment 'event_raw_stream'
            
    # Send the data out
    @raw_stream.on 'data', ( doc )->
      debug 'raw_stream', document: doc
      SocketIO.io.to('raw_stream').emit('events::raw_stream', document: doc)
      #cb null, document: doc

    # Send the data out
    @raw_stream.on 'error', ( error )->
      debug 'raw_stream', error: error
      SocketIO.io.to('raw_stream').emit('events::raw_stream', error: error)
      #cb null, document: doc

    # Send the data out
    @raw_stream.once 'end', ( doc )->
      debug 'raw_stream finished'
      SocketIO.io.to('raw_stream').emit('events::raw_stream', message: 'finished')
      #cb null, message: 'finished'

    @raw_stream


module.exports.Mongoose = Mongoose
