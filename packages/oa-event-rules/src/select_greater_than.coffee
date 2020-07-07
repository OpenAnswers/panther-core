# # Select: Greater Than

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:greater_than')

# OA modules
Errors = require 'oa-errors'

{ _
  throw_error } = require 'oa-helpers'

{ SelectBaseFieldValue } = require './select_base'



# Match if a field is greater than x

class @SelectGreaterThan extends SelectBaseFieldValue
  
  @label: 'greater_than'
  
  @description: -> {
    name: @label
    description: 'Matches values greater than a specified value.'
    friendly_name: 'greater than'
    friendly_before: 'is'
    input: [
      {
        name:   'field'
        label:  'Field'
        type:   'string'
      }
      {
        name:   'value'
        label:  'Number'
        type:   'number'
      }
    ]
  }

  run: (event_obj)->
    debug "run greater_than", @field
    return event_obj.get(@field) > @value
