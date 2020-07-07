
# # Discard

# A common task of discarding has been added which will
# generate rules for you

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:discard')

# npm modules
yaml = require 'js-yaml'
nodeuuid = require 'uuid/v1'

# oa modules
{ throw_error, } = require 'oa-helpers'
{ Rule }    = require './rule'
{ Select }  = require './select'
{ Action }  = require './action'



# Grouping of rules that are for discard
class @Discard

  @description: -> {
    name: 'discard'
    description: 'Discards the event immediately, and applies no further processing.'
  }

  # Take an array of discard definitions and
  # turn them into a rule set
  @generate: (yaml_def) ->

    discard_rule_set = []
    for discard_def, i in yaml_def
      discard_rule_set.push @gen_discard_rule discard_def

    discard_rule_set

  # Generate a single discard
  @gen_discard_rule: ( discard_def ) ->

    action = Action.generate discard: true

    # Array = shortcut to summary
    if discard_def instanceof RegExp or discard_def instanceof String
      debug 'Generating a discard select from RegExp', discard_def
      select = Select.generate match: summary: discard_def
    else
      debug 'Generating a discard select from definition', discard_def
      select = Select.generate discard_def

    debug "discard select, action", select, action, action instanceof Action
    new Rule "Discard #{select}",
      select: select
      action: action
      uuid: nodeuuid()
