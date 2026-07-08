// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Actions

// Manages all the actions and how they parse/render/validate.
// Generic stuff goes in ActionBase.
// Each action verb has a class.
//
// For example when `set` appears in a Rule yaml definition,
// ActionSet is used etc.

// -------------------------------------------------------------------
// ## ActionBase
// #### Base Action implementation

// Base class for specific Actions to extend
// Most of what was here has been moved to RuleVerbBase
// So selects, actions, options can all use it
let Cls = (this.ActionBase = class ActionBase extends RuleVerbBase {
  static initClass() {
    this.logger ??= debug('oa:event:rules:action');

    this.verb ??= '_actionbase_';

    this.verb_type = 'action';

    this.dom_name = this.verb_type;
    this.dom_data_id = 'verb';
    this.dom_class = 'action-entry';
    this.dom_selector = '.' + this.dom_class;
  }

  handlers(options) {
    options ??= {};
    super.handlers(options);
    return Typeaheads.add_typeahead_to_action(this.$container);
  }
});
Cls.initClass();

// -------------------------------------------------------------------
// ## Action Type implementations

// 3 main types to implement, replace being a fourth special case

// #### Class ActionOnly

// Action with no other user input than it exists
// on the rule. These are boolean in the yaml
class ActionOnly extends ActionBase {
  static initClass() {
    this.template_id = '#template-action-only';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.value = options.value;
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`Action '${this.verb}' from yaml`, yaml_def, options);
    if (yaml_def[this.verb] == null) {
      throw new Error(`No '${this.verb}' to generate`);
    }
    const opts = { value: yaml_def[this.verb] };
    const verb_class = ActionTypes.get_type(this.verb);
    return new verb_class(_.defaults(opts, options));
  }

  dom_to_properties() {
    return (this.value = true);
  }

  to_yaml_obj() {
    const o = {};
    o[this.verb] = !!this.value;
    return o;
  }
}
ActionOnly.initClass();

// #### Class ActionField

// An action with just a field paramater to view or edit
// We don't have any of these yet. Delete could be one.
class ActionField extends ActionBase {
  static initClass() {
    this.template_id = '#template-action-field';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.field = options.field;
    this.logger("new Action '%s' field - %s", this.verb, this.field);
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`Action ${this.verb} from yaml`, yaml_def, options);
    if (yaml_def[this.verb] == null) {
      throw new Error(`No ${this.verb} to generate from`);
    }
    const name = yaml_def[this.verb];
    const opts = { field: name };
    const verb_class = ActionTypes.get_type(this.verb);
    return new verb_class(_.defaults(opts, options));
  }

  get_dom_field() {
    const field = this.$template_edit_el.find('.action-field > input').val();
    this.logger('field', field);
    return field;
  }

  dom_to_properties() {
    return (this.field = this.get_dom_field());
  }

  to_yaml_obj() {
    const o = {};
    o[this.verb] = this.field;
    return o;
  }
}
ActionField.initClass();

// #### Class ActionFieldValue

// An action with both field and value.
//
// For example `set` has a field name and what the value you
// want to set that field to.
class ActionFieldValue extends ActionBase {
  static initClass() {
    this.template_id = '#template-action-field-value';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.field = options.field;
    this.value = options.value;
    this.logger('set field to [%s] set value to [%s]', this.field, this.value);
  }

  static generate(yaml_obj, options) {
    options ??= {};
    this.logger(`Action ${this.verb} from yaml`, yaml_obj, options);
    if (yaml_obj[this.verb] == null) {
      throw new Error();
    }
    const actions = (() => {
      const result = [];
      for (var field in yaml_obj[this.verb]) {
        var value = yaml_obj[this.verb][field];
        var new_options = _.defaults({ field, value }, options);
        var verb_class = ActionTypes.get_type(this.verb);
        result.push(new verb_class(new_options));
      }
      return result;
    })();
    this.logger(`Actions from ${this.verb}`, actions);
    return actions;
  }

  get_dom_field() {
    const field = this.$template_edit_el.find('.action-field > input').val();
    this.logger('field', field);
    return field;
  }

  get_dom_value() {
    const value = this.$template_edit_el.find('.action-value > input').val();
    this.logger('value', value);
    return value;
  }

  dom_to_properties() {
    this.value = this.get_dom_value();
    return (this.field = this.get_dom_field());
  }

  to_yaml_obj() {
    const o = {};
    o[this.verb] = {};
    o[this.verb][this.field] = this.value;
    return o;
  }
}
ActionFieldValue.initClass();

// ------------------------------------------------
// ## Action Types
// The specific Action classes.

// #### Class ActionInitial

// Initial is a dummy action that we can initialise rules with
// So they have a UI select box. It won't serialize anything back
// in the yaml object, just renders something for the user to use
Cls = this.ActionInitial = class ActionInitial extends ActionBase {
  static initClass() {
    this.verb = '_initial';
    this.label = 'Initial';
    this.help = 'This is a new action, set me to one of the action types';

    this.logger = debug('oa:event:rules:action__initial');
    this.hidden = true;

    this.template_id = '#template-action-initial';
    this.generate_templates();
  }

  // Custom methods for our special case
  constructor(options) {
    super(options);
    this.field = options.field;
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`Action ${this.verb} from yaml`, yaml_def, options);
    const opts = { field: false };
    return new ActionInitial(_.defaults(opts, options));
  }

  dom_to_properties() {
    return true;
  }

  dom_to_yaml_obj() {
    return {};
  }

  to_yaml_obj() {
    return {};
  }
};
Cls.initClass();

// #### Class ActionDiscard

// Discard the event
Cls = this.ActionDiscard = class ActionDiscard extends ActionOnly {
  static initClass() {
    this.verb = 'discard';
    this.label = 'Discard';
    this.label_long = 'Discard these events';
    this.help = 'Discard this event and stop rule processing';
    this.logger = debug('oa:event:rules:action_discard');
  }
};
Cls.initClass();
// #### Class ActionSet

// Set a field in the event
Cls = this.ActionSet = class ActionSet extends ActionFieldValue {
  static initClass() {
    this.verb = 'set';
    this.label = 'Set';
    this.label_long = 'Set the field %s to %s';
    this.help = 'Set a field to a new value';
    this.logger = debug('oa:event:rules:action_set');
  }
};
Cls.initClass();

// #### Class ActionReplace

// Replace a field in the event with new content. This is a
// slightly custom setup compared to the others. There's no
// type implementation for it
Cls = this.ActionReplace = class ActionReplace extends ActionBase {
  static initClass() {
    this.template_id = '#template-action-replace';

    this.verb = 'replace';
    this.label = 'Replace';
    this.label_long = 'Replace %s with %s in %s';
    this.logger = debug('oa:event:rules:action_replace');
    this.generate_templates();
  }

  static generate(yaml_obj, options) {
    this.logger(`Gen Action '${this.verb}' from yaml`, yaml_obj, options);
    if (!yaml_obj.replace) {
      throw new Error("No 'replace' to generate");
    }
    const replaces = Helpers.ensure_array(yaml_obj.replace);
    return (() => {
      const result = [];
      for (var replace of replaces) {
        this.logger('replace found', replace);
        options.field = replace.field;
        options.this = replace.this;
        options.with = replace.with;
        result.push(new ActionReplace(options));
      }
      return result;
    })();
  }

  constructor(options) {
    super(options);
    this.this = options.this;
    this.field = options.field;
    this.with = options.with;
    this.logger(this.to_english());
  }

  to_english(options) {
    return `look in field [${this.field}] for this [${this.this}] and replace with [${this.with}]`;
  }

  dom_to_properties() {
    this.field = this.get_dom_input('field');
    this.this = this.get_dom_input('this');
    return (this.with = this.get_dom_input('with'));
  }

  to_yaml_obj() {
    const o = {};
    o[this.verb] = {
      field: this.field,
      this: this.this,
      with: this.with,
    };
    return o;
  }

  // Special addition of typeahead for replace `field` field
  handlers(options) {
    return super.handlers(options);
  }
};
Cls.initClass();

// #### Class ActionStop

// Action to stop processing completely and return the even object.
Cls = this.ActionStop = class ActionStop extends ActionOnly {
  static initClass() {
    this.verb = 'stop';
    this.label = 'Stop';
    this.label_long = 'Stop processing rules completely';
    this.help = 'Stop rule immediately and return the event';
    this.logger = debug('oa:event:rules:action_stop');
  }
};
Cls.initClass();

// #### Class ActionStopRuleSet

// Action to stop only the current rule_set and move to the next.
Cls = this.ActionStopRuleSet = class ActionStopRuleSet extends ActionOnly {
  static initClass() {
    this.verb = 'stop_rule_set';
    this.label = 'Stop Rule Set';
    this.label_long = 'Stop processing event and move to the next rule set';
    this.help = 'Stop processing the current rule set and move to the next. Helps short circuit rule processing.';
    this.logger = debug('oa:event:rules:action_stop_rule_set');
  }
};
Cls.initClass();

// -------------------------------------------------------------------
// ### Class ActionTypes

// Describes the various types of Action configured above
Cls = this.ActionTypes = class ActionTypes extends RuleVerbTypes {
  static initClass() {
    this.verb_type = 'action';

    this.verb_lookup_class = ActionTypes;

    this.verb_class = ActionBase;

    this.logger = debug('oa:event:rules:action_types');

    this.types = {
      _initial: ActionInitial,
      discard: ActionDiscard,
      replace: ActionReplace,
      set: ActionSet,
      stop: ActionStop,
      stop_rule_set: ActionStopRuleSet,
    };
  }
};
Cls.initClass();

// -------------------------------------------------------------------
// ### Class Actions

// Houses all the Actions. It's the public API for people to get
// access to actions.
//
//     Action.generate( yamlRule, options )
//
Cls = this.Actions = class Actions extends RuleVerbSet {
  static initClass() {
    this.verb_type = 'action';

    this.logger = debug('oa:event:rules:action');

    this.verb_lookup_class = ActionTypes;
    this.verb_class = ActionBase;
  }

  // Removing an action
  remove_action(action_to_remove) {
    return remove_instance(action_to_remove);
  }

  // Add an array of VerbType instances
  add_actions(new_actions) {
    return new_actions.map(new_action => this.add_action(new_action));
  }

  add_action(action) {
    if (!(action instanceof ActionBase)) {
      throw new Error('Adding an Action that is not an ActionType');
    }
    return this.add_instance(action);
  }

  // Combine the list of actions, with a replace array merge
  // Note that the data is merged to handle a verb with multiple fields
  to_yaml_obj() {
    const o = {};
    for (var action of this.verb_instances) {
      this.logger(`to_yaml_obj building '${action.id}'`);
      if (action.verb === 'replace') {
        if (!o.replace) {
          o.replace = [];
        }
        o.replace.push(action.to_yaml_obj().replace);
      } else {
        _.defaultsDeep(o, action.to_yaml_obj());
      }
    }
    return o;
  }

  validate(options) {
    options ??= {};
    const errors = super.validate(options);
    if (this.verb_instances.length === 0) {
      errors.add_new_error('You must have at least one action in a rule', { $element: this.$container });
    }
    for (var instance of this.verb_instances) {
      instance.validate({ errors });
    }
    return errors;
  }
};
Cls.initClass();

window.ActionOnly = ActionOnly;
window.ActionField = ActionField;
window.ActionFieldValue = ActionFieldValue;
