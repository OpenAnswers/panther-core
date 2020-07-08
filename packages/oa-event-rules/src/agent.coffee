# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# ## Agent

# (c) OpenAnswers Ltd 2015
# matt@openanswers.co.uk

# logging
{logger, debug} = require('oa-logging')('oa:event:rules:agent')

# nodejs modules
fs = require 'fs'

# npm modules
#Promise           = require 'bluebird'
yaml = require 'js-yaml'

# oa modules
Errors        = require 'oa-errors'
{ RuleSet }   = require './rule_set'
{ _ }         = require 'oa-helpers'
{ Transforms } = require './transforms'


# ### class Agent

# Agents can have specific rules, this is the base for
# the Agent Specifics to inherit from

class Agent

  # A default identifier for agents that don't override
  @identifier: '{node}:{severity}:{summary}'

  # These are the possible transforms to run on fields
  # Should be configured via `field_transform` in yaml

  #    field_transforme:
  #      {{field_name}}: {{transform_name}}

  @generate: ( yaml_def, agent ) ->
    agent = new Agent unless agent
    throw new Errors.ValidationError 'No definition' unless yaml_def?

    if yaml_def.field_map
      agent.field_map yaml_def.field_map

    if yaml_def.identifier
      agent.identifier yaml_def.identifier
    else
      agent.identifier @identifier

    if yaml_def.field_transform
      agent.field_transform yaml_def.field_transform

    if yaml_def.rules
      agent.rule_set RuleSet.generate( yaml_def )
    else
      agent.rule_set new RuleSet

    agent


  constructor: ( options = {} )->
    @_field_map = null
    @_identifier = @constructor.identifier
    @_field_transform = null

    @_rule_set = new RuleSet

    if options.path
      @path = options.path
      @load()


  # ## Instance properties

  # Store the type
  type: ( _type )->
    if _type
      unless _.isString( _type )
        throw new Errors.ValidationError "YAML rules agent `type` must be a string [#{_type}]"
      @_type = _type
    @_type

  # Store the identifier
  identifier: ( _identifier )->
    if _identifier 
      unless _.isString( _identifier )
        throw new Errors.ValidationError "YAML rules agent `identifier` must be a string [#{_identifier}]"
      @_identifier = _identifier
    @_identifier

  # Store the rule set
  rule_set: ( _rule_set )->
    if _rule_set
      @_rule_set = _rule_set
    @_rule_set


  # ###### field_map( has_map )
  # Store the field mappings
  field_map: ( _field_map )->
    if _field_map
      unless _.isObject _field_map
        throw new Errors.ValidationError "YAML rules agent `field_map` must be an object [#{_field_map}]"
      for source, dest of _field_map
        unless _.isString(source)
          throw new Errors.ValidationError "YAML rules agent `field_map` fields must be strings [#{source}]"
        unless _.isString(dest)
          throw new Errors.ValidationError "YAML rules agent `field_map` fields must be strings [#{dest}]"
      @_field_map = _field_map
    @_field_map


  # ###### field_transform( transform )
  # Store the field transforms
  # Also checks if they are valid in the `available_transforms` array
  field_transform: ( _field_transform )->
    if _field_transform
      debug 'Setting field_transform to', _field_transform, @constructor.available_transforms
      for field, transforms of _field_transform
        transforms = [transforms] unless _.isArray transforms
        for transform in transforms
          unless Transforms.available_transforms[transform]
            throw new Errors.ValidationError "YAML rules agent section had an unknown field transform [#{transform}]"
        _field_transform[field] = transforms

      debug 'Setting agent field_transforms to [%j]', _field_transform, ''
      @_field_transform = _field_transform

    @_field_transform


  # Load the agent info from a file
  load: ( path = @path )->
    debug 'Reading agent yaml file', @path
    
    @data = fs.readFileSync @path
    @doc = yaml.load @data

    if @doc.agent?.field_map
      @field_map @doc.agent.field_map

    if @doc.agent?.identifier
      @identifier @doc.agent.identifier

    if @doc.agent?.field_transform
      @field_transform @doc.agent.field_transform


  # ###### run( event_object )
  # Run the log event through all the agent generic mappings
  run: ( event_obj )->

    # Attach the default agent identifier
    # Formed: `{field}:{field}:{field}`
    if event_obj.get('identifier') is undefined
      event_obj.set 'identifier', @_identifier

    # Map incoming fields to new event fields
    @run_field_map( event_obj )

    # Do any blanket transforms on the data, post mapping
    @run_field_transform( event_obj )

    # Send the event through any agent specific rules
    @run_rules( event_obj )

    event_obj


  # ###### run_field_transform( Event_object )
  # Transform any fields on the way through
  # Modifies event_obj
  run_field_transform: ( event_obj )->
    debug 'transforming', @_field_transform
    for field, transforms of @_field_transform
      for transform in transforms
        current = event_obj.get field
        continue unless current?
        tranformed_val = Transforms.available_transforms[transform].function current
        debug 'transforming field [%s] old[%s] new[%s]', field, current, tranformed_val
        event_obj.set field, tranformed_val
    true #so the for loop doesn't return an array


  # ###### run_field_map( event_object )
  # Map an input field to a different event console field
  run_field_map: ( event_obj )->
    for from_field, to_field of @_field_map
      to_field_value = event_obj.get_input(from_field)
      debug 'mapping', from_field, to_field, to_field_value
      event_obj.set to_field, to_field_value
    true #so the for loop doesn't return an array


  # ###### run_rules( Event_object )
  # Run an event though the agent rule set
  run_rules: ( event_obj )->
    debug 'running agent rules'
    @_rule_set.run event_obj

  # Convert generic structure to yaml
  to_yaml_obj: ()->
    obj = {}
    obj.type = @_type
    obj.identifier = @_identifier
    obj.field_map = @_field_map
    obj.field_transform = @_field_transform
    obj.rules = if @_rule_set then @_rule_set.to_yaml_obj() else []
    obj

  
  to_yaml: ()->
    yaml.dump @to_yaml_obj()

module.exports =
  Agent: Agent
