# # Select: Ends with

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:ends_with')

# OA modules
{ _
  throw_error
  ends_with   } = require 'oa-helpers'

{ SelectBaseFieldValue } = require './select_base'



# Match if a field name ends with
class @SelectEndsWith  extends SelectBaseFieldValue

  @label: 'ends_with'

  @description: -> {
    name: @label
    description: 'Matches values which end with a particular string.'
    friendly_name: 'ends with'
  }


  run: (event_obj)->
    debug "run ends_with", @field, @value
    ends_with event_obj.get(@field), @value

