# 
# Copyright (C) 2023, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#  

# oa modules
Errors          = require 'oa-errors'
{throw_error, _, delay, objhash} = require 'oa-helpers'

# NPM modules

moment          = require 'moment'

class @DayTime

  #
  # day: <Monday|Tuesday|...>
  # time: 'HH:MM'


  @generate: ( yaml_def ) ->

    throw_error 'No definition' unless yaml_def

    throw_error 'No day' unless yaml_def.day
    throw_error 'No time' unless yaml_def.time
    daytime = new DayTime yaml_def.day, yaml_def.time

  constructor: ( @day, @time) ->
    # day = "Monday"..."Sunday"
    # time = "23:45"
    m_now = moment(""+ @day + "-" + @time, "dddd-HH:mm")
    throw_error "DayTime is invalid" unless m_now.isValid()
    # internally stored as integers
    @dow = m_now.isoWeekday()
    @hour = m_now.hour()
    @minute = m_now.minute()

  to_yaml_obj: ( options={} )->
    obj =
      day: @day
      time: @time
    obj

  @now: () ->
    day_of_week = moment().format("dddd")
    time_of_day = moment().format("HH:mm")
    daytime = new DayTime day_of_week, time_of_day
