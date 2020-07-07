# Data Acquisition Class 
# ===============================
# This class provides methods to fetch commonly used data from the API,
# the results of which are stored in static attributes of the class.

class @Data
  @logger = debug 'oa:event:rules:shared-data'
  # Defines used when establishing a data type.
  @TYPE_NUMBER  = 0
  @TYPE_STRING  = 1
  @TYPE_REGEX   = 2
  @TYPE_UNKNOWN = 3

  @pages = [ 'globals', 'groups', 'http', 'syslog', 'graylog']

  @type: null
  @sub_type: null

  # Arrays for the data we will be fetching.
  @globalRules           = []
  
  @groupRules            = []
  @groups                = {}
  @groupNames            = []
  @ruleMatches           = {}

  @agentMappings         = {}
  @agentRules            = []
  
  @selectorOperators     = []
  @selectorOperatorNames = []
  
  @actions               = []
  @actionNames           = []
  
  @fields                = []

  @scheduleNames         = []

  # Some items act more like "options" so aren't
  # renderred in the normal UI
  @hiddenSelectors= [
    "all"
    "none"
  ]

  # Return the overall type
  @whichRulesPage: ->
    if Data.sub_type is 'groups'
      'groups'
    else if Data.sub_type is 'globals'
      'globals'
    else if Data.type is 'agent'
      'agents'
    else
      console.log 'no rules page??', @type, @sub_type
      false

  # Fetch the data for a rule type from the server
  @getRules  = ( type = @type, sub_type = @sub_type  ) ->
    promise_fn = Data.getRulesPromise()
    unless promise_fn
      Message.error 'No way to get data for', type, sub_type

    promise_fn()
    .then ( response )->
      Data.logger 'data done', response
      response
    .catch (error)->
      console.error 'Data retrieval failed', error
      Message.error 'Data retrieval failed - ' + error

  @getRulesPromise:( type = @type, sub_type = @sub_type )->
    switch Data.whichRulesPage()
      when "globals" then Data.getGlobalRules
      when "groups" then Data.getGroupRules
      when "agents" then Data.getAgentRules
      else
        Message.error( "No rule type [#{Data.whichRulesPage()}] to get from server")
        undefined

  @getServerRules: ()->
    new Promise(resolve,reject) ->
      socket.emit 'event_rules::read', {type:'server'}, (error,data)->
        if error
          console.error 'socketio error', error.message
          return reject(error) 
        Data.serverRules = data.globals
        resolve data


  # Get Global Rules
  # ----------------
  # Fetch the current global rules via Socket.IO.
  @getGlobalRules: ( type = 'server' )->
    new Promise (resolve, reject) ->
      socket.emit 'event_rules::read', {type:type}, (error, data) ->
        if error
          console.error 'socketio error', error.message
          return reject(error) 
        Data.globalRules = data.globals.rules
        Data.groups = data.groups
        resolve data

  # Get Group Rules
  # ----------------
  # Fetch the current group rules via Socket.IO.
  @getGroupRules: ( type = 'server' )->
    new Promise (resolve, reject) ->
      socket.emit 'event_rules::read', {type:type}, (error, data) ->
        return reject(error) if error
        Data.groupRules = data.groups
        resolve data

  # Get Group Rules
  # ----------------
  # Fetch the current group rules via Socket.IO.
  @getAgentRules: ( agent_id = Data.sub_type )->
    new Promise (resolve, reject) ->
      reject('No agent type was provided') unless agent_id
      msg =
        type:'agent'
        sub_type: agent_id
      socket.emit 'event_rules::read', msg, (error, data) ->
        return reject(error) if error
        rules = _.get data, 'agent.rules'
        reject('No agent rules') unless rules
        Data.agentRules = data.agent.rules
        Data.agentMappings = data.agent
        resolve data

  # Get Group Names
  # ---------------
  # Returns an array of available groups.
  @getGroupNames = ->
    new Promise (resolve, reject) ->
      socket.emit 'rules::groups', {}, (error, data) ->
        return reject(error) if error
        Data.groupNames = data
        resolve data

  # Get Event Fields
  # ----------------
  # Fetch the possible event fields from the API.
  @getFields: ->
    Promise.resolve($.get "/api/fields")
    .then (data) ->
      Data.fields = data.data

  # Get Selector Operators
  # ----------------------
  # Fetch the current selectors from the API.
  @getSelectorOperators: ->
    Promise.resolve($.get "/api/selects_obj")
      .then (data) ->
        # Store the full results in one array, then create
        # an array with just the names for convenience later.
        Data.selectorOperators = data.data
        for k,v of data.data when k not in Data.hiddenSelectors
          Data.selectorOperatorNames.push k

  # Get Actions
  # -----------
  # Fetch the current actions from the API.
  @getActions: ->
    Promise.resolve($.get "/api/actions_obj")
      .then (data) ->
        Data.actions = data.data
        for k,v of data.data when k not in Data.hiddenSelectors
          Data.actionNames.push k

  # Get Schedule Names
  # ------------------
  # Fetch the current schedule names from the API
  @getScheduleNames: ->
    new Promise (resolve,reject)->
      socket.emit "schedules::index", {}, (error, data) ->
        return reject(error) if error
        Data.scheduleNames = data.data
        resolve data.data


  # Determine Data Type
  # -------------------
  # Some basic string parsing to establish a data type (for YAML),
  # not a JavaScript data type. Currently unused.
  @getDataType = (value) ->
    if $.type(value) == "number"
      return Data.TYPE_NUMBER
    if $.type(value) == "string"
      if value.charAt(0) == "/" and value.slice(-1) == "/"
        return Data.TYPE_REGEX
      else
        return Data.TYPE_STRING
    return Data.TYPE_UNKNOWN

  @isRuleSetEdited: ->
    type = Data.type
    type = 'agent' if type is 'agents'
    msg = { type: type, sub_type: Data.sub_type }
    socket.emit 'event_rules::edited', msg, (error, data) ->
      if data?.edited
        UI.showSaveRulesDialog()
      else
        Data.logger 'Weird edited data', data

  @getRuleMatches: ->
    new Promise (resolve, reject) ->
      socket.emit 'event_rules::matches::read', {}, (error, data) ->
        if error
          console.error 'socketio error', error.message
          return reject(error) 
        Data.ruleMatches = data
        resolve data

