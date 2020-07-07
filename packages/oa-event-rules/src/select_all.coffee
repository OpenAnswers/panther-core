# # Select: All Events

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:all')

# OA modules
Errors = require 'oa-errors'

{ throw_error, _ } = require 'oa-helpers'

{ SelectBaseSingle } = require './select_base'


# All matches everything.
# Needed something to take a selects place
class @SelectAll  extends SelectBaseSingle
  
  @label: 'all'

  run: ->
    debug @constructor.name
    true
  