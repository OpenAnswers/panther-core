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
    debug "run field_exists", @field

    if @field.indexOf('input.') is 0
      input_field_name = @field.replace 'input.', ''
      return event_obj.get_input( input_field_name )?

    if @field.indexOf('syslog.') is 0
      input_field_name = @field.replace 'syslog.', ''
      return event_obj.get_input( input_field_name )?

    if @field.indexOf('original.') is 0
      original_field_name = @field.replace 'original.', ''
      return event_obj.get_original( original_field_name )?

    return event_obj.get(@field)?
