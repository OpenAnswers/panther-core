
#  Logging module
{logger, debug} = require('oa-logging')('oa:event:rules:schedules')

# oa modules
{ Schedule }       = require './schedule'
{ _ }           = require 'oa-helpers'
Errors          = require 'oa-errors'


# Groups holds a set of schedules to compare against
# 1 layer of the rule checking
class Schedules

  @generate: ( yaml_def )->
    schedules = new Schedules


    # Create all the groups
    if yaml_def
      for schedule in yaml_def 
        debug 'generating schedules for ', schedule
        schedules.add Schedule.generate( schedule )

    @schedules = schedules
    schedules

  @find_by_name: (name) -> 
    @schedules.get name

  constructor: ( options )->

    @store_map = new Map()
    add schedule for schedule in options.schedules if options?.schedules

  add: ( schedule )->
    @store_map.set schedule.name, schedule

  get: ( schedule_name )->
    @store_map.get( schedule_name)

  get_all: ()->
    Array.from @store_map.values()
 
  del: ( schedule_name )->
    unless @store_map.has schedule_name
      throw new Errors.ValidationError "Schedule isn't in the store [#{schedule_name}]"
    @store_map.delete schedule_name

  
  count: ()->
    @store_map.size
 
  names: ()->
    Array.from @store_map.keys()
 
  # Take a group, move it in the hash
  # Move it in the order array
  # Change it's internal name 
  
  update_schedule_name: ( previous_name, new_name )->
    #TODO
    false


  has_schedule: ( schedule_name )->
    @store_map.has schedule_name

  # Convert the groups to yaml
  to_yaml_obj: ( options = {} )->
    obj=[]


    @store_map.forEach (schedule, schedule_name)->
      obj.push schedule.to_yaml_obj()
    obj


module.exports =
  Schedules:          Schedules
