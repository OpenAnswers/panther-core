# # AgentGraylog

# (c) OpenAnswers Ltd 2015
# matt@openanswers.co.uk

# logging
{logger, debug} = require('oa-logging')('oa:event:rules:agent:syslog')

# oa modules
Errors          = require 'oa-errors'
{ Agent }       = require './agent'


# ## class AgentGraylog

# The Graylog class represents the graylog processing compenent of the rules.
# It houses all the logic to turn a graylog message into a event console event
# Graylog can contain a RuleSet for graylog specific processing.
# Like TAG/Darmon/PID processing


class AgentGraylog extends Agent

  # The default identifier for the graylog agent
  @identifier: '{node}:{app}:{logger}:{severity}:{short_message_ident}'

  # Generate a graylog object instance from a yaml definitions
  # Loading fields if they exist

  @generate: ( yaml_def ) ->
    graylog = new AgentGraylog
    super yaml_def, graylog
    throw new Errors.ValidationError 'No definition' unless yaml_def?

    debug 'generating graylog from', yaml_def

    if yaml_def.severity_map
      graylog.severity_map yaml_def.severity_map

    graylog


  constructor: ( options = {} )->
    @_type = 'graylog'
    @_name = 'Graylog'
    super options
    if @constructor.identifier
      @_identifier = @constructor.identifier

  # Load the graylog info from a file
  load: ( path = @path )->
    debug 'Reading graylog yaml file', @path
    super path

    if @doc.agent?.severity_map
      @severity_map @doc.agent.severity_map


  # ### Instance properties

  # Store the severity mappings
  severity_map: ( _severity_map )->
    if _severity_map then @_severity_map = _severity_map
    @_severity_map


  # ###### run( event_object )
  # Run the log event through all the graylog specific mappings
  run: ( event_obj )->

    # Map graylog severities to event severities
    @run_severity_map( event_obj )

    # Run the rest of the Agent basics
    super event_obj

    event_obj


  # ###### run_severity_map( event_object )
  # Map the graylog severity to an event console severity
  # Modifies event_obj
  run_severity_map: ( event_obj )->
    sev = event_obj.get_input 'severityID'
    sev_map = @_severity_map[sev]
    debug 'mapping sev of', sev, sev_map, @_severity_map
    if sev_map
      event_obj.set 'severity', sev_map
    else
      logger.error 'No severity mapping for sev [%s]', sev, event_obj, @_severity_map, ''


  # Convert graylog structure to yaml
  to_yaml_obj: ()->
    obj = super
    obj.severity_map = @_severity_map
    obj
  
  to_yaml: ()->
    yaml.dump @to_yaml_obj()


module.exports =
  AgentGraylog: AgentGraylog
