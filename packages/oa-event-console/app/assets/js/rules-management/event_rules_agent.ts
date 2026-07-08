// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// -------------------------------------------------------
// ## Class EventRulesAgent

let Cls = (this.EventRulesAgent = class EventRulesAgent extends EventRules {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_agent');
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger('generating EventRulesAgent from', yaml_def, options);
    options.yaml = yaml_def;
    return new this(options);
  }

  constructor(options, execute) {
    options ??= {};
    execute ??= true;
    super({}, false);
    if (execute === true) {
      this.eventrules_agent_init(options);
    }
  }

  eventrules_agent_init(options) {
    options ??= {};
    const self = this;
    this.type = 'agent';

    this.yaml = options.yaml;
    if (this.yaml) {
      this.build_from_yaml();
    }

    return this.event_rules_init(options);
  }

  // @group_rule_set = new GenericGroup
  //   name: 'rule_set'
  //   label: 'Agent Rules'
  //   grouped: @rule_set
  //   template_grouped_id: '#ruleset-grouping-replace-me'

  build_from_yaml() {
    const self = this;
    const { agent } = this.yaml;
    this.logger('building agent', _.keys(agent).join(','));

    this.rule_set = RuleSet.generate(agent.rules, { event_rules: this });

    // Create a group ui for the identifer.
    // `template_grouped_id` is a bit of a hack to get
    // the RuleSet into a `<ul>`
    this.group_rule_set = new GenericGroup({
      label: 'Agent Rules',
      label_detail: 'Rules processed for this agent',
      name: 'rule_set',
      grouped: this.rule_set,
      template_grouped_id: '#ruleset-grouping-replace-me',
    });

    // Create an input ui for identifer
    this.identifier = new GenericInputLabelValue({
      name: 'identifier',
      value: agent.identifier,
      //label: 'Default Event Identifier'
      save_Async(yaml_data) {
        return self.update_agent_Async(yaml_data);
      },
      refresh_Async(data) {
        return self.refresh_agent_Async(data);
      },
    });

    // Create a group ui for the identifer
    this.group_identifier = new GenericGroup({
      label: 'Default Event Identifier',
      label_detail: 'Use unless otherwise set by rules',
      name: 'identifier',
      grouped: this.identifier,
    });

    // Create an input ui for identifer
    this.field_map = new GenericInputFieldValues({
      name: 'field_map',
      field_values: agent.field_map,
      //label: 'Field Mapping'
      heading: { field: 'Source', value: 'Destination' },
      size_join: 1,
      join_text: 'to',
      size_delete: 1,
      save_Async(yaml_data) {
        return self.update_agent_Async(yaml_data);
      },
      refresh_Async(data) {
        return self.refresh_agent_Async(data);
      },
      new_handler: '.rules-agent-create-mapping',
    });

    this.group_field_map = new GenericGroup({
      label: 'Field Mapping',
      name: 'field_map',
      grouped: this.field_map,
    });

    this.field_transform = new GenericInputFieldEnumsArray({
      name: 'field_transform',
      field_values: agent.field_transform,
      //label: 'Field Transform'
      heading: { field: 'Field', value: 'Transform' },
      options_list: [
        { label: 'Lower Case', value: 'to_lower_case' },
        { label: 'Upper Case', value: 'to_upper_case' },
        { label: 'Left Trim', value: 'right_trim' },
        { label: 'Right Trim', value: 'left_trim' },
        { label: 'Trim', value: 'trim' },
      ],
      save_Async(yaml_data) {
        return self.update_agent_Async(yaml_data);
      },
      refresh_Async(data) {
        return self.refresh_agent_Async(data);
      },
      new_handler: '.rules-agent-create-transform',
    });

    return (this.group_field_transform = new GenericGroup({
      label: 'Field Transform',
      label_detail: 'Minor detail on field transforms',
      name: 'field_transform',
      grouped: this.field_transform,
      collapsable: true,
      addable() {
        return self.field_transform.add_new_entry();
      },
      help:
        'Transform a field on the way through the agent. ' + 'There are a set of common transforms available to use',
    }));
  }

  deploy() {
    throw new Error('Do some agenty socketio stuff');
  }

  update_agent_Async(yaml_data) {
    const vasdfar = 'whatever';
    this.logger('sending to socketio_Async', yaml_data);
    return this.socketio_Async('event_rules::agent::update', yaml_data);
  }

  refresh_agent_Async(data) {
    const self = this;
    if (data && data.agent) {
      return refresh_input_data(data);
    }
    return this.socketio_Async('event_rules::read', {}).then(function (res) {
      if (!res.agent) {
        throw new Error('No `agent` in data');
      }
      return self.refresh_input_data(res);
    });
  }

  refresh_input_data(data) {
    this.identifier.set_value(data.agent.identifier);
    this.field_map.set_field_values(data.agent.field_map);
    this.field_transform.set_field_values(data.agent.field_transform);
    if (this.severity_map) {
      this.severity_map.set_field_values(data.agent.severity_map);
    }
    return true;
  }

  render(options) {
    this.$container.html('');
    this.$container.append(this.group_identifier.render());
    this.$container.append(this.group_field_map.render());
    this.$container.append(this.group_field_transform.render());
    this.$container.append(this.group_rule_set.render());
    this.handlers();
    return this.$container;
  }

  // $agentTemplate = @getContainerElement()
  // $agentTemplate.html()
  // $agentTemplate.append
  // $agentTemplate.append @rule_set.render()

  // ### handlers()
  handlers(options) {
    options ??= {};
    const self = this;

    return $(document)
      .off('click.global-create')
      .on('click.global-create', '.btn-rules-global-create-rule', function (ev) {
        self.logger('click .btn-rules-global-create-rule');
        self.createNewRule();
        return window.scrollTo(0, document.body.scrollHeight);
      });
  }
});
Cls.initClass();

// -------------------------------------------------------
// ## Class EventRulesAgentHttp

Cls = this.EventRulesAgentHttp = class EventRulesAgentHttp extends EventRulesAgent {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_agent_http');
  }

  constructor(options) {
    options ??= {};
    super({}, false);
    this.sub_type = 'http';
    this.name = 'HTTP';
    this.logger = this.constructor.logger;
    this.container_id = 'event-rules-agent-http';
    this.eventrules_agent_init(options);
  }
};
Cls.initClass();

class EventRulesAgentSyslogish extends EventRulesAgent {
  // Add an additional input setup
  build_from_yaml() {
    super.build_from_yaml();
    const self = this;
    // Create out severity map input group
    this.severity_map = new GenericInputLabelValues({
      name: 'severity_map',
      field: 'severity_map',
      field_values: this.yaml.agent.severity_map,
      //      label: 'Severity Mapping'

      size_field: 2,
      size_value: 2,

      heading: {
        field: 'Severity',
        value: 'Panther',
      },

      validate_fn(val) {
        self.logger('validation val', val);
        if (val !== `${parseInt(val)}`) {
          return { ok: false, message: 'Integers only' };
        }
        if ([-1, 0, 1, 2, 3, 4, 5, '-1', '0', '1', '2', '3', '4', '5'].indexOf(val) === -1) {
          return { ok: false, message: 'Number must be -1 to 5' };
        }
        return { ok: true };
      },

      save_Async(yaml_data) {
        return self.update_agent_Async(yaml_data);
      },

      refresh_Async() {
        return self.refresh_agent_Async();
      },
    });

    // Add the severity map to a group ui
    return (this.group_severity_map = new GenericGroup({
      label: 'Severity Mappings',
      label_detail: 'Minor detail on field transforms',
      name: 'severity_map',
      grouped: this.severity_map,
    }));
  }

  render() {
    this.$container.html('');
    this.$container.append(this.group_identifier.render());
    this.$container.append(this.group_field_map.render());
    this.$container.append(this.group_severity_map.render());
    this.$container.append(this.group_field_transform.render());
    this.$container.append(this.group_rule_set.render());
    this.handlers();
    return this.$container;
  }
}

// -------------------------------------------------------
// ## Class EventRulesAgentGraylog

Cls = this.EventRulesAgentGraylog = class EventRulesAgentGraylog extends EventRulesAgentSyslogish {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_agent_graylog');
  }

  constructor(options) {
    options ??= {};
    super({}, false);
    this.sub_type = 'graylog';
    this.name = 'Graylog';
    this.container_id = 'event-rules-agent-graylog';
    this.logger = this.constructor.logger;
    this.eventrules_agent_init(options);
  }
};
Cls.initClass();

// -------------------------------------------------------
// ## Class EventRulesAgentSyslogd

Cls = this.EventRulesAgentSyslogd = class EventRulesAgentSyslogd extends EventRulesAgentSyslogish {
  static initClass() {
    this.logger = debug('oa:event:rules:event_rules_agent_syslogd');
  }

  constructor(options) {
    options ??= {};
    super({}, false);
    this.sub_type = 'syslogd';
    this.name = 'Syslog';
    this.container_id = 'event-rules-agent-syslogd';
    this.logger = this.constructor.logger;
    this.eventrules_agent_init(options);
  }
};
Cls.initClass();

window.EventRulesAgentSyslogish = EventRulesAgentSyslogish;
