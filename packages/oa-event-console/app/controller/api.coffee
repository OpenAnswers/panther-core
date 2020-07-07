
#  Logging module
{ logger, debug } = require('oa-logging')('oa:event:controller:api')

# oa modules
{ Action
  Select
  Option } = require 'oa-event-rules'
{ Field } = require '../../lib/field'


# Get the config so we can report on our ruleset
# oa-config?
config     = require('../../lib/config').get_instance()



class @Api

  # Getter for the plain http calls
  @get: ( name, req, res, next ) =>
    debug 'api get name', name
    
    unless @[name]?
      return res.status(404).json
        name: 'error'
        code: '404'
        message: "No #{name}"
    
    res.send @[name]()
  

  # Getter for the http by id calls
  @get_id: ( name, req, res, next ) =>
    debug 'api get name id', name
    
    # not there, could do this upfront or in param middleware
    unless @[name]?
      return res.status(404).json
        name: 'error'
        code: '404'
        message: "No #{name}"
    
    obj = @[name] req.params.id
    
    # somethings wrong
    unless obj? and obj.data?
      return res.status(404).json
        name: 'error'
        message: "Not found: #{name} #{req.params.id}"

    res.send obj



  @actions: ->
    name: 'actions'
    data: Action.types_list()

  @actions_obj: ->
    name: 'actions_obj'
    data: Action.types_description

  @action: (id) ->
    debug 'api get action', id
    action_list = Action.types_description[id]
    return undefined unless action_list?
    {
      name: 'action'
      id: id
      data: action_list
    }


  @selects: ->
    name: 'selects'
    data: Select.types_list()

  @selects_obj: ->
    name: 'selects_obj'
    data: Select.types_description

  @select: (id) ->
    select_list = Select.types_description[id]
    return undefined unless select_list?
    name: 'select'
    id: id
    data: Select.types_description[id]



  @options: ->
    name: 'options'
    data: Option.types_list()

  @options_obj: ->
    name: 'options_obj'
    data: Option.types_description

  @option: (id) ->
    option_list = Option.types_description[id]
    return undefined unless option_list?
    name: 'option'
    id: id
    data: Option.types_description[id]


  @fields: ->
    name: 'fields'
    data: Field.list()

  @fields_obj: ->
    name: 'fields_obj'
    data: Field.definition

  @field: (id) ->
    name: 'field'
    id: id
    data: Field.definition[id]


  @groups: ->
    name: 'groups'
    data: config.rules.server.groups.names()

  @group: (id) ->
    name: 'groups'


  @global: ->
    name: 'global'
    data: config.rules.server.globals

# not implemented
# CHANGEME
#  @rules: ->
#    name: 'rules'
#    data: Rule.list()
#
#  @rule: (id) ->
#    logger.debug "blah"
#
#    name: 'rule'
#    data: Rule.definitions id

