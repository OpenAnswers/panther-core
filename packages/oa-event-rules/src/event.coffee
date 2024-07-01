# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')( 'oa:event:rules:event' )

# oa modules
{ _
  throw_error
  format_string  } = require 'oa-helpers'

farmHash = require('farmhash')


# ## Event

# the Event object is what is passed around the
# rules for processing. It holds the original event
# and the modified copy.

# The object provides
#  - Helper functions for accessing copy/original properties
#  - Stop processing flag
#  - Discard flag
#  - log of actions

class @Event

  # Copy and modify the object for rule processing
  # deprecated!
  @copy_and_fluff: ( event_obj ) ->
    debug 'copying and fluffing event', event_obj
    
    # Quick deep clone
    event_cp = JSON.parse JSON.stringify(event_obj)

    # Add some internal action tracking
    #event_cp.__actions = [] unless event_cp.__actions?

    # Force __discard so we don't have to check for it
    #event_cp.__discard = false unless event_cp.__discard?

    # Force __exit so we don't have to check for it
    #event_cp.__exit = false unless event_cp.__exit?

    debug 'new copied event - event_cp', event_cp
    event_cp

  # Shortcut to create a new Event from an object
  @generate: ( original_event ) ->
    throw_error 'create requires an event' unless original_event?
    ev = new Event
    ev.set_event original_event
    ev.set_input_object original_event
    ev
    
  @create_from: @generate

  # Not using the full object yet as I'm not sure
  # the overhead in access is worth anything over
  # straight js object access
  constructor: ( original ) ->
    @copy       = @defaults()
    @original   = {}
    @input      = {}
    @matches    = { global: [], group: []}
    @_current_matches = []    # used to temporarily track matches
    @tracking_matches = false
    @actions    = []
    @discard_id = false
    @stop_id    = false
    @stop_rule_set_id = false
    @default_identifier = '{node}:{severity}:{summary}'
    @_match    = null
    @set_event(original) if original

  defaults: ->
    now = new Date()
    {
      history: [],
      notes: [],
      acknowledged: false
      state_change: now
      last_occurrence: now
      first_occurrence: now
    }

  # Set the original and copy events for this object
  set_event: ( event_obj ) ->
    @original = event_obj
    @copy = Event.copy_and_fluff @original

  # Get a field from the input event this was built from
  get_input: ( field ) ->
    got = _.get @input, field
    got


  # Set a field in the input event
  set_input: ( field, value ) ->
    @input[field] = value

  # Set the input object to this
  set_input_object: ( object ) ->
    @input = JSON.parse JSON.stringify(object)

  # Get a field from the input event this was built from
  input_to_copy: ( input = @input ) ->
    debug 'putting input onto copy'
    for name, value of @input
      debug ' putting name [%o], value [%o]', name, value
      @copy[name] = JSON.parse JSON.stringify(value)

  # Get a field from the original event
  get_original: ( field ) ->
    _.get @original, field

  # Get tracking state
  get_tracking: () ->
    @tracking_matches
  
  set_tracking: ( tracking ) ->
    @tracking_matches = tracking ? true : false

  # Get a field from the modified copy
  get: ( field ) ->
    got = _.get @copy, field
    got

  # Set a field in the modified copy
  set: ( field, value ) ->
    @copy[field] = value

  # Get a field from any prefixed location
  get_any: ( field ) ->
    debug "get_any field:[%o]", field

    value =
      if field.indexOf('input.') is 0
        field_name = field.replace 'input.', ''
        @get_input field_name
      else if field.indexOf('syslog.') is 0
        field_name = field.replace 'syslog.', ''
        @get_input field_name
      else if field.indexOf('original.') is 0
        field_name = field.replace 'original.', ''
        @get_original field_name
      else
        @get field
    debug "get_any value:[%o]", value
    value


  # Field exists in the modified copy
  exists: ( field ) ->
    _.has @copy, field

  # Set the flag/id to discard this event
  discard: ( id = true ) ->
    throw_error 'discard id must be truthey' unless id
    @discard_id = id

  # Have we been discarded?
  discarded: ->
    !!@discard_id

  # Set the flag/id to stop processing
  stop_processing: ( id = true ) ->
    throw_error 'stop id must be truthey' unless id
    @stop_id = id

  # `.stop_processing` alias
  stop: @::stop_processing

  # (un)Set the flag/id to re-start processing 
  unstop_processing: ( id = true ) ->
    @stop_id = !id

  unstop: @::unstop_processing

  # Should we stop processing?
  stopped: ->
    !!@stop_id

  # Set the flag/id to stop processing this rule set
  stop_processing_rule_set: ( id = true ) ->
    throw_error 'stop id must be truthey' unless id
    @stop_rule_set_id = id

  # `.stop_processing_rule_set` alias
  stop_rule_set: @::stop_processing_rule_set

  # (un)Set the flag/id to re-start processing of a rule set
  unstop_processing_rule_set: ( id = true) ->
    throw_error 'unstop id must be truthey' unless id
    @stop_rule_set_id = !id

  unstop_rule_set: @::unstop_processing_rule_set
  
  # Should we stop processing?
  stopped_rule_set: ->
    !!@stop_rule_set_id

  # Get a match results
  # Selects can return a regex match results
  # following actions can use $1 or $2
  match: ( match ) ->
    if match?
      @_match = match
      debug "setting match data", @_match
    @_match

  # return just the matchgroups, if they exist
  match_groups: ( match )->
    if @_match?.length > 1
      @_match[1..-1]
    else
      []

  toString: ->
    "#{@copy.summary}"

  # Interpolate the event variables into the identifier {string}
  new_identifer: ->
    event_id = @get('identifier')
    debug 'rules new_identifier1: ', event_id
    event_id = @get_input('identifier') unless event_id
    debug 'rules new_identifier2: ', event_id
    event_id = @default_identifier unless event_id
    new_identifier = format_string event_id, @copy
    debug 'rules new_identifier3: ', new_identifier
    farmHash.fingerprint64 new_identifier

  # Interpolate the variables into the identifier {string}
  populate_identifier: ->
    identifier = @new_identifer()
    debug 'setting identifier [%s] to [%s]', identifier, @copy.identifier, @input.identifier
    @set 'identifier', identifier

  # Interpolate the variables into the identifier {string}
  populate_pre_identifier: ->
    identifier = @new_identifer()
    debug 'setting pre identifier [%s] to [%s]', identifier, @copy.identifier, @input.identifier
    @set '_pre_identifier', identifier

  # Add a history entry to the event, mainly for rule processing
  history: ( message, user = 'rules', date = 'now' )->
    if date is 'now' then date = new Date
    @copy.history.push {
      timestamp: date
      user:      user
      message:   message
    }
  # Add a rule selection id to the event
  # TODO: needs to be dynamically switched on/off

  add_matched: ( mod )->
    if @get_tracking()
      @_current_matches.push mod
    else
      debug 'not tracking', mod
    true

  close_matched_global: ()->
    if @get_tracking() and @_current_matches.length >= 1
      @matches.global = _.clone @_current_matches
      @_current_matches = []
    true

  close_matched_group: (group_name, group_uuid)->
    if @get_tracking() 
      @matches.group.push { group_name: group_name, group_uuid: group_uuid, matches: _.clone @_current_matches }
      @_current_matches = []
    true

  # This syslog stuff probably needs to move elsewhere

  has_structured_data: ()->
    !!@input.structuredData

  # Flatten the structuredData object
  process_syslog_structured: ()->
    for id, data of @input.structuredData
      @input.message_id = id
      @input.structuredData = data
