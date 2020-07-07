# EventRules Management Class
# =====================

# This class handles the complete set of data for each
# Type of EventRule. Provides a single interface to
# Access the data and do global things like "render"


#     EventRulesServer
#       Groups Group RuleSet
#       Global RuleSet
#     EventRulesHttp
#       AgentRules
#       RuleSet
#     EventRulesGraylog
#       AgentRulesSyslog
#       RuleSet
#     EventRulesSyslog
#       AgentRulesSyslog
#       RuleSet

# -------------------------------------------------------
# ## Class EventRules

# Needs a page with an #event_rules container and it will
# take it from there

class EventRules
  @debugNamespace = 'oa:event:rules:eventrules'
  @logger = debug "#{EventRules.debugNamespace}"

  # A store for the inited rules so html based events
  # can or external things can look up via type/subtype
  @store: {}

  @init: ( type, sub_type )->
    event_rules = switch Data.whichRulesPage()
      when 'groups' then new EventRulesServerGroupsView
      when 'globals' then new EventRulesServerGlobalView
      when 'agents'
        switch sub_type
          when 'http' then new EventRulesAgentHttp
          when 'syslogd' then new EventRulesAgentSyslogd
          when 'graylog' then new EventRulesAgentGraylog
          else Message.error("No agent type [#{sub_type}] to render ")
      else Message.error("No rules type to render #{Data.whichRulesPage()}")

    event_rules.render()
    event_rules


  # Detect the event rules type from the yaml object passed in
  # Generate client event rules from yaml structure
  @generate: ( yaml_obj, options )->
    EventRules.logger 'generating from yaml object', yaml_obj, options

    # Check if we are an agent
    if yaml_obj.agent
      switch yaml_obj.agent.type
        when 'http'
          EventRulesAgentHttp.generate yaml_obj, options
        when 'syslogd'
          EventRulesAgentSyslogd.generate yaml_obj, options
        when 'graylog'
          EventRulesAgentGraylog.generate yaml_obj, options
        else
          throw new Error "Unsupported agent type [#{yaml_obj.agent.type}]"

    # Otherwise we are global and groups
    else if yaml_obj.globals and yaml_obj.groups
      if Data.sub_type is 'globals'
        EventRulesServerGlobalView.generate yaml_obj, options
      else if Data.sub_type is 'groups'
        EventRulesServerGroupsView.generate yaml_obj, options
      else
        throw new Error 'Don\'t have a server view to render'
    else
      throw new Error 'Unknown yaml data structure'


  # `new EventRules`
  # This should be called, its for the child classes to use
  constructor: ( options = {}, execute = true )->
    if execute == true
      @event_rules_init options


  event_rules_init: ( options = {} )->
    @logger ?= @constructor.logger

    @type ?= @constructor.type
    throw new Error 'new property `type` must be set' unless @type
    
    @sub_type ?= @constructor.sub_type
    throw new Error 'new property `sub_type` must be set' unless @type

    #@rule_set ?= options.rule_set or new RuleSet
      #event_rules: @

    @container_id ?= options.container_id
    @container_selector = "#" + @container_id

    @$container = options.$container
    throw new Error unless @$container and @$container.length > 0

    # Server Data for type
    @data ?= options.data

    @yaml = options.yaml
    @build_from_yaml() if @yaml

    @initial_handlers()

    
  # Promise a socketio message
  socketio_Async: ( route, data, options )->
    self = @
    @logger 'socketio_Async starting %s', route, data, options
    new Promise ( resolve, reject )->
      $('.request-spinner').removeClass 'hidden'

      msg = {
        type: @type
        sub_type: @sub_type
      }

      msg.group = options.group if options and options.group?
      msg.data = data
      
      unless msg.data
        reject new Error 'Update socket message requires data to send'

      self.logger 'socketio_Async sending %s', route, msg
      socket.emit route, msg, ( err, response )->
        if err
          console.error 'Problem with message [%s]', route, msg, err
          
          # So socket errors are serialised as plain objects
          # Server side Error classes are replicated in the client
          # We lookup the `name` an recreate the error class
          # Bluebird likes to have real errors....
          reject ErrorType.from_object(err)

        self.logger 'got response to [%s]', route, response
        resolve response
    .finally ->
      $('.request-spinner').addClass 'hidden'

  # -------------------
  # `.refresh_Async()
  # Trigger refresh up the chain until the data source is
  # refreshed. Single Rules can't be refreshed on their own
  # at the moment
  refresh_Async: ( options = {} ) ->
    self = @
    new Promise (resolve, reject)->
      self.socketio_Async 'event_rules::read', {}, options
      .then ( results )->
        self.logger 'Setting new yaml', _.keys(results)
        self.yaml = results
        self.build_from_yaml()
        self.render()
        self.enable_sortable()
        resolve results
      .catch ( error )->
        reject error


  # `appendAllRules()`
  appendAllRules = ->
    throw new Error "appendAllRules() not implemented"

  # `render()`
  render: ()->
    throw new Error "render() not implemented"


  # -----------------------------------------------------
  # `getContainerElement()` returns a jquery ref to the main
  # page event rules container.
  getContainerElement: ()->
    @$container


  # -----------------------------------------------------
  # `createNewRule()`
  createNewRule: ()->
    @rule_set.createNewRule()


  # -----------------------------------------------------
  # `enable_sortable()`
  enable_sortable: () ->
    @rule_set.enable_sortable()

  # -----------------------------------------------------
  # `disable_sortable()`

  disable_sortable: ->
    @rule_set.disable_sortable()

  collapse_all: ( flag )->
    @rule_set.collapse_all(flag)

  doSearchAndFilter: ()->
    @rule_set.doSearchAndFilter()
  
  searchWarning: ->
    searchWarning = $("#search-warning")
    if $("#sidebar-search-box").val() != "" || ActionFilters.actionFilters.length > 0
      searchWarning.show()
    else
      searchWarning.hide()

  deploy_Async: ->
    self = @
    @socketio_Async 'event_rules::save', {}

  discard_Async: ->
    self = @
    @socketio_Async 'event_rules::discard_changes', {}

  initial_handlers: ->
    self = @

    # Confirm deploy
    $(".navbar-nav .nav-quick-deploy .btn-success").off('click').on 'click', ->
      self.logger 'deploy/save clicked'
      self.deploy_Async().then ->
        self.refresh_Async()
        self.render()
        UI.hideSaveRulesDialog()

    # Cancel deploy
    $(".navbar-nav .nav-quick-deploy .btn-danger").off('click').on 'click', ->
      self.logger 'deploy/discard clicked'
      self.discard_Async().then ->
        self.refresh_Async()
        self.render()
        self.collapse_all()
      .then ->
        UI.hideSaveRulesDialog()

    socket.on 'event_rules::reloaded', (data) ->
      $("#modal-reload-rule").modal( { backdrop: 'static', keyboard: false } )
      # hide the save dialog
      UI.hideSaveRulesDialog()


    socket.on 'event_rules::edited', (data) ->
      Message.info "Rules have been edited, Deploy when ready"
      UI.showSaveRulesDialog()


    #handleClearFiltersAndSearch: ->
    $('#search-clear-button').click ->
      ActionFilters.removeAllActionFilters()
      $("#sidebar-search-box").val ""
      Data.event_rules.doSearchAndFilter()

    #handleSearchChange: ->
    $("#sidebar-search-box").on 'keyup', (ev) ->
      self.doSearchAndFilter()

    #handleSidebarFilterClick = ->
    $(".sidebar .tags .entry").off('click').on 'click', ->
      ActionFilters.toggleTag($(this))
      Data.event_rules.doSearchAndFilter()

    # stop text selection on quick clicking of buttons
    $('#event-rules .buttons').disableSelection()


# -----------------------------------------------------
# ## Class EventRulesServer

class @EventRulesServer extends EventRules
  
  @logger = debug ('oa:event:rules:event_rules_server')
  @type = 'server'

  @generate: (yaml_obj, options = {} ) ->
    EventRulesServer.logger 'generating', yaml_obj
    event_rules_server = new EventRulesServer
    event_rules_server.eventrules_server_init()
    event_rules_server

  constructor: () ->

  eventrules_server_init: ( options = {} )->
    @container_id ?= "event-rules-server"
    @logger ?= @constructor.logger
    @groups = options.groups or new Groups(event_rules:@)
    @event_rules_init options

  deploy: () ->
    throw new Error "Do some servery socketio stuff"
    
  render: () ->
    @$container.append @rule_set.render()
    @$container.append @groups.render()

  getGroup: ( group ) ->
    groups[group] or throw new Error "No group [#{group}]"


# -------------------------------------------------------
# ## Class EventRulesServerGlobalView

# Unfortunatey Server Rules are split across two pages
# So we need a custom view for each page
class EventRulesServerGlobalView extends EventRulesServer
  
  @logger = debug 'oa:event:rules:event_rules_server_globals'
  @sub_type = 'globals'

  @generate: ( yaml_def, options = {} ) ->
    @logger 'generating', yaml_def

    options.yaml = yaml_def
    new @ options

  # `new EventRulesServerGlobalView {}`
  constructor: ( options = {} ) ->
    super()
    @logger = @constructor.logger
    @container_id = "event-rules-server-globals"
    @eventrules_server_init options
    
  # ###### @build_from_yaml( yaml_Object )
  build_from_yaml: ( yaml_def = @yaml ) ->
    # Create the event rules
    $rule_set = @.$container.find('ul')
    if $rule_set.length < 1
      $cont = $('<ul/>')
      @.$container.append $cont
      $rule_set = $cont

    @rule_set = RuleSet.generate yaml_def.globals.rules,
      $container: $rule_set
      type: @type
      sub_type: @sub_type
      event_rules: @

    @logger 'build from yaml'


  # ###### @render()
  # We don't extend `Rendered` here so add a custom
  # render for consistancy
  render: () ->
    @$container.html('')
    @$container.append @rule_set.render()
    @$container

 
  # ###### initial_handlers()
  initial_handlers: ->
    super()
    self = @

    $(document)
    .off('click.global-create')
    .on 'click.global-create',
    '.btn-rules-global-create-rule', (ev) ->
      self.logger 'click .btn-rules-global-create-rule'
      self.createNewRule()
      window.scrollTo(0, document.body.scrollHeight)
    @setCounters()

  setCounters: () ->
    values = {}
    rule_hits = 0
    rule_counter = @rule_set.rules.length
    
    # iterate through all rules to increment rule_counter and rule_hits
    for rule of @rule_set.rules
      rule_hits += @rule_set.getRule(rule).uuid_tally
      if(@rule_set.getRule(rule).$container.hasClass("no-match"))
        rule_counter--
        rule_hits -= @rule_set.getRule(rule).uuid_tally

    # executes if a search is underway
    if ActionFilters.actionFilters.length > 0 || $("#sidebar-search-box").val() != ""
      values.totalRulesMatched = rule_counter
      values.matchedHitsCounter = rule_hits
      updating = true
    
    else
      values.totalRulesCounter = rule_counter
      values.totalHitsCounter = rule_hits

    # rendering in the html for the counters
    totalInfo = $("#template-total-global-info").html()
    updatedTotalInfo = Mustache.render( totalInfo, values)
    $("#total-counter-info").html updatedTotalInfo
    if updating
      $("#total-counter-info > .matched").removeClass("hidden")
      $("#total-counter-info > .plain").addClass("hidden")
    if rule_counter == 0
      $("#rules-empty").show()
    else
      $("#rules-empty").hide()
      

  doSearchAndFilter: () ->
    @rule_set.doSearchAndFilter()
    if ActionFilters.actionFilters.length > 0
      ActionFilters.renderActionFilter()
    
    
    @setCounters()
    Data.event_rules.searchWarning()

    #update counters for rules matching search term
      # @update_matches()
      # @update_counter()
      # @searchWarning()

  # appendGlobalRules: ->
  #   # It's global rules
  #   for rule, index in Data.globalRules
  #     ruleElem = Rule.generate rule, index
  #     @rule_set.appendRule ruleElem, "none", true


# -------------------------------------------------------
# ## Class EventRulesServerGroupsView

# Unfortunatey Server Rules are split across two pages
# So we need a custom view for the each page
class @EventRulesServerGroupsView extends EventRulesServer
  
  @logger = debug 'oa:event:rules:event_rules_server_groups'
  @sub_type = 'groups'
  
  @generate: ( yaml_def, options = {} )->
    EventRulesServerGroupsView.logger 'generating', yaml_def

    evr_options = _.defaults { yaml: yaml_def }, options
    evr_options.$container = options.$container or $('#event-rules')

    event_rules = new EventRulesServerGroupsView evr_options

  # `new EventRulesServerGroupsView options_Object`
  constructor: ( options = {} ) ->
    super()
    @logger = @constructor.logger
    @eventrules_server_init options
    @container_id = "event-rules-server-globals"
  
  build_from_yaml: ( yaml_def = @yaml ) ->
    @logger 'building groups', _.keys(yaml_def.groups).join ','
    @groups = Groups.generate yaml_def.groups,
      event_rules: @

  # ###### @collapse_all()
  # Override collapse all as we don't have a `rule_set`
  collapse_all: ( flag ) ->
    @groups.collapse_all(flag)

  render: () ->
    $gr = @groups.render()
    @setCounters(false)
    @logger 'Rendering groups to container - [%s]',
      _.keys(@groups.groups).length, @.$container, @groups.$container, $gr
    @.$container.html('')
    @.$container.append $gr
    @.$container

  @createNewRule: ( group ) ->
    getGroup(group).rule_set.createNewRule( group )

  ## ###### appendGroup( group_name )
  #appendGroup: (groupName) ->
     #rulesContainer = $("#rules-sortable")
     #$(ruleElem).appendTo $(rulesContainer)

  # ###### @enable_sortable()
  enable_sortable: () ->
    @groups.enable_extra_sortable()
    @groups.enable_sortable()

  # ###### @disable_sortable()
  disable_sortable: ->
    @groups.disable_sortable()
  
  # override base method for groups
  doSearchAndFilter: () ->

    # iterate over every group, apply search term along with action filter
    @groups.each_group (group) ->
      group.rule_set.doSearchAndFilter()
      if ActionFilters.actionFilters.length > 0
        ActionFilters.renderActionFilter()

      #update counters for rules matching search term
      group.update_matches()

      #update total counter for all groups
      group.update_group_total_counters()

      if group.ruleMatches == 0
        group.hide_group()
    
    # updating counters against search results
    @setCounters()

    # updating the search warning
    Data.event_rules.searchWarning()

  setCounters: () ->
    # object that will be rendered into html
    values = {}

    #checker for initial setup or updating current counters
    if ActionFilters.actionFilters.length > 0 || $("#sidebar-search-box").val() != ""
      updating = true

    # if counters are being updated for a search term
    if updating
      group_matched_counter = 0
      ruleMatches = 0

      # iterate over each group, count total rule and group matches
      @groups.each_group (group) ->
        if group.ruleMatches != 0
          group_matched_counter++
          ruleMatches += group.ruleMatches

      values.totalGroupRulesCounter = ruleMatches
      values.totalGroupsCounter = group_matched_counter

    # if counters are not being updated against a search term
    else
      ruleCount = 0
      @groups.each_group (group) ->
        ruleCount += group.ruleCount
        group.update_group_total_counters()

      values.totalGroupsCounter = @groups.store_order.length
      values.totalGroupRulesCounter = ruleCount

    # html that will be rendered in for the total couters of the group page
    totalInfo = $("#template-total-group-info").html()
    updatedTotalInfo = Mustache.render( totalInfo, values)
    $("#total-counter-info").html updatedTotalInfo
    if updating
      $("#total-counter-info > .matched").removeClass("hidden")
      $("#total-counter-info > .plain").addClass("hidden")
    
    if ruleMatches == 0 || ruleCount == 0
      $("#rules-empty").show()
    else
      $("#rules-empty").hide()