# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
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
    debug "run starts_with [%s] [%s] [%j]", @field, @value, event_obj
    
    starts_with event_obj.get(@field), @value
