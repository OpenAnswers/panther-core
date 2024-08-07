# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  


# logging
{logger, debug} = require('oa-logging')('oa:event:rules:schedule')

{ DayTime }   = require './day_time'

{ throw_error } = require 'oa-helpers'

Joi = require 'joi'

# OA modules
Errors = require 'oa-errors'

# npm modules
nodeuuid = require 'uuid/v1'
moment = require 'moment'
momentZone = require 'moment-timezone'
{schedule_validator} = require './validations'

# ### Group

# Holds a groups worth of rules.
# Includes a matcher for the group
#  and an action to set the group name

default_validate_options =
  allowUnknown: false

class @Schedule

  # returns Promise<yaml_def>
  @validate: (yaml_def) ->

    {error, value} = schedule_validator.validate yaml_def, default_validate_options
    if error
      logger.error "Joi Validation failed on Schedule: ", error
      return Promise.reject (Errors.ValidationError "Incorrect schedule definition")
    Promise.resolve value

  # expects:
  #   name: "some name"
  #   uuid: some-uuid
  #   start: "HH:mm"
  #   end: "HH:mm"
  #   dow: [String{,7}]
  #    
  # Generate a Schedule from a yaml object
  @generate: ( yaml_def ) ->
    debug 'generating Schedule', yaml_def

    @validate yaml_def
    .then (result)->
      logger.info "JOI validated", result
    .catch ( error)->
      logger.error "JOI failed", error

    unless yaml_def then Errors.throw_a Errors.ValidationError, 'No schedule definition'
    unless yaml_def.name then Errors.throw_a Errors.ValidationError, 'No Schedule name'
    unless yaml_def.uuid
      yaml_def.uuid = nodeuuid()
    
    unless yaml_def.start 
      yaml_def.start = "00:00"
    unless yaml_def.start.match /[0-9][0-9]:[0-9][0-9]/ 
      Errors.throw_a Errors.ValidationError, "Incorrect schedule start time"


    unless yaml_def.end 
      yaml_def.end = "00:00"
    unless yaml_def.end.match /[0-9][0-9]:[0-9][0-9]/ 
      Errors.throw_a Errors.ValidationError, "Incorrect schedule end time"

    if yaml_def.start == yaml_def.end
      Errors.throw_a Errors.ValidationError, "Invalid start and end times, must be different"

    unless yaml_def.days then Errors.throw_a Errors.ValidationError, 'No Schedule days of week'
    unless yaml_def.days instanceof Array
      Errors.throw_a Errors.ValidationError, "Invalid days of week"
    unless yaml_def.days.length >= 1
      Errors.throw_a Errors.ValidationError, "No Day(s) were selected"

    yaml_def.days.forEach (day)->
      switch day
        when "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" 
          true
        else
          Errors.throw_a Errors.ValidationError, "Invalid Day of Week"

    new Schedule yaml_def.name, yaml_def.uuid, yaml_def.start, yaml_def.end, yaml_def.days


  # convert HH:mm to number of seconds after midnight
  convertTime: ( hourMinute )->
    splitString = hourMinute.split(':')
    hs = splitString[0] * 60 * 60
    ms = splitString[1] * 60
    seconds = hs + ms

  # 
  # Create a schedule from a name, selector and rules
  constructor: ( @name, @uuid, @start, @end, @dow_a ) ->
    unless @name?
      throw new Error "new Schedule requires a name first"

    @zone = process.env.TZ || 'Europe/London'

    @isoDays = []
    # how many times is this schedule referenced by a rule?
    @ref_count = 0

    # timespans { start: <seconds since midnight>, end: <seconds since midnight>}
    @timespans = []

    # check if end time is earlier than start time
    start = @convertTime @start
    end = @convertTime @end
    if end < start
      # starts at midnight
      @timespans.push { start: 0, end: end }
      # ends at midnight following day
      @timespans.push { start: start, end: 24 * 60 * 60 }
    else
      @timespans.push { start: start, end: end }


    @isoDays = @dow_a.map (day) ->
      moment day, "dddd"
      .isoWeekday()

  ref_count_increment: () ->
    @ref_count += 1

  ref_count_decrement: () ->
    @ref_count -= 1

  is_referenced: () ->
    @ref_count >= 1

  # Convert the running rule back into an object
  to_yaml_obj: ( options = {} ) ->


    obj =
      name:         @name
      uuid:         @uuid
      start:        @start
      end:          @end
      days:         @dow_a
    debug 'to_yaml_obj', obj
    obj

  is_in: (momentNow = momentZone.tz( @zone )) ->
    logger.info "is_in() today is ", momentNow.isoWeekday()
    logger.info "is_in() rule days ", @isoDays
    # @start, @end HH:MM
    if @isoDays.includes momentNow.isoWeekday()
      # check times
      secondsSinceMidnight = @convertTime momentNow.format('HH:mm')
      results = @timespans.map ( timeRange ) ->
        debug "Range Check " + timeRange.start + " -> " + timeRange.end + ", " + secondsSinceMidnight
        timeRange.start < secondsSinceMidnight && secondsSinceMidnight <= timeRange.end

      logger.info "is_in() timespan results: ", results
      return results.includes true
    else
      logger.info "is_in() natural false"
      false
