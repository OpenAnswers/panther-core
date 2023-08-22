
#
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # MongoPoll

# A class to manage polling of a db for a filter/view.
# It maintains only instance per filter/view via a hash of the filter object


# Logging module
{ logger, debug}  = require('oa-logging')('oa:event:mongopoll')

# npm modules
Promise           = require 'bluebird'

# OA modules
{ SocketIO }      = require './socketio'
{ timer
  _
  objhash }       = require 'oa-helpers'
{ server_event }  = require './eventemitter'

config            = require('./config').get_instance()

#{ promiseFilterSummary } = require('../lib/queries')



class MongoPollBase
  
  constructor: ()->

  mongopoll_base_init: ( options = {} )->
    
    debug 'new', options

    # Store SocketIO after circular dependencies have been resolved
    @SocketIO = require('./socketio').SocketIO

    # #### @sleep
    # The gap between polls
    @sleep  = options.sleep ? config.mongodb.timer ? 30000


    # #### @emitter
    # The function to run on success
    self =  @
    #@emitter = options.emitter

    unless _.isFunction @emitter #or @promise _.isFunction
      logger.error 'MongoPollBase requires an emitter function'
      throw new Error 'MongoPollBase requires an emitter function'

    unless _.isFunction @promise
      logger.error 'MongoPollBase requires a promise function'
      throw new Error 'MongoPollBase requires a promise function'

    unless @pollerIdentifier
      logger.error 'MongoPollBase requires an identifier'
      throw new Error 'MongoPoll requires an identifier'

 
    # #### @last_query_value
    # The last index to be returned
    # This is where the next poll will pick up from
    @last_query_value = new Date()

    # #### @debug
    # Create a debug for this instance, so we don't need to include
    # the filterhash/roomid everywhere
    @debug  = require('debug')("oa:event:mongopoll:base")

    logger.info 'Created poller on [%s] every [%s]ms',
      @index, @sleep

    # Start it up
    @start()


  # ### stop()
  # Stop the poller form running
  stop: ->
    # need some way of signalling mongopollers I am gone
    @running = false


  # ### start()
  # Kick off a poll
  start: ->
    if @running
      logger.debug 'poll already running'
      return true

    promise = @promise()
    @running = true
    promise





# ### MongoPoll

# This where updates are pulled from the database
# and pushed out to the clients for a view/filter
# We have an instance of MongoPoll for each view/filter
# currently in use.

# Multiple users/sockets share a single MongoPoll by joing
# a room named via a sha256 checksum of the view/filter object

class MongoPoll extends MongoPollBase
  
  constructor: ( options = {} )->
    
    debug 'new', options

    # #### @filter
    # This is filter to poll for
    unless options.filter?
      logger.error 'No filter for new poll'
      throw new Error 'No filter for new poll'
    super()
    @filter = options.filter

    # #### @index
    # The mongo index field used to track each poll query
    # Greater than last query will grab all previous
    # This field should be indexed in the db!!
    @index  = options.index ? 'state_change'

  
    # #### @filter_hash
    # And the filter hash for the filter, which may be
    # expensive to generate, so save it
    @filter_hash = objhash @filter
    @pollerIdentifier = @filter_hash

    # #### @emitter
    # The function to run on success
    self =  @
    default_emitter  = ( docs )->
      self.debug 'emitting deltas', docs
      self.SocketIO.io.to(self.filter_hash).emit 'deltas',
        updates: docs
        inserts: []

    @emitter = options.emitter ? default_emitter
    @mongopoll_base_init options


  # ### promise()
  # This is a recursive promise. once it had delayed and the db_find is complete
  # it will call itself again, if anyone is still listening to this filter. 
  promise: ->
    debug 'Scheduling db_find promise', @pollerIdentifier, @sleep
    
    # Class access in the promise
    self = @

    Promise.delay( self.sleep ).then ->
      # Convenient place to tell clients which ids should be in their view
      # This is for handling events that have been altered without emitting
      # a server side event. e.g. backend triggers or manual deletion from DB
      self.emit_current_ids()

      # find and emit events for filtered room to client.
      self.db_find()

    .then ( res ) ->
      if self.SocketIO.room_has_members self.pollerIdentifier
        # Run this delay/query again
        self.promise()
      else
        #logger.info "Ceasing poll for [%j] with hash [%s] as it's so lonely",
        #  self.filter, self.filter_hash
        logger.info "Ceasing poll for [%s] with hash [%s] as it's so lonely",
          self.filter
          self.pollerIdentifier
        self.stop()

      true

    # .catch (err) ->
    #   self.stop()
    #   logger.error err
    #   throw err


  # ### db_find( @filter, @emitter )
  # Find updates for a filter, repeatedly
  # Should be setup on a room when a client sets a filter, or on connection
  # for the users default filter
  db_find: ( filter = @filter, emitter = @emitter )->
    # I don't know how coffeescript fat arrows go in the depths of promises
    self = @
    @debug 'db_find running for filter', filter
    throw new Error 'No filter for db_find' unless filter?
    
    # Create an object to hold our query and get the latest updates
    self.get_since_async filter, self.index, self.last_query_value
    .then ( docs ) ->

      if docs? and docs.length > 0
        #js_docs = JSON.stringify docs
        # Get the first `index` fields value.
        # This can cause problems if you have a lot of data going into the DB
        # and your filter doesn't update often and your index field isn't indexed.
        last_query_value = _.first(docs)[self.index]
        throw new Error("No field on document [#{self.index}]") unless last_query_value?

        self.debug 'sending [%s] docs for [%j]', docs.length, filter
        logger.debug 'Got [%s] doc updates from db, sending to emitter', docs.length

        # Now we are happy, save the last query and emit the data
        self.last_query_value = last_query_value
        emitter docs
        
      else
        self.debug 'MongoPoll found nothing for filter - %j', self.filter

    .catch ( error )->
      # Not sure if a query error should crash or just error.
      # Depend if they are db connection related or specifically
      # about the query.
      # the db does have an 'error' event which will crash it
      self.stop()
      logger.error err
      throw error


  # ###### get_since_async( filter, index, last )
  # Run the query getting anything newer than a previous `index`
  get_since_async: ( filter, index, last )->
    
    query = _.clone filter
    query[index] = { '$gt': last }
    
    sort = {}
    sort[index] = -1

    filter =
      history: false
      notes: false
      matches: false
    
    require('./mongoose').Mongoose.alerts
      .find query, filter
      .sort sort
      .toArray()


  # ###### emit_current_ids()
  # We need some way to track changes that aren't in a users view/filter.
  # Deletes are one case. People moving an event out of the view/filter to another.
  # Currently this is a bit of a hack, but we send out all the ID's that should be 
  # in a filter and the client can check that list against it's local view
  emit_current_ids: ( options = {} )->
    self = @
    filter = @filter

    # The all filter ({}) doesn't need a list of ids
    # This is the sha hash for {}
    # If the objhash implementation changed... this would change!
    if @filter_hash is "bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f" and
        options.type isnt 'clear'
      return

    p = require('./mongoose').Mongoose.alerts
      .find filter, { _id: 1 }
      .toArray()
    debug "Finder returned"

    p.then ( ids ) ->
      ids_obj = {}
      for doc in ids
        ids_obj[doc['_id']] = 1
      debug 'emitting current ids for filter [%s]', self.filter_hash, ids_obj

      # Emit the ids to the view/filter room
      self.SocketIO.io.to(self.filter_hash).emit 'events::ids',
        ids: ids_obj

      return ids_obj

    .catch ( error )->
      throw error

# FIXME
# this needs a refactor to reuse the common parts of MongoPoll

class MongoSummaryPoll extends MongoPollBase

  constructor: ( options = {} )->
    super()
    @filter_hash = objhash options
    @pollerIdentifier = @filter_hash

    # #### @emitter
    # The function to run on success
    self =  @
    default_emitter  = ( docs )->
      self.debug 'emitting summary', self.filter_hash, docs
      self.SocketIO.io.to("summary").emit 'events::severities', docs

    @emitter = options.emitter ? default_emitter
    @mongopoll_base_init options


  # ### promise()
  # This is a recursive promise. once it had delayed and the db_find is complete
  # it will call itself again, if anyone is still listening to this filter. 
  promise: ->
    debug 'Scheduling summary db_find promise', @filter_hash, @sleep
    
    # Class access in the promise
    self = @

    Promise.delay( self.sleep ).then ->
      self.db_find()

    .then ( res ) ->
      # Run this delay/query again
      self.promise()

      true

  db_find: ( emitter = @emitter )->
    { promisedFilterSummary } = require './queries'
    promisedFilterSummary()
    .then ( docs ) ->
      if docs
        docs.groups = config.rules.set.groups.store_order
        debug "Emitting summary DOCS"
        emitter docs

module.exports.MongoPoll = MongoPoll
module.exports.MongoSummaryPoll = MongoSummaryPoll