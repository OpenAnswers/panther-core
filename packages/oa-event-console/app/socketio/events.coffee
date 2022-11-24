# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:events')

# node modules
util              = require 'util'

# npm modules
Promise           = require 'bluebird'
moment            = require 'moment'

# OA modules
Errors            = require '../../lib/errors'
{ SocketIO }      = require '../../lib/socketio'
{ Mongoose }      = require '../../lib/mongoose'
{ Activities }    = require '../../lib/activities'

{ Severity }      = require '../model/severity'
{ EventArchive }  = require '../model/event_archive'
{ User }          = require '../model/user'
{ Filters }       = require '../model/filters'

{ server_event }  = require "../../lib/eventemitter"
{ _ }             = require 'oa-helpers'

config            = require('../../lib/config').get_instance()

#{ promisedFilterSummary} = require '../../lib/queries'
{promisedFilterSummary} = require '../../lib/queries'

# ###### apply_updates_db( type, ids, set_fields, push_fields, user )

# Promise to apply DB updates for events

apply_updates_db = ( type, ids, set_fields, push_fields = {}, user = 'system' )->
  new Promise ( resolve, reject )->

    object_ids = Mongoose.recids_to_objectid ids

    query = _id: $in: object_ids
    updates =
      $set: set_fields
      $push:
        history:
          timestamp: new Date()
          user:      user
          message:   Activities.type_to_history_text( type, set_fields )

    if push_fields.notes
      updates.$push.notes = push_fields.notes
    
    debug "UPDATING, ", updates

    Mongoose.alerts.updateMany( query, updates, multi: true )
    .then ( update )->
      debug type, ids, update.result, type

      server_event.emit "oa::events::updated",
        type: type
        ids: ids
        source: 'apply_updates_db'

      resolve update.result

    .catch ( err )->
      err.message = "Failed to #{type} ids #{object_ids.join(',')}: " + err.message
      logger.error 'Update failed', type, err, err.stack
      reject err


# ###### apply_socket_updates_db( type, ids, set_fields, socket, socket_cb )

# Apply DB updates from a socket connection

apply_socket_updates_db = ( type, ids, set_fields, push_fields, socket, socket_cb )->
  evs = socket.ev
  new Promise ( resolve, reject )->

    apply_updates_db( type, ids, set_fields, push_fields, evs.user() )
    .then ( result )->
      debug 'apply_socket_updates_db', socket.id, type, ids, result, type

      logger.info "socket [%s] user [%s] set [%s] on ids [%s]",
        socket.id, evs.user(), type, ids, ''

      # socket.ev.debug "#{type} ids done",
      #   rows: result.n
      
      if _.isFunction(socket_cb)
        socket_cb null, result.n

      metadata = _.clone set_fields
      metadata.ids = ids
      metadata.new_owner = metadata.owner

      # Resolve the promise now we are done
      resolve result

      Activities.store_event type, evs.user(), metadata

    .catch Errors.ValidationError, ( err )->
      logger.error "apply_socket_updates_db validation error", err, err.stack
      evs.error err.message

    .catch ( err )->
      reject err



# ####### copy_events( tag, expire_hours, ids )

# Copy some events to the event archive, adding an expire date

#     copy_events 'something', 8, object_ids

copy_events_async = ( tag, expire_hours, ids )->
  new Promise ( resolve, reject )->
    coll = EventArchive.collection
    expire_date = moment().add( expire_hours, 'hours' ).toDate()

    batch_copy = coll.initializeUnorderedBulkOp()

    # Struggled to get promisifyAll on the .execute() function
    #batch_ex = Promise.promisify batch_copy.execute { context: batch_copy }

    query = _id: $in: ids

    Mongoose.alerts.find( query ).toArray()
    .then ( docs )->
      debug 'docs to copy before removal', docs.length

      for doc in docs
        new_doc =
          expire: expire_date
          operation: tag
          event: doc
        batch_copy.insert new_doc
        logger.info "Copying event [%s] - identifier: [%s]", tag, doc.identifier

      return resolve docs.length if docs.length is 0
      batch_copy.execute()

    .then ( results )->
      debug "copy_events_async results:", results
      resolve results

    .catch ( err )->
      reject err


# Promise to find a filter for a socket
# This (and things like it) need a home. controllers?
find_filter_from_socket_Async = ( socket )->
  new Promise ( resolve, reject )->
    debug 'evs', socket.ev?.id
    evs = socket.ev

    unless evs
      return reject new Errors.SocketError('No ev property attached to socket')

    unless evs.user()
      return reject new Errors.SocketError('No user attached to socket')

    # If we already have a filter on this socket, no need to find the default
    if filter = evs.event_filter_running()
      return resolve(filter)

    debug 'find_socket_filter running query for default filter'

    Filters.findOne( user: evs.user(), default: true )
    .then ( doc )->
      unless doc?
        logger.error "No default filter found for user [%s] using {}", evs.user()
        resolve evs.event_filter({})
      else
        resolve evs.event_filter doc.f
    .catch ( err )->
      return reject(err)
      
    .finally ->
      debug 'find_socket_filter finally'



# ###### events::severities

# Get the the counter for the severities of all events
# Used in the dashboard for counts and graphs
# This is an expensive query, so should be cached every so often
# and the counts updated (and possibly steamed out) via the incoming
# events to the event_server process



SocketIO.route_return 'events::severities', ( socket, data )->
  groups = config.rules.set.groups.store_order

  promisedFilterSummary()
  .then ( results )->
    # results: {sev_counts: [], sev_counts_group: [], severities: []}
    results.groups = groups
    logger.debug 'sending out sev results', results.sev_counts, results.sev_counts_group
    socket.emit 'events::severities', results
    results



# ###### events::clear

# This clears events from the console by setting their severity to 0
# Usually triggered by a user in the context menu or via keypress

SocketIO.route 'events::clear', ( socket, data, client_cb )->
  debug 'events::clear msg', data.ids
  evs = socket.ev
  ids = data.ids
  
  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No .ids on message"

  unless _.isArray ids
    debug 'events::clear - ids not array', ids
    return socket.ev.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  unless ids.length > 0
    return socket.ev.error "No ids to clear"

  object_ids = Mongoose.recids_to_objectid ids

  # Setup the queries
  set_fields =
    severity: 0
    state_change: new Date()

  # Now promise through the updates
  copy_events_async 'clear', config.app.archive_time.clear, object_ids
  .then ( batch_result )->
    logger.info 'copied clear events [%j]: %s', batch_result, ids

    apply_socket_updates_db 'clear',
        ids,
        set_fields,
        {},
        socket,
        client_cb

  .then ( update )->
    logger.info socket.id, 'cleared ids [%s] [%j]', ids, update.result

  .catch ( err )->
    err.message = "Failed to clear ids [#{ids.join(',')}] " + err.message
    logger.error 'Severitize failed', err, err.stack
    server_event.emit 'error', err

# ###### events::severity

# This changes the severity of an event

SocketIO.route 'events::severity', ( socket, data, client_cb )->
  debug 'events::severity msg', data.ids
  evs = socket.ev
  ids = data.ids

  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No ids on message"

  unless _.isArray ids
    debug 'events::clear - ids not array', ids
    return socket.ev.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  unless data.severity?
    throw new Errors.ValidateError "No severity on message payload"

  # check the severity specified is valid
  Severity.findOne( value: parseInt( data.severity ) )
  .then ( doc )->
    unless doc
      throw Errors.QueryError "Severity value not found [#{data.severity}]"

    set_fields = 
      severity: parseInt(data.severity)
      state_change: new Date()

    apply_socket_updates_db 'severity',
      ids
      set_fields,
      {},
      socket,
      client_cb

    .then ( update )->
      logger.info socket.id, 'severity ids [%j]', update.result
    
  .catch ( err )->
    id_str = ids.join ','
    err.message = "Failed to set the severity for ids #{id_str}: " + err.message
    logger.error 'Severity failed', err, err.stack
    if client_cb
      client_cb err
    throw err



SocketIO.route_return 'events::delete::all', (socket, data, client_cb )->
  debug 'events::delete::all'
  evs = socket.ev

  # protect this end point
  if evs.socket.request.user.group != "admin"
    logger.error "Permision denied delete::all - user is not an admin"
    throw new Errors.RequestError "Permision Denied"

  Mongoose.alerts.deleteMany {} 
  .then ( removed )->
    logger.info "User [%s] deleted all events", evs.user(), removed.result.n

    Activities.store_event 'delete-all',
      evs.user(),
      ids: removed.result.n

    server_event.emit 'events::deleted::all',
      rows: removed.result.n
      source: 'socketio/events'
    
    response = 
      status: 'ok'
      rows: removed.result.n

    response
  .catch (err)->
    logger.error "Deleting all failed ", err


# ###### events::delete

# This deletes events from the console
# Usually triggered by a user in the context menu or via keypress

SocketIO.route 'events::delete', ( socket, data, client_cb )->
  debug 'events::delete msg', data.ids
  evs = socket.ev
  ids = data.ids
  
  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No ids on message"

  unless _.isArray ids
    debug 'events::clear - ids not array', ids
    return socket.ev.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  unless ids.length > 0
    return socket.ev.error "No ids to deletes"

  object_ids = Mongoose.recids_to_objectid ids
  #copy_events 'delete', 8, object_ids
  
  # Setup a query
  remove_query = _id: $in: object_ids

  # Then run it
  # This should move the document into a "deleted" collection
  # Then this can be monitored for deletes and cleared up on a
  # custom TTL
  copy_events_async 'delete', config.app.archive_time.delete, object_ids
  .then ( batch_result )->
    logger.info 'copied delete events [%j]: %s', batch_result, ids
    
    Mongoose.alerts.removeMany( remove_query )

  .then ( remove )->
    logger.info socket.id, 'deleted ids', remove.result.n
    
    socket.emit 'message',
      message: 'deleted ids'
      rows: remove.result.n
    
    server_event.emit 'oa::events::deleted',
      ids: ids
      source: 'socketio/events'

    if client_cb
      client_cb null, remove.result.n
    
    Activities.store_event 'delete',
      evs.user(),
      ids: ids


  .catch ( err )->
    err.message = "Failed to remove ids #{object_ids.join(',')}: " + err.message
    logger.error 'Deletes failed', err
    server_event.emit 'error', err


# ack with note

SocketIO.route 'events::acknowledge::note', ( socket, data, client_cb )->
  debug 'events::acknowledge::note msg', data.ids
  evs = socket.ev
  ids = data.ids
  
  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No ids on message"

  unless _.isArray ids
    debug 'events::clear - ids not array', ids
    return evs.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  # Setup the queries
  set_fields =
    acknowledged: true
    owner:        evs.user()
    state_change: new Date()

  if _.isString(data.external_id) and data.external_id != ""
    set_fields.external_id = data.external_id

  push_fields = {}
  if _.isString data.message
    push_fields =
      notes:
        timestamp: new Date()
        user:      evs.user()
        message:   data.message


  # Now promise through the updates
  apply_socket_updates_db 'acknowledge',
      ids,
      set_fields,
      push_fields,
      socket,
      client_cb

  .then ( update )->
    logger.info socket.id, 'acknowledged ids [%j]', update.result

  .catch ( err )->
    id_str = ids.join ','
    err.message = "Failed to acknowledge the ids #{id_str}: " + err.message
    logger.error 'Acknowledge failed', err, err.stack
    if client_cb
      client_cb err
    throw err


# ###### events::external_id

SocketIO.route 'events::external_id', ( socket, data, client_cb )->
  debug 'events::external_id msg', data.ids
  evs = socket.ev
  ids = data.ids

  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No ids on message"

  unless _.isArray ids
    debug 'events::external_id - ids not array', ids
    return evs.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  unless data.external_id
    debug 'events::external_id - no external_id in message payload', ids
    return evs.exception "SocketMsgError",
      "The event external_id was not supplied"

  # Setup the queries
  set_fields =
    external_id:  data.external_id
    state_change: new Date()

  # Now promise through the updates
  apply_socket_updates_db 'external_id',
      ids,
      set_fields,
      {},
      socket,
      client_cb

  .then ( update )->
    logger.info socket.id, 'external_id [%j]', update.result

  .catch ( err )->
    id_str = ids.join ','
    err.message = "Failed to update the external_id for ids #{id_str}: " + err.message
    logger.error 'Update external_id failed', err, err.stack
    if client_cb
      client_cb err
    throw err


# ###### events::acknowledge

SocketIO.route 'events::acknowledge', ( socket, data, client_cb )->
  debug 'events::acknowledge msg', data.ids
  evs = socket.ev
  ids = data.ids
  
  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No ids on message"

  unless _.isArray ids
    debug 'events::clear - ids not array', ids
    return evs.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  # Setup the queries
  set_fields =
    acknowledged: true
    owner:        evs.user()
    state_change: new Date()

  # Now promise through the updates
  apply_socket_updates_db 'acknowledge',
      ids,
      set_fields,
      {},
      socket,
      client_cb

  .then ( update )->
    logger.info socket.id, 'acknowledged ids [%j]', update.result

  .catch ( err )->
    id_str = ids.join ','
    err.message = "Failed to acknowledge the ids #{id_str}: " + err.message
    logger.error 'Acknowledge failed', err, err.stack
    if client_cb
      client_cb err
    throw err



# ###### events::unacknowledge

SocketIO.route 'events::unacknowledge', ( socket, data, client_cb )->
  debug 'events::unacknowledge msg', data.ids
  evs = socket.ev
  ids = data.ids
  
  unless ids?
    return socket.ev.exception "SocketMsgError",
      "No ids on message"

  unless _.isArray ids
    return evs.exception "SocketMsgError",
      "The event ids were not an array [#{ids}]"

  # Setup the queries
  set_fields =
    acknowledged: false
    owner:        evs.user()
    state_change: new Date()

  # Now promise through the updates
  apply_socket_updates_db 'unacknowledge',
      ids,
      set_fields,
      {},
      socket,
      client_cb

  .then ( update )->
    logger.info socket.id, 'unacknowledged ids [%j]', update.result

  .catch ( err )->
    id_str = ids.join ','
    err.message = "Failed to unacknowledge the ids #{id_str}: " + err.message
    logger.error 'Unacknowledge failed', err, err.stack
    if client_cb
      client_cb err
    throw err


# ### events::read REPLACE POPULATE

# This is the acknowledge event event, normally generated by a client
# sending a socketio acknoledge message
SocketIO.route_return 'events::read', ( socket, msg, client_cb )->
  limit  = config.app.view_limit

  find_filter_from_socket_Async( socket )
  .then ( query )->

    fields = { notes: 0, history: 0, matches: 0 }

    # Return a new promise... and then
    Mongoose.alerts.find( query, fields )
      .sort( state_change: -1 )
      .limit( limit )
      .toArray()

  .then ( docs )->
    if docs.length >= limit
      socket.ev.warn "Limiting view to newest #{limit} events"

    if docs.length is 0
      logger.info 'Initial populate query found nada', docs
      socket.ev.info 'No events matched filter'

    msg =
      status: 'success'
      data: docs

  .catch Errors.QueryError, ( err )->
    logger.error "No filter. never mind"

  .catch Promise.OperationalError, ( err )->
    logger.error "Unable load filter, because: ", err.message

  .catch ( err )->
    throw err


# ### events::assign

# This is the acknowledge event event, normally generated by a client
# sending a socketio assign message
SocketIO.route_return 'events::assign', ( socket, msg, client_cb )->
  #return unless SocketIO.socket_check_ids msg
  unless msg
    throw new Errors.SocketMsgError "No message in socket payload"

  unless msg.ids
    throw new Errors.ValidationError "No ids in message payload"

  unless msg.user
    throw new Errors.ValidationError "No user on message payload"

  logger.info '%s Assigning ids [%s] to [%s]',
    socket.id, msg.ids, msg.user

  # Setup the query
  query = { username: msg.user }

  # Find the user then update the alerts
  User.findOne( query ).then ( doc )->
    unless doc?
      throw new Errors.ValidationError "Username does not exist [#{msg.user}]"

    set_fields =
      owner: msg.user
      state_change: new Date()

    # new promise
    apply_socket_updates_db 'assign',
      msg.ids,
      set_fields,
      {},
      socket,
      msg.cb

  .then ( result )->
    unless result.n and result.n > 0
      throw new Errors.QueryError "No events modified[#{msg.ids}]"
  
    msg =
      status: 'success'
      data:
        owner: msg.user
        ids: msg.ids
  .catch ( err )->
    err.message = "Failed to assign ids #{msg.ids.join(',')}: " + err.message
    logger.error 'Assign failed', err
    server_event.emit('error', err)



# ### event::occurrences
# ### @deprecated seems is no longer used

# Return the occurrences data for a single identifier.

server_event.on 'event::occurrences', ( socket, data, client_cb )->
  debug 'event::occurrences msg', data
  evs = socket.ev
  
  unless SocketIO.socket_check_msg(msg) and SocketIO.socket_check_data(msg)
    return false

  Mongoose.alerts.findOne _id: data.id 
  .then ( doc )->
    unless doc
      throw Errors.QueryError "Occurrence id not found [#{data.id}]"

    Mongoose.alertoccurences.findOne _id: doc.identifier 
  .then ( doc )->
    unless doc
      throw Errors.QueryError "Requested occurrences for identifer [#{data.identifier}] but it wasn't there"
    
    debug 'event::occurrences retrieved', doc, data.identifier
    client_cb null, doc if client_cb
    
      

  .catch ( QueryError, error )->
    evs.exception error
    client_db error

  .catch ( error )->
    evs.error 'QueryError', "There was a problem selecting event [#{id}]"
    throw error



# ### `event::detail`

# Return the full data for a single alert
# Seperated as we limit the 'view' data down to the required columns

SocketIO.route_return 'event::details', ( socket, msg, client_cb )->
  #return unless SocketIO.socket_check_ids msg
  unless msg
    throw new Errors.SocketMsgError "No message in socket payload"

  unless msg.id
    throw new Errors.ValidationError "No ids in message payload"

  unless id = Mongoose.recid_to_objectid_false msg.id
    throw new Errors.ValidationError "Invalid event id", msg.id

  Mongoose.alerts.findOne _id: id 
  .then ( doc )->
    unless doc
      throw new Errors.QueryError "Requested id [#{id}] wasn't there"
    debug 'events::detail retrieved id [%s]', id, doc
    Mongoose.alertoccurrences.findOne identifier: doc.identifier
    .then ( occurrence )->
      if occurrence
        doc.occurrences = occurrence.current
      doc


# ### `event::raw_stream`

# Client joining the activities stream

SocketIO.route_return 'events::join_raw_stream', ( socket, msg, client_cb )->
  socket.join 'raw_stream'
  logger.info '[%s] [%s] joined the raw_stream of events', socket.id, socket.ev.user()
  
  # Setup the mongoose tail and callback
  Mongoose.event_raw_stream ( err, data )->
    SocketIO.io.to('raw_stream').emit('events::raw_stream', data)

  return message: 'Joined raw_stream'
