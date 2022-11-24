# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: No Events

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:starts_with')

# OA modules
Errors = require 'oa-errors'

{ _
  throw_error
  starts_with } = require 'oa-helpers'

{ SelectBaseFieldValue } = require './select_base'


# Match if a field name starts with
class @SelectStartsWith  extends SelectBaseFieldValue
  
  @label: 'starts_with'

  @description: -> {
    name: @label
    description: 'Matches values which start with a particular string.'
    friendly_name: 'starts with'
  }

  run: (event_obj)->
    debug "run starts_with field:[%o], value:[%o]", @field, @value
    field_value = event_obj.get_any @field
    return false unless field_value?
    
    matched_value = starts_with field_value, @value
    debug "starts_with ", if matched_value then "✔️" else "❌"
    matched_value