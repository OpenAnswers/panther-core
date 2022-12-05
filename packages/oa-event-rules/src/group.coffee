# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:rules:group')

# OA modules
{ Select }    = require './select'
{ ActionSet } = require './action'
{ RuleSet }   = require './rule_set'

# npm modules
nodeuuid = require 'uuid/v1'

# ### Group

# Holds a groups worth of rules.
# Includes a matcher for the group
#  and an action to set the group name

class @Group

  # Generate a group from a yaml object
  @generate: ( name, yaml_def ) ->
    debug 'generating Group', name
    select = if yaml_def.select
      Select.generate yaml_def.select
    else
      Select.generate yaml_def
    # Generate an id if none exists
    unless yaml_def.uuid then yaml_def.uuid = nodeuuid()
    uuid    = yaml_def.uuid
    rules   = RuleSet.generate yaml_def
    group   = new Group name, select, rules, uuid


  # Create a group from a name, selector and rules
  constructor: ( @name, @select, @rules, @uuid ) ->
    unless @name?
      throw new Error "new Group requires a name first"
    unless @select and @select instanceof Select
      throw new Error "new Group requires a Select second"
    unless @rules and @rules instanceof RuleSet
      throw new Error "new Group requires a RuleSet third"
    #throw_error "param 4: action" unless @action?

    # Set the group name if we match
    @action  = new ActionSet 'group', @name


  # Event rules
  event_rules: ( parent = null )->
    if parent
      @rules.event_rules = parent
    @rules.event_rules


  # Update a select
  update_select: ( rule, index )->
    select = Select.generate rule
    @select = select


  # Run an event through the group
  run: (event_obj) ->
    debug "run group", @name
    # Is this event selected by this group?
    if @select.run(event_obj)
      debug "run select matched group", @name

      @action.run event_obj
      @rules.run event_obj
      
      event_obj.close_matched_group @name, @uuid

  # Convert the running rule back into an object
  to_yaml_obj: ( options = {} ) ->
    obj =
      select: @select.to_yaml_obj()
      rules:  @rules.to_yaml_obj()
      uuid:   @uuid
    debug 'to_yaml_obj', obj
    obj

