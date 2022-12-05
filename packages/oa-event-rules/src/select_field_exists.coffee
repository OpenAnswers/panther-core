# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: Field Exists

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:field_exists')

# OA modules
Errors = require 'oa-errors'

{ _
  throw_error } = require 'oa-helpers'

{ SelectBaseField } = require './select_base'



# Match is a field exists
class @SelectFieldExists extends SelectBaseField

  @label: 'field_exists'

  @description: -> {
    name: @label
    description: 'Checks whether a field is present within an event.'
    friendly_name: 'exists'
    help: 'This checks whether a field is present within an event'
  }

  run: (event_obj) ->
    debug "run field_exists [%o]", @field


    matched_value = event_obj.get_any(@field)?
    debug "field_exists ", if matched_value then "✔️" else "❌"
    matched_value
