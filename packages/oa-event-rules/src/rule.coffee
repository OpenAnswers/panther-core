# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:rule')

# npm modules
yaml = require 'js-yaml'
nodeuuid = require 'uuid/v1'

# OA modules
Errors = require 'oa-errors'

{ Action, ActionBase } = require './action'
{ Select, SelectBase } = require './select'
{ Option, OptionBase } = require './option'

{ _
  objhash
  throw_error } = require 'oa-helpers'


# ## Rule

# A rule is made up of a selection and an action


class @Rule

  # Generate the rule from a yaml definition
  @generate: (yaml_def) ->
    debug 'generating rule from def', yaml_def
    
    yaml = _.cloneDeep yaml_def
    delete yaml.hash if yaml.hash

    # Generate the action
    try
      action = Action.generate yaml
    catch e
      debug 'generating action failed', e
      Errors.throw_a Errors.ValidationError, e.message

    unless action.run then throw_error 'No .run on action!'
    
    # Generate the select
    select = Select.generate yaml
    unless select.run then throw_error 'No .run on select!'
    
    # Generate the option
    option = Option.generate yaml

    # Generate an id if none exists
    unless yaml.uuid then yaml.uuid = nodeuuid()
    uuid = yaml.uuid

    new Rule yaml.name,
      select: select
      action: action
      option: option
      yaml:   yaml
      uuid:   uuid


  constructor: ( @name, options = {} ) ->
    throw_error 'No `name` paramater passed in to generate rule'   unless @name?
    { @select, @action, @option, @yaml, @uuid } = options

    unless @select then Errors.throw_a Errors.ValidationError, 'no select'
    unless @select instanceof Select
      throw_error 'The `select` paramater is not an instance of Select', @select

    unless @action then Errors.throw_a Errors.ValidationError, 'no action'
    unless @action instanceof Action
      throw_error 'The `action` paramater is not an instance of Action', @action

    if @option and !(@option instanceof Option)
      throw_error 'The `option` paramater is not an instance of Option', @option

    unless @uuid then Errors.throw_a Errors.ValidationError, 'no uuid', yaml

  # Test the selection then run the action
  run: (event_obj)->
    debug 'running rule', @toString()
    throw_error 'No `event_obj` to apply this rule to' unless event_obj?
    throw_error 'No `select` attached to run' unless @select?
    throw_error 'No `action` attached to run' unless @action?
  
    options = if @option then @option.to_object() else {}

    if options.skip
      debug 'Skipping rule', @name
      return event_obj

    # Now we run the select against the object
    # If true we run the action
    debug 'run test select', @select.toString(), options
    if @select.run(event_obj, options) is true
      event_obj.add_matched { from: 'RuleSelector', uuid: @uuid, name: @name }
      debug 'HIT rule - ', @uuid
      debug 'run action', @action.toString(), options
      @action.run event_obj, options
      
    event_obj

  # Create a nice string for the rule
  toString: ->
    "#{@name}:#{@uuid} Select events where #{@select.toString()}. Then #{@action.toString()}"

  # Back to the yaml description
  to_yaml: ->
    yaml.dump @to_yaml_obj()
  
  # Create an object of the reducted yaml description
  # only works for objects created via `generate` or supplying
  # the yaml object at the moment
  to_yaml_obj: ( options = {} )->
    include = {}
    if options.hash
      include.hash = objhash @yaml
     _.defaults include, @yaml

    # obj     = { name: @name }
    # action  = @action.to_yaml_obj()
    # select  = @select.to_yaml_obj()
    # options = @option.to_yaml_obj()
    # # Merge the components into one flat Rule
    # _.defaults obj, action
    # _.defaults obj, select
    # _.defaults obj, option
    # obj

