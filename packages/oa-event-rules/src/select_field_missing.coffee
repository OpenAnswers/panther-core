# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: Field Missing

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:field_missing')

# OA modules
{ _
  throw_error } = require 'oa-helpers'

{ SelectBaseField } = require './select_base'


# Match if a field doesn't exist
class @SelectFieldMissing extends SelectBaseField
  
  @label: 'field_missing'

  @description: -> {
    name: @label
    description: 'Checks whether a field is missing from an event.'
    friendly_before: 'is'
    friendly_name: 'missing'
    help: 'This checks whether a field is missing from an event'
  }

  run: (event_obj)->
    debug "run field_missing [%o]", @field

    matched_value = !event_obj.get_any(@field)?
    debug "field_missing ", if matched_value then "✔️" else "❌"
    matched_value
    

