# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # RuleSet

# The RuleSet houses a collection of Rules

# Logging
{logger, debug} = require('oa-logging')('oa:event:rules:ruleset')

# NPM modules
#Promise           = require 'bluebird'

# OA modules
{ Rule }          = require './rule'
{ Discard }       = require './discard'
{ Dedupe }        = require './dedupe'
{ _
  throw_error }   = require 'oa-helpers'

{ ruleset_validator, joi_error_summary } = require './validations'

# The RuleSet is a generic store for a set of rules.

class @RuleSet

  @validate: ( yaml_def )->
    {error, value} = ruleset_validator.validate yaml_def
    if error
      messages = joi_error_summary error
      for message in messages
        logger.error "Validation [RuleSet] failed ", message
      throw new Errors.ValidationError "RuleSet"

  #@generate: ( yaml_def, event_rules_ref ) ->
  @generate: ( yaml_def ) ->

    rules = new RuleSet
    #rules.event_rules = event_rules_ref
    
    throw_error 'No definition' unless yaml_def
    
    if yaml_def.discard
      rules.combine Discard.generate(yaml_def.discard)

    if yaml_def.dedupe
      rules.combine Dedupe.generate(yaml_def.dedupe)
    
    if yaml_def.rules
      for rule in yaml_def.rules
        new_rule = Rule.generate rule
        debug 'new_rule', new_rule
        throw_error 'No run on rule!' unless new_rule.run
        rules.add new_rule

    unless yaml_def.rules # and yaml_def.rules.length > 0
      logger.warn 'No rules in definition', yaml_def, ''
    else
      unless _.isArray yaml_def.rules
        logger.error 'Rules definition must be an array', yaml_def, ''
        throw new Error 'Rules definition must be an array (rules:)'
      if yaml_def.rules.length is 0
        logger.info 'No rules in definition', yaml_def, ''
      

    debug 'generated rules', rules
    rules

  constructor: ->
    @rules = []
    #@event_rules = null


  # Get a rule by index, hash or rule
  # The rule is more of an existence check
  get: (arg) ->
    rule = false
    if _.isFinite(arg)
      rule = @rules[arg]
    else if _.isObject(arg)
      idx = @rules.indexOf[arg]
      rule = @rules[idx]
    else if _.isString(arg)
      _.find( @rules, hash: arg )

  add: (rule) ->
    throw_error 'No .run on rule! Is this a real Rule?' unless rule.run
    @rules.push rule
    #@event_rules.set_edited_flag()


  # ###### update( rule_index, Rule )
  # Update an existing rule with new details
  # rule must be an instance of Rule
  update: (index, rule) ->
    debug 'updating rule at index [%s]', index, rule
    @rules[index] = rule
    #@event_rules.set_edited_flag()


  # ###### insert( Rule )
  # Insert a Rule at the beginning
  # Must be an instance of Rule
  insert: (rule) ->
    throw_error 'No .run on rule! Is this a real Rule?' unless rule.run
    @rules.unshift rule
    #@event_rules.set_edited_flag()


  # ###### delete_index( index )
  # Delete a rule from the RuleSet array by index (0 based)
  delete_index: ( index )->
    throw_error "Can only delete a numeric index [#{index}" unless parseInt(index) is index
    @rules.splice index, 1


  # ###### move( index, new_index )
  # Move a rule from it's current location to a new one
  move: (oldPos, newPos) ->
    ruleToMove = @rules[oldPos]
    # Remove rule in preparation for moving
    @rules.splice(oldPos, 1)
    # Insert rule in new position
    @rules.splice(newPos, 0, ruleToMove)

  combine: (rule_set) ->
    for rule in rule_set
      @add rule

  length: ->
    @rules.length

  # Run the ruleset, return a new event
  run: (event_obj) ->
    debug "running ruleset on event", event_obj, @length()

    # clear any prior stopped_rule_set flags
    event_obj.unstop_rule_set()

    # Could `nexttick` this to provide
    # some space for others to run
    for rule in @rules
      debug rule
      rule.run event_obj

      # terminate this ruleset on either of the stopping condition flags
      if event_obj.stopped() || event_obj.stopped_rule_set()
        debug "stopping was set by " + rule.uuid
        break

    debug "EVENT_OBJ %o", event_obj
    event_obj

  find: ( id )->
    r = []
    for rule in @rules
      if rule.id == id
        r.push rule
    _.flatten r

  to_yaml_obj: (options)->
    rule_set = for rule in @rules
      rule.to_yaml_obj(options)

  to_yaml_obj_with_hash: ->
    for rule in @rules
      rule.to_yaml_obj_with_hash()


# Global are the first rules that run against everything
class @GlobalRuleSet extends @RuleSet

  constructor: (@name = 'globals') ->
    throw_error 'GlobalRuleSet param 1: name' unless @name?
    @rules = []



# Groups are rules run again specific set of events
class @GroupRuleSet extends @RuleSet

  constructor: (@name) ->
    throw_error 'GroupRuleSet param 1: name' unless @name?
    @rules = []


