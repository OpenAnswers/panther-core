
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

# ### Group

# Holds a groups worth of rules.
# Includes a matcher for the group
#  and an action to set the group name

schema_schedule = Joi.object
  name: Joi.string().regex(/^[a-zA-Z0-9_\- ]+$/).required()
  uuid: Joi.string().guid().optional().default( nodeuuid() )
  start: Joi.string().regex(/^[012][0-9]:[0-5][0-9]$/).required()
  end: Joi.string().regex(/^[012][0-9]:[0-5][0-9]$/).required()
  days: Joi.array().items( Joi.string().valid(['Monday', 'Tuesday', 'Wednesday','Thursday','Friday','Saturday','Sunday'])) 

compiled_schedule = Joi.compile schema_schedule

default_validate_options =
  allowUnknown: false

class @Schedule

  # returns Promise<yaml_def>
  @validate: (yaml_def) ->
    Joi.validate yaml_def, compiled_schedule, default_validate_options
    .catch (error) ->
      logger.error "Joi Validation failed on Schedule: ", error
      Errors.throw_a Errors.ValidationError "Incorrect schedule definition"


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

    @validate yaml_def, compiled_schedule
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

  is_in: (momentNow = moment()) ->
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
