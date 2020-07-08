# 
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
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
    debug "run field_missing", @field

    if @field.indexOf('syslog.') is 0
      input_field_name = @field.replace 'syslog.', ''
      return !event_obj.get_input( input_field_name )?
    
    if @field.indexOf('input.') is 0
      input_field_name = @field.replace 'input.', ''
      return !event_obj.get_input( input_field_name )?

    if @field.indexOf('original.') is 0
      original_field_name = @field.replace 'original.', ''
      return !event_obj.get_original( original_field_name )?

    return !event_obj.get(@field)?

