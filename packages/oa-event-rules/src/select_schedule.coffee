# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: from schedule

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:match')

{ assert } = require('assert')

# OA modules

Errors = require 'oa-errors'

{ _
  throw_error
  regex_escape
  is_regexy
  regexy_to_regex
  regexy_to_string
  regex_from_array } = require 'oa-helpers'

{ SelectBaseFieldValue } = require './select_base'
{ Schedules } = require './schedules'

# NPM modules

{ moment } = require 'moment'


# ## SelectSchedule
# Match a field to a single value or any of an array of values

# string, will be turned into a regexp with any regexp special
# chars escaped.
#
#    match:
#      field: 'search'

# regexp, is a regexp
#
#    match:
#      field: !!js/regexp /se\wrch/

# `or` can be achieved when you specify an array of values
# If any of the values match, the select will return true
#
#    match:
#      field:
#        - 'search'
#        - !!js/regep /se\wrch/
#        - 'other'

class @SelectSchedule  extends SelectBaseFieldValue
  
  @label: 'schedule'

  @description: -> {
    name: @label
    description: 'Checks if time now is within the schedule .'
    help: 'This is a match field, it searches a string for a value'
    input: [
      {
        name: 'name'
        label: 'Name'
        type: 'string'
      }
      {
        name: 'uuid'
        label: 'uuid of schedule'
        type: 'string'
      }
    ]
  }

  # ###### generate( yaml_defintion )

  # Generate a match from the object structure in the yaml defintion
  # Doesn't neccesarily need to be yaml, just follow the format
  #
  #    schedule:
  #      name: schedule name
  #
  #    schedule:
  #      uuid: schedule uuid
  #

  @generate: ( yaml_def )->
    # Validate 
    Errors.throw_a Errors.ValidationError, 'Definition needs :schedule key' unless yaml_def.schedule?
    debug 'Schedule generate: schedule for definition', yaml_def
    
    # Create an array to store all the selects we are about to generate
    # One for each field
    selects = []

    # Grab the fieldname and value from `.match`
    for fieldname, value of yaml_def.schedule
      Errors.throw_a Errors.ValidationError, "Schedule generate: field null", yaml_def unless fieldname?
      Errors.throw_a Errors.ValidationError, "Schedule generate: empty field", yaml_def if fieldname == ''
      Errors.throw_a Errors.ValidationError, "Schedule generate: value null", yaml_def unless value?
      Errors.throw_a Errors.ValidationError, "Schedule generate: empty value", yaml_def unless value

      Errors.throw_a Errors.ValidationError, "Schedule generate: must have a name", yaml_def unless fieldname == "name"

      valid_schedule = Schedules.find_by_name value
      Errors.throw_a Errors.ValidationError, "Schedule generate: schedule name does not exist", yaml_def unless valid_schedule?

      debug 'Match generate fieldname,value', fieldname, value

      # fieldname = "name" | "uuid"
      # value = <schedule name> | <schedule uuid>
      try
        selects.push new SelectSchedule( fieldname, value )
        valid_schedule.ref_count_increment()
      catch error
        if error instanceof Errors.ValidationError
          # pass lower Validation Errors back up the stack
          throw error
        logger.error 'select schedule', error
        Errors.throw_a Errors.ValidationError, "Failed to create select from definition", yaml_def

    unless selects.length > 0
      Errors.throw_a Errors.ValidationError, 'No selects could be built from definition', yaml_def

    debug 'match generate: built selects', selects
    selects


  constructor: ( @field, value, args = {} ) ->
    throw_error 'param 1: field' unless @field?
    throw_error 'param 2: value' unless value?
    
    @label = @constructor.label

    # Place to store the match array for rendering
    @values = []

    @value_ori = value
    @value = value

    debug "new", @constructor.label, @field, @value


  # ###### run( event_object )
  # Run this match against an event
  run: (event_obj) ->
    debug "run: schedule", @field, @value, event_obj.get(@field)

    # find the schedule
    schedule = Schedules.find_by_name @value
    unless schedule
      logger.warn "Schedule name did not exist in rules"
      return false

    schedule.is_in()


  # Hu-man
  toString: ->
    "#{@field} matches '#{@value}'"

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = {}
    obj[@constructor.label][@field] = if @value_ori then @value_ori else @values
    obj
