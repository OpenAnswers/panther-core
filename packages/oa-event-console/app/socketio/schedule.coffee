# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# Logging module
{logger, debug} = require('oa-logging')('oa:event:socketio:schedule')

# node modules
path = require 'path'

# npm modules
moment = require 'moment'

Joi = require 'joi'

# oa modules
{ EventRules
  Select
  Schedule,
  Schedules }        = require 'oa-event-rules'
{ is_numeric
  format_string, _ } = require 'oa-helpers'

{ SocketIO }      = require '../../lib/socketio'
Errors            = require '../../lib/errors'

config            = require('../../lib/config').get_instance()

{schedule_update_days_schema, schedule_delete_schema} = require '../validations'



schedule_lookup = ( request )->
  name = request.name || ""

  schedule = config.rules.set.schedules.get name

  schedule

schedule_lookup_by_uuid = (uuid)->
  schedule = undefined
  config.rules.set.schedules.store_map.forEach (sch)->
    if sch.uuid == uuid
      schedule = sch
  schedule

# return boolean
schedule_delete_by_name = (name) ->
  config.rules.set.schedules.store_map.delete name

schedule_set = (schedule)->
  config.rules.set.schedules.add schedule

schedules_save = (schedule)->
  event_rules = config.rules.server
  event_rules.schedules.add schedule if schedule?
  rules_save_f = event_rules.save_yaml_async
  rules_save_f.apply event_rules, [ event_rules.path ]
 

# Rules save
# Save the in memory values back to file
SocketIO.route_return 'schedules::save', ( socket, data, socket_cb ) ->
  unless data
    throw new Errors.ValidationError("No data on save")
  # TODO
  socket_cb null, {}

# Read all names
SocketIO.route 'schedules::index', ( socket, data, socket_cb ) ->
  debug 'got schedules::read', data

  # TODO 

  schedule_names = config.rules.set.schedules.names()

  debug "schedule names: " + schedule_names.join(',')
  socket_cb null, 
    status: 'success'
    data: schedule_names

SocketIO.route 'schedules::read', (socket, data, socket_cb )->
  schedules_raw = config.rules.server.schedules.get_all()

  schedules = schedules_raw.map (value)->
    value.to_yaml_obj()

  socket_cb null,
    status: 'success'
    data: schedules

# Create
SocketIO.route_return 'schedule::create', ( socket, request ) ->
  debug 'schedules::create', request.data

  Schedule.validate request.data
  .catch (err)->
    logger.error "Joi validation: ", err
    throw new Errors.ValidationError("Schedule was incomplete")
  .then (request_schedule)->
    logger.info "JOI validated schedule::create"

    schedule = Schedule.generate request.data
    #Schedules.add schedule

    event_rules = config.rules.server

    event_rules.schedules.add schedule

    rules_save_f = event_rules.save_yaml_async

    rules_save_f.apply event_rules, [ event_rules.path ]
  .then ( res )->
    debug "saved Rules"

    SocketIO.io.emit "schedules::updated"

    response =
      status: 'success'
      data:
        created: true


# Read a single schedule
SocketIO.route 'schedule::read', ( socket, request, socket_cb )->

  throw new Errors.ValidationError "No such request" unless request
  throw new Errors.ValidationError "No such name in request" unless request.name

  schedule = schedule_lookup request
  throw new Errors.ValidationError "No such schedule name" unless schedule


  socket_cb null, 
    status: 'success'
    data: schedule.to_yaml_obj()
  
  # TODO
  true

SocketIO.route_return 'schedule::update::days', (socket, request)->

  {value,error} = schedule_update_days_schema.validate request

  if error
    throw new Errors.ValidationError "Request invalid"


#  validation_promise = Joi.validate request, compiled_schedule_update_days
#  validation_promise.then (result)->
  schedule = schedule_lookup_by_uuid value.uuid
  schedule.dow_a = value.days

  schedules_save schedule
  .then (saved_result)->
    logger.debug "saved schedule ", saved_result
    data =
      status: 'success'
  .catch (error)->
    logger.error "Validation failure ", error
    throw new Errors.ValidationError "Request invalid"


# Delete
SocketIO.route_return 'schedule::delete', ( socket, request, socket_cb ) ->

  {value, error} = schedule_delete_schema.validate request
  if error
    throw new Errors.ValidationError( "Invalid schedule::delete")



#  validation = Joi.validate request, compiled_schedule_delete
#  validation.then (result) ->

  schedule = schedule_lookup_by_uuid value.uuid
  unless schedule
    throw new Errors.BadRequestError "Schedule no longer exists"

  if schedule.is_referenced()
    logger.error "Attempt to delete referenced schedule " + value.uuid
    throw new Errors.ValidationError "Schedule is still used by " + schedule.ref_count + " rule(s)"

  # FIXME this might be tricky. deletes should only be permitted if no rule is using it
  # or deleteing the schedule deletes the rule.

  unless schedule_delete_by_name schedule.name
    logger.error "No schedule named: " + schedule.name
    throw new Errors.ValidationError "Schedule could not be deleted"


  event_rules = config.rules.server
  rules_save_f = event_rules.save_yaml_async
  return rules_save_f.apply event_rules, [ event_rules.path ]
  .then (saved_rules) ->

    SocketIO.io.emit "schedules::updated"

    data =
      status: 'success'
      deleted: value.uuid
