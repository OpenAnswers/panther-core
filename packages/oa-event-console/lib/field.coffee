
#
# Copyright (C) 2020, Open Answers Ltd http://www.openanswers.co.uk/
# All rights reserved.
# This file is subject to the terms and conditions defined in the Software License Agreement.
#

# # Field

# Configures the fields and related data for the console

# Will need to be customised by the client at some point
# Especially the extra fields
# logging
{ logger, debug } = require('oa-logging')('oa:event:field')

# npm modules
yaml = require 'js-yaml'

# oa modules
{ throw_error, map_object, map_clone_object, _ }   = require 'oa-helpers'


# ## Field

class Field

  @definition:

    identifier:
      name:       'identifier'
      priority:   'M'
      alias:      'ident'
      type:       'String'
      label:      'Identifier'
      label_shrt: 'Id'
      size:       150
      uniq:       true
      help:       'Internal Identifier for this event'
      view:
        priority:   600
        default:    false
    
    node:
      name:       'node'
      priority:   'M'
      alias:      'n'
      type:       'String'
      label:      'Node name'
      label_shrt: 'Node'
      size:       150
      help:       'Name of the node that generated the event'
      view:
        priority:   20
        default:    true

    severity:
      name:       'severity'
      priority:   'M'
      alias:      's'
      type:       'Number'
      label:      'Severity'
      label_shrt: 'Sev'
      size:       60
      help:       'Severity of the event (0-5)'
      view:
        priority:   120
        default:    true

    summary:
      name:       'summary'
      priority:   'M'
      alias:      'msg'
      type:       'String'
      label:      'Summary'
      size:       '90%'
      min:        400
      help:       'Summary text of the event'
      view:
        priority:   10
        default:    true

    tag:
      name:       'tag'
      priority:   'C'
      alias:      'app'
      type:       'String'
      label:      'Tag'
      label_shrt: 'Tag'
      size:       90
      help:       'Tag for the event'
      view:
        priority:   20
        default:    true

    group:
      name:       'group'
      priority:   'M'
      alias:      'grp'
      type:       'String'
      label:      'Group'
      label_shrt: 'Grp'
      size:       105
      help:       'The group the event has been associated with'
      view:
        priority:   40
        default:    true

    # secondary_group:
    #   name:       'secondary_group'
    #   priority:   'M'
    #   alias:      'grp2'
    #   type:       'String'
    #   label:      'Group'
    #   size:       '120px'

    agent:
      name:       'agent'
      priority:   'S'
      alias:      'ag'
      type:       'String'
      label:      'Agent'
      size:       105
      help:       'The agent that processed the incoming event'
      view:
        priority:   90
        default:    true


    first_occurrence:
      name:       'first_occurrence'
      priority:   'S'
      alias:      'fo'
      type:       'Date'
      display_type: 'Date'
      label:      'Creation time'
      label_shrt: 'First'
      size:       175
      help:       'When this event first occurred'
      view:
        priority:   100
        default:    true


    owner:
      name:       'owner'
      priority:   'C'
      alias:      'u'
      type:       'String'
      label:      'Owner'
      size:       90
      help:       'Who currently owns this event'
      view:
        priority:   30
        default:    true
    
    tally:
      name:     'tally'
      priority:   'C'
      alias:      't'
      type:       'Number'
      label:      'Tally'
      label_shrt: '#'
      size:       60
      help:       'Number of times this event has occurred'
      view:
        priority:   100
        default:    true
    
    acknowledged:
      name:     'acknowledged'
      priority:   'C'
      alias:      'ack'
      type:       'Number'
      label:      'Ack'
      size:       50
      help:       'Has this event been acknowledged'
      view:
        priority:   150
        default:    false
    
    last_occurrence:
      name:       'last_occurrence'
      priority:   'C'
      alias:      'lo'
      type:       'Date'
      display_type: 'Date'
      label:      'Last Happened'
      label_shrt: 'Last'
      size:       175
      help:       'When this event last occurred'
      view:
        priority:   30
        default:    true
    
    state_change:
      name:       'state_change'
      priority:   'C'
      alias:      'sc'
      type:       'Date'
      display_type: 'Date'
      label:      'Last Changed'
      label_shrt: 'Change'
      size:       175
      help:       'When this event was last updated'
      view:
        priority:   550
        default:    false

    external_id:
      name:       'external_id'
      priority:   'C'
      alias:      'ex'
      type:       'String'
      label:      'External ID'
      size:       90
      help:       'Reference to an external system for this event'
      view:
        priority:   30
        default:    true
    
 
  @w2_column_field_map:
    name:   'field'
    label:  'caption'
    #help:   'title'

  @w2_column_defaults:
    sortable:   true
    resizable:  true

  # Set a defualt order for w2
  @w2_default_fields: [
    'node'
    'tag'
    'summary'
    'owner'
    'last_occurrence'
    'first_occurrence'
    'tally'
    'group'
    'agent'
    'severity'
  ]
  # And the less important fields
  @w2_extra_fields: [
    'acknowledged'
    'identifier'
    'state_change'
    'external_id'
  ]
    # 'node_alias'
    # 'agent_group'
    # 'alert_group'
    # 'proxy_agent'
    # 'alert_key'
    # 'class'
    # 'external_class'
    # 'external_id'
    # 'type'
    # 'location'
    # 'customer'

  @w2_fields = @w2_default_fields.concat @w2_extra_fields
  
  # Turn the fields into a w2ui column definition
  @field_to_w2_column: (field_def)->
    debug 'incoming field def', field_def
    w2_col = _.clone field_def
    _.defaults w2_col, @w2_column_defaults
    map_object w2_col, @w2_column_field_map
    delete w2_col.priority
    delete w2_col.alias
    delete w2_col.label_shrt
    delete w2_col.help
    delete w2_col.view
    if _.isNumber w2_col.size or
    ( _.isString w2_col.size and w2_col.size.indexOf '%' is -1 and w2_col.size.indexOf 'px' is -1 )
      w2_col.size = "#{w2_col.size}px"
    debug 'outgoing w2 column def', w2_col
    w2_col

  @w2BuildColumnDefinition: (fields = @w2_fields)->
    for field_name in fields
      debug('building field def', field_name, Field.definition[field_name])
      throw new Error("No field [#{field_name}]") unless Field.definition[field_name]
      @field_to_w2_column Field.definition[field_name]

  @w2ColumnDefinition: @w2BuildColumnDefinition( @w2_default_fields )

  @list: ->
    _.keys @definition

  @labels: ->
    _.sortBy(@definition, 'label')

  @definition_description = {}
  for name of @types
    @types_description[name] = @types[name].description()

  to_yaml_obj: ->
    @definition

  to_yaml: ->
    yaml.dump @to_yaml_obj()


module.exports =
  Field: Field
