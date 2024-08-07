# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: No Events

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


# ## SelectMatch
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

class @SelectMatch  extends SelectBaseFieldValue
  
  @label: 'match'

  @description: -> {
    name: @label
    description: 'Searches a field for a particular value. Regex is allowed.'
    friendly_name: 'matches'
    help: 'This is a match field, it searches a string for a value'
    input: [
      {
        name: 'field'
        label: 'Field'
        type: 'string'
      }
      {
        name: 'value'
        label: 'string or /regex/'
        type: 'stregex'
        array: true
      }
    ]
  }

  # ###### generate( yaml_defintion )

  # Generate a match from the object structure in the yaml defintion
  # Doesn't neccesarily need to be yaml, just follow the format
  #
  #    match:
  #      field: value
  #
  #    match:
  #      field: /value/
  #
  #    match:
  #      field:
  #       - /value/
  #       - other

  @generate: ( yaml_def )->
    Errors.throw_a Errors.ValidationError, 'Definition needs :match key' unless yaml_def.match?
    debug 'Match generate: match for definition', yaml_def
    
    # Create an array to store all the selects we are about to generate
    # One for each field
    selects = []

    # Grab the fieldname and value from `.match`
    for fieldname, value of yaml_def.match
      Errors.throw_a Errors.ValidationError, "Match generate: field null", yaml_def unless fieldname?
      Errors.throw_a Errors.ValidationError, "Match generate: empty field", yaml_def if fieldname == ''
      Errors.throw_a Errors.ValidationError, "Match generate: value null", yaml_def unless value?
      Errors.throw_a Errors.ValidationError, "Match generate: empty value", yaml_def unless value

      debug 'Match generate fieldname,value', fieldname, value

      try
        selects.push new SelectMatch( fieldname, value )
      catch error
        logger.error 'select match', error
        if error instanceof Errors.ValidationError
          # pass lower Validation Errors back up the stack
          throw error
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

    switch
      when value instanceof Array
        debug 'Found an array of matches, regex ORing them', value
        for v in value
          Errors.throw_a Errors.ValidationError, 'empty match in ', @field if v == ''

        @values = value
        @value = regex_from_array value

      when value instanceof RegExp
        @value_ori = value
        @value = value

      when is_regexy(value)
        @value_ori = value
        @value = regexy_to_regex value

      else
        @value_ori = value
        @value = new RegExp regex_escape("#{value}")

    debug "new", @constructor.label, @field, @value


  # ###### run( event_object )
  # Run this match against an event
  run: (event_obj) ->
    debug "run: match field:[%o], value:[%o], field_value:[%o]", @field, @value, event_obj.get_any(@field)

    # Check for the field
    field_value = event_obj.get_any(@field)
    return false unless field_value?


    # Now check the value against the match
    if match = "#{field_value}".match(@value)
      ret = true
      debug 'run: match was saved to event', match
      event_obj.match match
    else
      ret = false

    debug 'match: returning', ret
    return ret


  # Hu-man
  toString: ->
    "#{@field} matches '#{@value}'"

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = {}
    obj[@constructor.label][@field] = if @value_ori then @value_ori else @values
    obj
