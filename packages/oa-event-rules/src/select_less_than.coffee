# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# # Select: Less Than

# logging
{ logger, debug } = require('oa-logging')('oa:event:rules:select:less_than')

# OA modules
Errors = require 'oa-errors'

{ _
  throw_error } = require 'oa-helpers'

{ SelectBaseFieldValue } = require './select_base'


# Match if a field is less than a value (numbers only)

class @SelectLessThan extends SelectBaseFieldValue
  
  @label: 'less_than'

  @description: -> {
    name: @label
    description: 'Matches values which are less than a specified value.'
    friendly_name: 'less than'
    friendly_before: 'is'
    input: [
      {
        name: 'field'
        label: 'Field'
        type: 'string'
      }
      {
        name: 'value'
        label: 'Number'
        type: 'number'
      }
    ]
  }

  run: (event_obj)->
    debug "run less_than", @field
    return event_obj.get(@field) < @value
