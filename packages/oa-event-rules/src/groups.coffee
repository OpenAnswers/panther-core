
#  Logging module
{logger, debug} = require('oa-logging')('oa:event:rules:groups')

# oa modules
{ Group }       = require './group'
{ _ }           = require 'oa-helpers'
Errors          = require 'oa-errors'


# Groups holds a set of groups to match against
# 1 layer of the rule checking
class Groups

  @generate: ( yaml_def )->
    groups = new Groups


    # Create all the groups
    for group, info of yaml_def when group isnt '_order'
      debug 'generating rules for group', group
      groups.add Group.generate group, info

    # Deal with store_order, if it's there
    if yaml_def._order

      unless _.isArray yaml_def._order
        throw new Errors.ValidationError "Group store_order must be an array"
      
      groups.store_order = _.clone yaml_def._order
      keys = _.keys yaml_def
      keys = _.without keys, '_order'

      extra = _.difference( yaml_def._order, keys )
      if extra.length > 0
        logger.error "Group store_order [%s] has extra group keys [%s] "+
          " compared to the group keys [%s]"+
          " Appending missing groups to the end of _order",
          groups.store_order.join(', '), extra.join(','), keys

        groups.store_order = _.without groups.store_order, extra
        logger.info "Store order is now [%s]", groups.store_order.join(', ')

      missing = _.difference( keys, yaml_def._order )
      if missing.length > 0
        logger.error "Group store_order [%s] is missing keys [%s]."+
          " compared to the group keys [%s]"+
          " Appending missing groups to the end of _order",
          groups.store_order.join(', '), missing.join(','), keys
        groups.store_order.push missing...
        logger.info "Store order is now [%s]", groups.store_order.join(', ')


    groups

  constructor: ( options )->
    @store = {}
    @store_order = []
    add group for group in options.groups if options?.groups

  add: ( group )->
    if group.name is '_order'
      throw new Errors.ValidationError "Group can't use the name _order [#{group.name}]"
    if @store[group.name]
      throw new Errors.ValidationError "Group already exists [#{group.name}]"
    if @store_order.indexOf(group.name) > -1
      throw new Errors.ValidationError "Group half exists!? [#{group.name}] [#{@store_order}]"
    @store[group.name] = group
    debug 'order add', group.name, @store_order
    @store_order.push group.name #unless _.indexOf(@store_order, group.name)

  get: ( group )->
    @store[group]
 
  del: ( group )->
    idx = @store_order.indexOf group
    grp = @get group
    unless grp
      throw new Errors.ValidationError "Group isn't in the store [#{group}] [#{_.keys(@store).join(',')}]"
    if idx is -1
      throw new Errors.ValidationError "Group isn't in the order array [#{group}] [#{@store_order.join(',')}]"
    delete @store[group]
    @store_order.splice(idx, 1)
    debug 'after delete', _.keys @store, @store_order
    true
  
  count: ()->
    _.keys(@store).length
 
  names: ()->
    @store_order
 
  # Take a group, move it in the hash
  # Move it in the order array
  # Change it's internal name 
  update_group_name: ( previous_name, new_name )->
    unless @store[previous_name]
      throw new Errors.ValidationError "Group doesn't exist in store [#{previous_name}]"
    if @store[new_name]
      throw new Errors.ValidationError "Group name already exists store [#{new_name}]"
    idx = @store_order.indexOf previous_name
    if idx is -1
      throw new Errors.ValidationError "No name in `store_order` [#{previous_name}] [#{@store_order}]"
    @store[new_name] = @store[previous_name]
    @store[new_name].name = new_name
    @store_order[idx] = new_name
    delete @store[previous_name]
    @store[new_name]


  # ###### move( index, new_index )
  # Move a group from it's current location to a new one
  move: (oldPos, newPos)->
    if (oldPos < 0) || ( oldPos >= @store_order.length)
      debug "oldPos = #{oldPos} length=#{@store_order.length}"
      throw new Errors.ValidationError "Incorrect store position"
    if (newPos < 0) || ( newPos >= @store_order.length)
      debug "newPos = #{newPos} length=#{@store_order.length}"
      throw new Errors.ValidationError "Incorrect store position"

    groupToMove = @store_order[oldPos]
    @store_order.splice( oldPos, 1 )
    @store_order.splice( newPos, 0, groupToMove )
 
  event_rules: ( parent )->
    @_event_rules = parent
    for group in @store_order
      @store[group].event_rules parent

  run: ( event_obj )->
    for group in @store_order
      @store[group].run event_obj
      if event_obj.stopped()
        debug "stopping all rules from ", group.uuid
        break

  find: ( id )->
    r = []
    for group in @store_order
      r = @store[group].find id
    _.flatten r

  has_group: ( group )->
    @store[group] || false

  # Convert the groups to yaml
  to_yaml_obj: ( options = {} )->
    obj={}
    obj._order = _.clone @store_order
    for group in @store_order
      throw new Error "Missing group [#{group}]" unless @store[group]
      obj[group] = @store[group].to_yaml_obj()
    obj


class PrimaryGroups extends Groups


class SecondaryGroups extends Groups




module.exports =
  Groups:          Groups
  PrimaryGroups:   PrimaryGroups
  SecondaryGroups: SecondaryGroups
