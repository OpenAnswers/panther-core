# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Selecting Base Implementations

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select_base')

# npm modules
yaml = require 'js-yaml'

# OA modules
Errors = require 'oa-errors'
{ throw_error, _ } = require 'oa-helpers'


# ## SelectBase

# Generic Select to implement
class @SelectBase
  
  @label: '__base'
  
  # Return a descriptor of the object
  # to a web building form
  # not sure it needs to be a function but
  # it makes this implementation/throw easier...
  @description: ->
    throw_error 'description not implemented', @label

  # Generate takes a definition, normally from yaml
  # and creates a class instance from it
  # Can return an array of class instances if there
  # are multiple selects conained within the one field
  @generate: ( yaml_def )->
    debug 'generate select', @label, yaml_def
    unless yaml_def[@label]?
      Errors.throw_a Errors.ValidationError, "#{@constructor}: Definition has no key [#{@label}]"

    # refer to the local class name @::
    new @::constructor yaml_def[@label]

  constructor: ->
    @label = @constructor.label

  # Run executes the select, should probably `debug` to
  # So people can see what is going on
  run: ->
    throw_error 'run not implemented'

  # Create a nice string for people to read, describing the select
  toString: ->
    "#{@constructor.label}"

  # Create the definition representation of the class
  to_yaml_obj: ->
    throw_error 'to_yaml_obj not implemented'
    
  # Dump the yaml of the object
  to_yaml: ->
    yaml.dump @to_yaml_obj()


# ## SelectBaseField

# Generic Select to extend that only holds a field

class @SelectBaseField extends @SelectBase
  
  @label: '__base_field'

  @description: ->
    {
      name: @label
      input: [{
        name: 'field'
        type: 'string'
      }]
    }

  @generate: (yaml_def) ->
    debug 'generate select', @label, yaml_def
    unless yaml_def[@label]?
      Errors.throw_a Errors.ValidationError, "#{@constructor}: Definition has no key [#{@label}]"

    # refer to the local class name @::
    new @::constructor yaml_def[@label]

  constructor: (@field, @value) ->
    throw_error "#{@constructor.label} The first paramater `field` must be defined" unless @field?
    debug "new", @constructor.label, @field
    @label = @constructor.label

  run: ->
    throw_error 'run not implemented'

  toString: ->
    "#{@constructor.label} #{@field}"

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = @field
    obj


# ## SelectBaseFieldValue

# Generic Select to extend that holds a field and value

class @SelectBaseFieldValue extends @SelectBase
  
  @label: '__base_field_value'

  @description: -> {
    name: @label
    input: [
      {
        name: 'field'
        label: 'Field'
        type: 'string'
      }
      {
        name: 'value'
        label: 'Value'
        type: 'string'
      }
    ]
  }

  @generate: (yaml_def) ->
    debug 'generate select', @label, yaml_def
    unless yaml_def[@label]?
      Errors.throw_a Errors.ValidationError, "#{@::constructor.name}.generate: Definition has no key [#{@label}]"

    # Get any fieldname and objects
    selects = []
    for fieldname, value of yaml_def[@label]
      selects.push new @::constructor( fieldname, value )

    unless selects.length > 0
      Errors.throw_a Errors.ValidationError, "#{@::constructor.name}: No fields defined for select", yaml_def

    return selects
    

  constructor: (@field, @value) ->
    Errors.throw_a Errors.ValidationError, "#{@constructor.label} The first paramater `field` must be defined" unless @field?
    Errors.throw_a Errors.ValidationError, "#{@constructor.label} The first paramater `field` must be defined" if @field == ''
    Errors.throw_a Errors.ValidationError, "#{@constructor.label} The second paramater `value` must be defined" unless @value?
    Errors.throw_a Errors.ValidationError, "#{@constructor.label} The second paramater `value` must be defined" if @value == ''
    debug "new", @constructor.label, @field, @value
    @label = @constructor.label

  run: ->
    throw_error 'run not implemented'

  toString: ->
    "#{@field} #{@constructor.label} '#{@value}'"

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = {}
    obj[@constructor.label][@field] = @value
    obj



# ## SelectBaseSingle

# Single selects have no value but true/false.
# Basically boolean select flags.
class @SelectBaseSingle  extends @SelectBase
  
  @label: 'none'

  @description: -> {
    name: @label
    input: []
  }

  @generate: (yaml_def) ->
    new @

  to_yaml_obj: ->
    obj = {}
    obj[@constructor.label] = true
    obj

