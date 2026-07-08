
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Field

// Configures the fields and related data for the console

// Will need to be customised by the client at some point
// Especially the extra fields
// logging
const { logger, debug } = require('oa-logging')('oa:event:field');

// npm modules
const yaml = require('js-yaml');

// oa modules
const { throw_error, map_object, map_clone_object, _ }   = require('oa-helpers');


// ## Field

class Field {
  static definition: any;
  static w2_column_field_map: any;
  static w2_column_defaults: any;
  static w2_default_fields: any;
  static w2_extra_fields: any;
  static w2_fields: any;
  static w2ColumnDefinition: any;
  static definition_description: any;
  static types: any;
  static types_description: any;

  static initClass() {
  
    this.definition = {
  
      identifier: {
        name:       'identifier',
        priority:   'M',
        alias:      'ident',
        type:       'String',
        label:      'Identifier',
        label_shrt: 'Id',
        size:       150,
        uniq:       true,
        help:       'Internal Identifier for this event',
        view: {
          priority:   600,
          default:    false
        }
      },
      
      node: {
        name:       'node',
        priority:   'M',
        alias:      'n',
        type:       'String',
        label:      'Node name',
        label_shrt: 'Node',
        size:       150,
        help:       'Name of the node that generated the event',
        view: {
          priority:   20,
          default:    true
        }
      },
  
      severity: {
        name:       'severity',
        priority:   'M',
        alias:      's',
        type:       'Number',
        label:      'Severity',
        label_shrt: 'Sev',
        size:       60,
        help:       'Severity of the event (0-5)',
        view: {
          priority:   120,
          default:    true
        }
      },
  
      summary: {
        name:       'summary',
        priority:   'M',
        alias:      'msg',
        type:       'String',
        label:      'Summary',
        size:       '90%',
        min:        400,
        help:       'Summary text of the event',
        view: {
          priority:   10,
          default:    true
        }
      },
  
      tag: {
        name:       'tag',
        priority:   'C',
        alias:      'app',
        type:       'String',
        label:      'Tag',
        label_shrt: 'Tag',
        size:       90,
        help:       'Tag for the event',
        view: {
          priority:   20,
          default:    true
        }
      },
  
      group: {
        name:       'group',
        priority:   'M',
        alias:      'grp',
        type:       'String',
        label:      'Group',
        label_shrt: 'Grp',
        size:       105,
        help:       'The group the event has been associated with',
        view: {
          priority:   40,
          default:    true
        }
      },
  
      // secondary_group:
      //   name:       'secondary_group'
      //   priority:   'M'
      //   alias:      'grp2'
      //   type:       'String'
      //   label:      'Group'
      //   size:       '120px'
  
      agent: {
        name:       'agent',
        priority:   'S',
        alias:      'ag',
        type:       'String',
        label:      'Agent',
        size:       105,
        help:       'The agent that processed the incoming event',
        view: {
          priority:   90,
          default:    true
        }
      },
  
  
      first_occurrence: {
        name:       'first_occurrence',
        priority:   'S',
        alias:      'fo',
        type:       'Date',
        display_type: 'Date',
        label:      'Creation time',
        label_shrt: 'First',
        size:       175,
        help:       'When this event first occurred',
        view: {
          priority:   100,
          default:    true
        }
      },
  
  
      owner: {
        name:       'owner',
        priority:   'C',
        alias:      'u',
        type:       'String',
        label:      'Owner',
        size:       90,
        help:       'Who currently owns this event',
        view: {
          priority:   30,
          default:    true
        }
      },
      
      tally: {
        name:     'tally',
        priority:   'C',
        alias:      't',
        type:       'Number',
        label:      'Tally',
        label_shrt: '#',
        size:       60,
        help:       'Number of times this event has occurred',
        view: {
          priority:   100,
          default:    true
        }
      },
      
      acknowledged: {
        name:     'acknowledged',
        priority:   'C',
        alias:      'ack',
        type:       'Number',
        label:      'Ack',
        size:       50,
        help:       'Has this event been acknowledged',
        view: {
          priority:   150,
          default:    false
        }
      },
      
      last_occurrence: {
        name:       'last_occurrence',
        priority:   'C',
        alias:      'lo',
        type:       'Date',
        display_type: 'Date',
        label:      'Last Happened',
        label_shrt: 'Last',
        size:       175,
        help:       'When this event last occurred',
        view: {
          priority:   30,
          default:    true
        }
      },
      
      state_change: {
        name:       'state_change',
        priority:   'C',
        alias:      'sc',
        type:       'Date',
        display_type: 'Date',
        label:      'Last Changed',
        label_shrt: 'Change',
        size:       175,
        help:       'When this event was last updated',
        view: {
          priority:   550,
          default:    false
        }
      },
  
      external_id: {
        name:       'external_id',
        priority:   'C',
        alias:      'ex',
        type:       'String',
        label:      'External ID',
        size:       90,
        help:       'Reference to an external system for this event',
        view: {
          priority:   30,
          default:    true
        }
      }
    };
      
   
    this.w2_column_field_map = {
      name:   'field',
      label:  'caption'
    };
      //help:   'title'
  
    this.w2_column_defaults = {
      sortable:   true,
      resizable:  true
    };
  
    // Set a defualt order for w2
    this.w2_default_fields = [
      'node',
      'tag',
      'summary',
      'owner',
      'last_occurrence',
      'first_occurrence',
      'tally',
      'group',
      'agent',
      'severity',
      'external_id'
    ];
    // And the less important fields
    this.w2_extra_fields = [
      'acknowledged',
      'identifier',
      'state_change'
    ];
      // 'node_alias'
      // 'agent_group'
      // 'alert_group'
      // 'proxy_agent'
      // 'alert_key'
      // 'class'
      // 'external_class'
      // 'external_id'
      // 'type'
      // 'location'
      // 'customer'
  
    this.w2_fields = this.w2_default_fields.concat(this.w2_extra_fields);
  
    this.w2ColumnDefinition = this.w2BuildColumnDefinition( this.w2_default_fields );
  
    this.definition_description = {};
    for (var name in this.types) {
      this.types_description[name] = this.types[name].description();
    }
  }
  
  // Turn the fields into a w2ui column definition
  static field_to_w2_column(field_def){
    debug('incoming field def', field_def);
    const w2_col = _.clone(field_def);
    _.defaults(w2_col, this.w2_column_defaults);
    map_object(w2_col, this.w2_column_field_map);
    delete w2_col.priority;
    delete w2_col.alias;
    delete w2_col.label_shrt;
    delete w2_col.help;
    delete w2_col.view;
    if (_.isNumber(w2_col.size) ||
    ( _.isString(w2_col.size) && w2_col.size.indexOf('%') === -1 && w2_col.size.indexOf('px') === -1)
    ) {
      w2_col.size = `${w2_col.size}px`;
    }
    debug('outgoing w2 column def', w2_col);
    return w2_col;
  }

  static w2BuildColumnDefinition(fields){
    fields ??= this.w2_fields;
    // Column field names are passed client-side into w2ui 1.4's
    // mergeChanges(), which evaluates `record.<field> = ...` via eval().
    // Reject anything that isn't a plain identifier or dotted path so
    // a malformed config can never smuggle JS syntax into that eval.
    const SAFE_FIELD = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
    return (() => {
      const result = [];
      for (var field_name of fields as string[]) {
        debug('building field def', field_name, Field.definition[field_name]);
        if (!Field.definition[field_name]) { throw new Error(`No field [${field_name}]`); }
        if (!SAFE_FIELD.test(field_name)) { throw new Error(`Unsafe w2ui field name [${field_name}]`); }
        result.push(this.field_to_w2_column(Field.definition[field_name]));
      }
      return result;
    })();
  }

  static list() {
    return _.keys(this.definition);
  }

  static labels() {
    return _.sortBy(this.definition, 'label');
  }

  to_yaml_obj() {
    return Field.definition;
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
Field.initClass();


module.exports =
  {Field};
