# 
# Copyright (C) 2022, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

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
    debug "run ends_with field:[%o], value:[%o]", @field, @value
    field_value = event_obj.get_any @field
    return false unless field_value?
    
    matched_value = ends_with field_value, @value
    debug "ends_with ", if matched_value then "✔️" else "❌"
    matched_value


