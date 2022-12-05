# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: No Events

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:equals')

# OA modules
Errors = require 'oa-errors'
{ _
  throw_error } = require 'oa-helpers'

{ SelectBaseFieldValue } = require './select_base'


# Match a field exactly
class @SelectEquals  extends SelectBaseFieldValue

  @label: 'equals'

  @description: -> {
    name: @label
    description: 'Matches values that are exactly the same.'
    friendly_before: 'is'
    friendly_name: 'equal'
    friendly_after: 'to'
    help: 'This is a equals field, it must match the value exactly'
    input: [
      {
        name: 'field'
        label: 'field'
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

  @generate: (yaml_def) ->
    debug 'equals generate: select from', yaml_def
    Errors.throw_a Errors.ValidationError, 'need equals in definition' unless yaml_def.equals?

    # Create an array to store all the selects we are about to generate
    # One for each field
    selects = []

    for field, value of yaml_def.equals
      Errors.throw_a( Errors.ValidationError,
              "Select Equals requires a [field]", yaml_def ) unless field?
      Errors.throw_a( Errors.ValidationError,
              "Select Equals requires a [field]", yaml_def ) if field == ''
      Errors.throw_a( Errors.ValidationError,
              "Select Equals requires a [value]", yaml_def ) unless value?
      Errors.throw_a( Errors.ValidationError,
              "Select Equals requires a [value]", yaml_def ) if value == ''
      switch
        when value instanceof Array
          for v in value
            Errors.throw_a( Errors.ValidationError, "Select Equals requires a [value]", yaml_def ) if v == ''

      try
        selects.push new SelectEquals( field, value )
      catch error
        logger.error 'select equals', error
        if error instanceof Errors.ValidationError
          # pass lower Validation Errors back up the stack
          throw error
        Errors.throw_a( Errors.ValidationError,
                  "Failed to create select from definition", yaml_def)

    unless selects.length > 0
      Errors.throw_a Errors.ValidationError,
        'No selects could be built from definition', yaml_def

    debug 'match generate: built selects', selects
    selects


  constructor: ( @field, value, args = {} ) ->
    throw_error 'param 1: field' unless @field?
    throw_error 'param 2: value' unless value?
    throw_error 'param 2: value' if value == ''

    switch
      when value instanceof Array
        for v in value
          throw_error 'param in values is empty' if v == ''
    
    @label = @constructor.label
    @value = value

    debug "new", @constructor.label, @field, @value

  # Run the event through the matcher
  run: (event_obj) ->
    debug "run: equals field:[%o], value:[%o], %o", @field, @value, @toString()

    field_value = event_obj.get_any @field
    return false unless field_value?
    debug "considering field_value:[%o]", field_value

    matched_result = 
      if Array.isArray @value
        found_in_array = false
        for inner_value in @value
          debug "trying inner [%o]", inner_value
          if field_value == inner_value
            found_in_array = true
            break
        found_in_array
      else
        field_value == @value


    # matched_value = field_value == @value

    debug "equals ", if matched_result then "✔️" else "❌"
    matched_result



  # Conver match to english string
  toString: ->
    "#{@field} equals '#{@value}'"

  # Dump the yaml obj
  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = {}
    obj[@constructor.label][@field] = @value
    obj
