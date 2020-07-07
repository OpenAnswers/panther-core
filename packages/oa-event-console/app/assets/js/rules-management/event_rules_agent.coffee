# -------------------------------------------------------
# ## Class EventRulesAgent

class @EventRulesAgent extends EventRules
  @logger = debug 'oa:event:rules:event_rules_agent'

  @generate: ( yaml_def, options = {} )->
    @logger 'generating EventRulesAgent from', yaml_def, options
    options.yaml = yaml_def
    new @ options

  constructor: ( options = {}, execute = true )->
    if execute == true
      super {}, false
      @eventrules_agent_init options

  eventrules_agent_init: ( options = {} )->
    self = @
    @type = 'agent'

    @yaml = options.yaml
    @build_from_yaml() if @yaml

    @event_rules_init options

    # @group_rule_set = new GenericGroup
    #   name: 'rule_set'
    #   label: 'Agent Rules'
    #   grouped: @rule_set
    #   template_grouped_id: '#ruleset-grouping-replace-me'


  build_from_yaml: ()->
    self = @
    agent = @yaml.agent
    @logger 'building agent', _.keys(agent).join ','
    
    @rule_set = RuleSet.generate agent.rules,
      event_rules: @

    # Create a group ui for the identifer.
    # `template_grouped_id` is a bit of a hack to get
    # the RuleSet into a `<ul>`
    @group_rule_set = new GenericGroup
      label: 'Agent Rules'
      label_detail: 'Rules processed for this agent'
      name: 'rule_set'
      grouped: @rule_set
      template_grouped_id: '#ruleset-grouping-replace-me'

    # Create an input ui for identifer
    @identifier       = new GenericInputLabelValue
      name: 'identifier'
      value: agent.identifier
      #label: 'Default Event Identifier'
      save_Async: ( yaml_data )->
        self.update_agent_Async( yaml_data )
      refresh_Async: ( data )->
        self.refresh_agent_Async( data )

    # Create a group ui for the identifer
    @group_identifier = new GenericGroup
      label: 'Default Event Identifier'
      label_detail: 'Use unless otherwise set by rules'
      name: 'identifier'
      grouped: @identifier


    # Create an input ui for identifer
    @field_map        = new GenericInputFieldValues
      name: 'field_map'
      field_values: agent.field_map
      #label: 'Field Mapping'
      heading: field: 'Source', value: 'Destination'
      size_join: 1
      join_text: 'to'
      size_delete: 1
      save_Async: ( yaml_data )->
        self.update_agent_Async( yaml_data )
      refresh_Async: ( data )->
        self.refresh_agent_Async( data )
      new_handler: ".rules-agent-create-mapping"
      
    @group_field_map  = new GenericGroup
      label: 'Field Mapping'
      name: 'field_map'
      grouped: @field_map


    @field_transform  = new GenericInputFieldEnumsArray
      name: 'field_transform'
      field_values: agent.field_transform
      #label: 'Field Transform'
      heading: field: 'Field', value: 'Transform'
      options_list: [
        {label: 'Lower Case', value: 'to_lower_case'}
        {label: 'Upper Case', value: 'to_upper_case'}
        {label: 'Left Trim', value: 'right_trim'}
        {label: 'Right Trim', value: 'left_trim'}
        {label: 'Trim', value: 'trim'}
      ]
      save_Async: ( yaml_data  )->
        self.update_agent_Async( yaml_data )
      refresh_Async: ( data )->
        self.refresh_agent_Async( data )
      new_handler: ".rules-agent-create-transform"

    @group_field_transform = new GenericGroup
      label: 'Field Transform'
      label_detail: 'Minor detail on field transforms'
      name: 'field_transform'
      grouped: @field_transform
      collapsable: true
      addable: ->
        self.field_transform.add_new_entry()
      help: "Transform a field on the way through the agent. "+
        "There are a set of common transforms available to use"


  deploy: ()->
    throw new Error "Do some agenty socketio stuff"

  update_agent_Async: ( yaml_data )->
    vasdfar = 'whatever'
    @logger 'sending to socketio_Async', yaml_data
    @socketio_Async 'event_rules::agent::update', yaml_data

  refresh_agent_Async: ( data )->
    self = @
    if data and data.agent then return refresh_input_data(data)
    @socketio_Async 'event_rules::read', {}
    .then ( res )->
      unless res.agent
        throw new Error "No `agent` in data"
      self.refresh_input_data(res)

  refresh_input_data: (data)->
    @identifier.set_value data.agent.identifier
    @field_map.set_field_values data.agent.field_map
    @field_transform.set_field_values data.agent.field_transform
    if @severity_map
      @severity_map.set_field_values data.agent.severity_map
    true

  render: ( options )->
    @.$container.html ''
    @.$container.append @group_identifier.render()
    @.$container.append @group_field_map.render()
    @.$container.append @group_field_transform.render()
    @.$container.append @group_rule_set.render()
    @handlers()
    @.$container

    # $agentTemplate = @getContainerElement()
    # $agentTemplate.html()
    # $agentTemplate.append
    # $agentTemplate.append @rule_set.render()

  # ### handlers()
  handlers: ( options = {} )->
    self = @
    
    $(document).off('click.global-create')
    .on 'click.global-create', '.btn-rules-global-create-rule', (ev)->
      self.logger 'click .btn-rules-global-create-rule'
      self.createNewRule()
      window.scrollTo(0, document.body.scrollHeight)


# -------------------------------------------------------
# ## Class EventRulesAgentHttp

class @EventRulesAgentHttp extends EventRulesAgent
  @logger = debug 'oa:event:rules:event_rules_agent_http'

  constructor: ( options = {} )->
    super {}, false
    @sub_type = 'http'
    @name = 'HTTP'
    @logger = @constructor.logger
    @container_id = "event-rules-agent-http"
    @eventrules_agent_init options


class EventRulesAgentSyslogish extends EventRulesAgent

  # Add an additional input setup
  build_from_yaml: ->
    super()
    self = @
    # Create out severity map input group
    @severity_map  = new GenericInputLabelValues

      name: 'severity_map'
      field: 'severity_map'
      field_values: @yaml.agent.severity_map
#      label: 'Severity Mapping'

      size_field: 2
      size_value: 2

      heading:
        field: 'Severity'
        value: 'Panther'

      validate_fn: (val)->
        self.logger 'validation val',val
        if val isnt "#{parseInt(val)}"
          return { ok: false, message: "Integers only" }
        if [-1,0,1,2,3,4,5,"-1","0","1","2","3","4","5"].indexOf(val) is -1
          return { ok: false, message: "Number must be -1 to 5" }
        { ok: true }

      save_Async: ( yaml_data  )->
        self.update_agent_Async( yaml_data )

      refresh_Async: ()->
        self.refresh_agent_Async()

    # Add the severity map to a group ui
    @group_severity_map = new GenericGroup
      label: 'Severity Mappings'
      label_detail: 'Minor detail on field transforms'
      name: 'severity_map'
      grouped: @severity_map

  render: ()->
    @.$container.html ''
    @.$container.append @group_identifier.render()
    @.$container.append @group_field_map.render()
    @.$container.append @group_severity_map.render()
    @.$container.append @group_field_transform.render()
    @.$container.append @group_rule_set.render()
    @handlers()
    @.$container


# -------------------------------------------------------
# ## Class EventRulesAgentGraylog

class @EventRulesAgentGraylog extends EventRulesAgentSyslogish
  @logger = debug 'oa:event:rules:event_rules_agent_graylog'

  constructor: ( options = {} )->
    super {}, false
    @sub_type = 'graylog'
    @name = 'Graylog'
    @container_id = "event-rules-agent-graylog"
    @logger = @constructor.logger
    @eventrules_agent_init options


# -------------------------------------------------------
# ## Class EventRulesAgentSyslogd

class @EventRulesAgentSyslogd extends EventRulesAgentSyslogish
  @logger = debug 'oa:event:rules:event_rules_agent_syslogd'

  constructor: ( options={} )->
    super {}, false
    @sub_type = 'syslogd'
    @name = 'Syslog'
    @container_id = "event-rules-agent-syslogd"
    @logger = @constructor.logger
    @eventrules_agent_init options
