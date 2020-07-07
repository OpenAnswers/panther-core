
# ### MongoPollers

# A class to manage polling of a db for a filter, once per filter


# Logging module
{ logger, debug}  = require('oa-logging')('oa:event:mongopollers')

# OA modules
{ MongoPoll, MongoSummaryPoll } = require './mongopoll'
{ _
  objhash }       = require 'oa-helpers'
{ server_event }  = require './eventemitter'
Promise           = require 'bluebird'

config            = require('./config').get_instance()


# ### MongoPollers

# MongoPollers stores a set of MongoPoll by the hash of the mongo
# "filter" object. So for any hash, you only have one MongoPoll

# Exported via coffeescripts iffe "this"


class @BaseMongoPollers

  @instances: {}
  @pollImpl: undefined

  @add: ( options )->
    debug 'add', options
    poll = new @pollImpl options
    @instances[poll.filter_hash] = poll


  # ## By filter
  
  @get: ( filter )->
    debug 'get', filter
    filter_hash = objhash filter
    @get_id filter_hash

  @fetch: ( filter, options = {} )->
    debug 'fetch', filter
    options.filter = filter unless options.filter?
    filter_hash = objhash filter
    @fetch_id filter_hash, options

  @delete: ( filter )->
    debug 'delete', filter
    filter_hash = objhash filter
    delete_id filter_hash


  # ## By filter_hash

  @get_id: ( filter_hash )->
    debug 'get_id', filter_hash
    @instances[filter_hash] ? false

  @fetch_id: ( filter_hash, options = {} )->
    debug 'fetch_id', filter_hash, @instances[filter_hash]?
    @instances[filter_hash] ? @add options

  @delete_id: ( filter_hash )->
    debug 'delete_id', filter_hash
    if @instances[filter_hash]?
      @instances[filter_hash].stop()
      delete @instances[filter_hash]
      true
    else
      false

  @fetch_id_and_start: ( filter_hash, options = {} )->
    poll = @fetch_id filter_hash, options
    poll.start()
    poll


  # ###### emit_current_ids()
  # We need some way to track changes that aren't in a users view/filter.
  # Deletes are one case. People moving an event out of their current
  # view/filter is another.
  @emit_current_ids: ( options = {} )->
    { type } = options
    debug 'emitting current ids for all filters'

    arr = _.toArray( @instances )
    
    finalPromise = Promise.map arr, (instance)->
      debug "sending ids to filter [%s] [%j]", instance.pollerIdentifier, instance.filter
      return instance.emit_current_ids(options)
    finalPromise.then (finalResult)->
      return true

    #for id, instance of @instances
    #  debug "sending ids to filter [%s] [%j]", instance.filter_hash, instance.filter
    #  instance.emit_current_ids(options)
    #return

# class singletons, no constructors
class @MongoPollers extends @BaseMongoPollers
  @instances = {}
  @pollImpl = MongoPoll

class @MongoSummaryPollers extends @BaseMongoPollers
  @instances = {}
  @pollImpl = MongoSummaryPoll
