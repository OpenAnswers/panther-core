# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Selecting fields

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select')

# OA modules
{ regex_escape
  regex_from_array
  throw_error
  ends_with
  starts_with
  _ } = require 'oa-helpers'

Errors = require 'oa-errors'


{ SelectBase
  SelectBaseField
  SelectBaseFieldValue
  SelectBaseSingle }   = require './select_base'

# Import the various selects
{ SelectAll }          = require './select_all'
{ SelectNone }         = require './select_none'
{ SelectMatch }        = require './select_match'
{ SelectEquals }       = require './select_equals'
{ SelectStartsWith }   = require './select_starts_with'
{ SelectEndsWith }     = require './select_ends_with'
{ SelectFieldExists }  = require './select_field_exists'
{ SelectFieldMissing } = require './select_field_missing'
{ SelectLessThan }     = require './select_less_than'
{ SelectGreaterThan }  = require './select_greater_than'
{ SelectSchedule }     = require './select_schedule'





# ## Select

# Public factory interface to the Selects

# Give it a some yaml and it will give you a list
# of select classes back. `@types` is the main lookup for this
# If you implement a new select, it will need to be added here.

# External entities should do lookups for select verbs from here, like
# the API is doing. This means if anything updated here it propogates
# throughout the system. Same deal for actions/options

# @select: Array of select objects for this instance/rule


class Select
  
  # `.types` maps the word to a class
  @types:
    all:            SelectAll
    none:           SelectNone
    match:          SelectMatch
    equals:         SelectEquals
    field_exists:   SelectFieldExists
    field_missing:  SelectFieldMissing
    starts_with:    SelectStartsWith
    ends_with:      SelectEndsWith
    less_than:      SelectLessThan
    greater_than:   SelectGreaterThan
    schedule:       SelectSchedule

  # Helper for an array of types
  @types_list: ->
    _.keys @types

  # Generate a big blob of info, for the API
  @types_description = {}
  for name of @types
    debug 'building %s description', name
    @types_description[name] = @types[name].description()

  # Take a rules worth of yaml and turn it into the underlying js model
  @generate: (yaml_def) ->
    debug 'generating Select', yaml_def

    # Multiple selects = `and`
    select_objs = []

    # Find the name in types
    select_types = _.intersection _.keys(yaml_def), _.keys(Select.types)

    # We can't select with no select definition
    if select_types.length == 0
      msg = 'Failed to generate select: No valid select verb found in definition'
      logger.error msg, yaml_def
      return Errors.throw_a Errors.ValidationError, msg, yaml_def
      #select_objs.push new self.SelectAll

    debug 'generating select for select_types', select_types
    for name in select_types
      select_ret = @types[name].generate( yaml_def )
      select_objs = select_objs.concat select_ret

    debug 'generated Selects', select_objs
    new Select select_objs

  # We store an array of various select objects
  constructor: (@selects) ->

  # Hu-man, note the default 'and'
  toString: ->
    (select.toString() for select in @selects).join ' and '

  # Loop over the selects and check each one against an event
  run: (event_obj) ->
    # Only true if all selects in the array are true
    for select in @selects
      return false unless select.run(event_obj)
    return true

  # Back to yaml.. not really working as we lose info or structure in
  # the conversion frmo yaml
  to_yaml_obj: ->
    o = {}
    for select in @selects
      _.defaults o, select.to_yaml_obj()
    o

  # Then dump to yaml
  to_yaml: ->
    yaml.dump @to_yaml_obj()



# Exports (cross env js export via coffee's `this` variable)
@Select             = Select
@SelectAll          = SelectAll
@SelectNone         = SelectNone
@SelectMatch        = SelectMatch
@SelectEquals       = SelectEquals
@SelectStartsWith   = SelectStartsWith
@SelectEndsWith     = SelectEndsWith
@SelectFieldExists  = SelectFieldExists
@SelectFieldMissing = SelectFieldMissing
@SelectLessThan     = SelectLessThan
@SelectGreaterThan  = SelectGreaterThan
@SelectSchedule     = SelectSchedule
#gte
#lte
