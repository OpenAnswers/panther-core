# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# Logging module
{logger, debug}   = require('oa-logging')('oa:event:socketio:console')

# npm modules
moment            = require 'moment'

# oa modules
{ SocketIO }      = require '../../lib/socketio'
{ Errors }        = require '../../lib/errors'
{ Mongoose }      = require '../../lib/mongoose'
{ Filters }       = require '../model/filters'
{ Severity }      = require '../model/severity'
{ _ }             = require 'oa-helpers'
config            = require('../../lib/config').get_instance()



# ###### console::set_filter

SocketIO.route 'console::set_view', ( socket, data, client_cb ) ->

  logger.info socket.id, socket.ev.user(), 'setting their filter to', data.id
  evs = socket.ev

  unless id = Mongoose.recid_to_objectid_false data.id
    evs.warn 'Filter id not valid', id
    return false

  Filters.findOneAsync( user: evs.user(), _id: id )
  .then ( doc ) ->
    unless doc?
      evs.warn "No default filter found, using all"
      evs.event_filter {}
      client_cb() if _.isFunction client_cb
    else
      if _.isArray doc.f
        logger.warn 'Filter id [%s] is an array, fixing', data.id
        evs.event_filter {}
      else
        evs.event_filter doc.f
      client_cb() if _.isFunction client_cb

  .catch ( err ) ->
    throw err



# ###### console::set_group

SocketIO.route 'console::set_group', ( socket, data, client_cb ) ->

  logger.info socket.id, socket.ev.user(), 'Setting their group to', data.group
  evs = socket.ev

  if config.rules.set.groups.has_group data.group
    debug 'evs group_filter', data.group
    evs.event_group data.group
    client_cb( null, data ) if _.isFunction client_cb
  else
    group_name = 'All'
    if data.group == 'No Group'
      group_name = data.group
    else
      evs.warn "Group not valid [#{data.group}] setting to [All]" unless data.group is 'All'

    debug 'set_group group_filter', group_name
    evs.event_group group_name
    debug 'set_group callback', client_cb
    client_cb() if _.isFunction client_cb



# ###### console::set_severity

SocketIO.route 'console::set_severity', ( socket, data, client_cb ) ->

  logger.info socket.id, socket.ev.user(), 'Setting their severity to', data.severity
  evs = socket.ev

  if data.severity is 'All'
    evs.event_severity 'All'
    client_cb() if _.isFunction client_cb
    return

  if _.isNumber(data.severity.match) or data.severity.match(/^\d+$/)
    query = { value: data.severity }
  else
    query = { label: data.severity }

  Severity.findOneAsync query
  .then ( doc ) ->
    unless doc?
      evs.warn "No severity found, using All"
      evs.event_severity 'All'
      client_cb() if _.isFunction client_cb
    else
      evs.event_severity doc.value
      client_cb() if _.isFunction client_cb

  .catch ( err ) ->
    client_cb "Error: #{err}"
    throw err
