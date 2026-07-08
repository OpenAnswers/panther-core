// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// # Selects

// Manages all the actions and how they parse/render/validate.
// Generic stuff goes in SelectBase.
// Each action verb has a class.
//
// For example when `set` appears in a Rule yaml definition,
// SelectSet is used etc.

// -------------------------------------------------------------------
// ## SelectBase
// #### Base Select implementation
// Base class for specific Selects to extend
class SelectBase extends RuleVerbBase {
  static initClass() {
    this.logger = debug('oa:event:rules:selectbase');

    // `RuleVerbBase` options
    this.verb ??= '_selectbase_';
    this.verb_type = 'select';

    // `Rendered` options
    this.dom_name = this.verb_type;
    this.dom_data_id = 'verb';
    this.dom_class = 'select-entry';
    this.dom_selector = '.' + this.dom_class;
  }

  // Generate a type from a yaml rule object
  static generate(yaml_obj, options) {
    options ??= {};
    return override_generate_please();
  }

  // Take the dom edit elements and go back to yaml, for sending back
  // to the server
  to_yaml_obj() {
    return override_to_yaml_object_please();
  }

  // Add the typeaheads to field inputs on each render
  handlers(options) {
    options ??= {};
    super.handlers(options);
    const self = this;

    return Typeaheads.add_typeahead_to_select(this.$container);
  }

  // any additional frontend checks to be performed on input
  sanity_check(values) {
    return this.logger('looks sane');
  }
}
SelectBase.initClass();

// -------------------------------------------------------------------
// ## Select Type implementations

// 3 main types to implement, Or being a fourth special case

// #### Class SelectOnly

// Select with no other user input than it exists
// on the rule. These are boolean in the yaml
class SelectOnly extends SelectBase {
  static initClass() {
    this.template_id = '#template-select-only';
    this.template_tags_id = `#template-tags-${this.verb}`;
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.value = options.value;
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`Select '${this.verb}' from yaml`, yaml_def, options);
    if (!yaml_def || yaml_def[this.verb] == null) {
      throw new Error(`No '${this.verb}' to generate`);
    }
    const opts = { value: yaml_def[this.verb] };
    const select_type = SelectTypes.get_type(this.verb);
    return new select_type(_.defaults(opts, options));
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
SelectOnly.initClass();

class SelectSchedule extends SelectBase {
  static initClass() {
    this.template_id = '#template-select-schedule';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.field = options.field;
    this.logger('new SelectSchedule: ', this.field, options);
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`Select ${this.verb} from yaml`, yaml_def, options);
    if (yaml_def[this.verb] == null) {
      throw new Error(`No ${this.verb} to generate from`);
    }
    const sched = yaml_def[this.verb];
    const opts = {};
    opts.field = sched.name;
    opts.value = sched.name;
    const select_type = SelectTypes.get_type(this.verb);
    return new select_type(_.defaults(opts, options));
  }

  dom_to_properties() {
    this.logger('Getting DOM field');
    this.field = this.get_dom_input('field');
    return this.logger('GOT ', this.field);
  }
  // @field

  to_yaml_obj() {
    console.log('YAML ', this);
    this.logger('schedule to yaml: ', this.verb, this.field);
    const o = {};
    o[this.verb] = {};
    o[this.verb]['name'] = this.field;
    return o;
  }

  // Add the typeaheads to field inputs on each render
  handlers(options) {
    options ??= {};
    super.handlers(options);
    const self = this;

    return Typeaheads.add_typeahead_to_schedule(this.$container);
  }
}
SelectSchedule.initClass();

// #### Class SelectField

// An action with just a field paramater to view or edit
// We don't have any of these yet. Delete could be one.
class SelectField extends SelectBase {
  static initClass() {
    this.template_id = '#template-select-field';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.field = options.field;
    this.logger('new SelectField field:', this.field);
  }

  static generate(yaml_def, options) {
    options ??= {};
    this.logger(`Select ${this.verb} from yaml`, yaml_def, options);
    if (yaml_def[this.verb] == null) {
      throw new Error(`No ${this.verb} to generate from`);
    }
    const name = yaml_def[this.verb];
    const opts = { field: name };
    const select_type = SelectTypes.get_type(this.verb);
    return new select_type(_.defaults(opts, options));
  }

  dom_to_properties() {
    return (this.field = this.get_dom_input('field'));
  }

  to_yaml_obj() {
    const o = {};
    o[this.verb] = this.field;
    return o;
  }
}
SelectField.initClass();

// #### Class SelectFieldValue

// An action with both field and value.
//
// For example `set` has a field name and what the value you
// want to set that field to.
class SelectFieldValue extends SelectBase {
  static initClass() {
    this.template_id = '#template-select-fieldvalue';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.field = options.field;
    this.value = options.value;
    this.value_placeholder ??= options.value_placeholder || this.constructor.value_placeholder;
    this.logger(`new set field [${this.value}] value [${this.field}]`, this.value, this.field);
  }

  static generate(yaml_obj, options) {
    options ??= {};
    this.logger(`Select ${this.verb} from yaml`, yaml_obj, options);
    if (yaml_obj[this.verb] == null) {
      throw new Error();
    }
    const selects = (() => {
      const result = [];
      for (var field in yaml_obj[this.verb]) {
        var value = yaml_obj[this.verb][field];
        var new_options = _.defaults({ field, value }, options);
        var select_type = SelectTypes.get_type(this.verb);
        result.push(new select_type(new_options));
      }
      return result;
    })();
    this.logger(`Selects from ${this.verb}`, selects);
    return selects;
  }

  dom_to_properties() {
    this.value = this.get_dom_input('value');
    return (this.field = this.get_dom_input('field'));
  }

  to_yaml_obj() {
    const o = {};
    o[this.verb] = {};
    o[this.verb][this.field] = this.value;
    return o;
  }
}
SelectFieldValue.initClass();

// #### Class SelectFieldValueNumeric

// Form values are strings, turn the value into a number
class SelectFieldValueNumeric extends SelectFieldValue {
  constructor(options) {
    super(options);
    this.value_placeholder = 'Number';
  }

  dom_to_properties() {
    this.value = parseInt(this.get_dom_input('value'));
    return (this.field = this.get_dom_input('field'));
  }
}

// #### Class SelectFieldValueOr

// A select with field/values that lets you set multiple values
// as an array.  This array turns into a logical OR.
//
// For example `match` can specifiy an array of values that will
// all be checked against the match. liek /test|what/
class SelectFieldValueOr extends SelectBase {
  static initClass() {
    this.template_id = '#template-select-fieldvalueor';
    this.generate_templates();
  }

  constructor(options) {
    super(options);
    this.field = options.field;
    this.value = options.value;
    if (!_.isArray(this.value)) {
      this.value = [this.value];
    }
    this.build_values_string();

    this.value_placeholder ??= options.value_placeholder || this.constructor.value_placeholder;

    // Mustache is balls with loops :/
    // Give it a helper so it can figure out an index
    // `render()` has to reset this each time!
    this.value_index = 0;
    const self = this;
    this.value_fn = () => self.value_index++;

    this.logger(`new set field [${this.value}] value [${this.field}]`, this.value, this.field);
  }

  static generate(yaml_obj, options) {
    options ??= {};
    this.logger(`Select ${this.verb} from yaml`, yaml_obj, options);
    if (yaml_obj[this.verb] == null) {
      throw new Error(`No verb [${this.verb}] to generate from`);
    }
    const selects = (() => {
      const result = [];
      for (var field in yaml_obj[this.verb]) {
        var value = yaml_obj[this.verb][field];
        var select_type = SelectTypes.get_type(this.verb);
        var new_options = _.defaults({ field, value }, options);
        result.push(new select_type(new_options));
      }
      return result;
    })();

    this.logger(`Selects from ${this.verb}`, selects);
    return selects;
  }

  dom_to_properties() {
    this.value = this.get_dom_inputs('values'); // Note the s's
    if (!_.isArray(this.value)) {
      this.value = [this.value];
    }
    this.field = this.get_dom_input('field');
    this.sanity_check(this.value);
    return this.build_values_string();
  }

  to_yaml_obj() {
    const value = _.isArray(this.value) && this.value.length === 1 ? this.value[0] : this.value;
    const o = {};
    o[this.verb] = {};
    o[this.verb][this.field] = value;
    return o;
  }

  render(options) {
    this.value_index = 0;
    return super.render(options);
  }

  handlers(options) {
    options ??= {};
    super.handlers(options);
    const self = this;

    this.$container.off('click.add').on('click.add', '.select-add-values', function () {
      self.logger('click .select-add-values handler');
      self.value.push('');
      return self.render();
    });

    return this.$container.off('click.del').on('click.del', '.select-values-delete', function () {
      self.logger('click .select-values-delete handler');

      // This is the array index of the deletion
      const index = $(this).attr('data-index');
      if (`${parseInt(index)}` !== index) {
        return Message.error('There was a problem deleting the value ' + `as it didn't have an index [${index}]`);
      }
      if (self.value.length === 1) {
        Message.label('Can not delete', 'You need at east one value!');
        return;
      }
      if (index > self.value.length - 1) {
        Message.error('Can not delete', "There aren't that many values");
        return;
      }
      self.value.splice(index, 1);
      return self.render();
    });
  }

  // Deal with the trailing `or` problem in code
  build_values_string() {
    let str = '<code>';
    const values = _.map(this.value, v => `${v}`.escapeHTML());
    str += values.join('</code> or <code>');
    str += '</code>';
    return (this.values_string = str);
  }
}
SelectFieldValueOr.initClass();

// ------------------------------------------------
// ## Select Types
// The specific Select classes.

// #### Class SelectInitial

// Initial is a dummy action that we can initialise rules with
// So they have a UI select box. It won't serialize anything back
// in the yaml object, just renders something for the user to use
let Cls = (this.SelectInitial = class SelectInitial extends SelectBase {
  static initClass() {
    this.verb = '_initial';
    this.logger = debug('oa:event:rules:action__initial');
    this.hidden = true;

    this.template_id = '#template-select-initial';
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
    return new SelectInitial(_.defaults(opts, options));
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

  test_event(ev) {
    return false;
  }
});
Cls.initClass();

// #### Class SelectAll

// Set a field in the event
class SelectAll extends SelectOnly {
  static initClass() {
    this.verb = 'all';
    this.label = 'All';
    this.verb_english = 'All events';
    this.help = 'Match every event, useful for setting default values or ' + 'transforming data';
    this.logger = debug('oa:event:rules:select_all');
  }

  test_event(ev) {
    return true;
  }
}
SelectAll.initClass();

// #### Class SelectNone

// Select to stop processing completely and return the even object.
class SelectNone extends SelectOnly {
  static initClass() {
    this.verb = 'none';
    this.label = 'None';
    this.verb_english = 'No events';
    this.help = "Don't match any events";
    this.logger = debug('oa:event:rules:select_none');
  }

  test_event(ev) {
    return false;
  }
}
SelectNone.initClass();

// #### Class SelectMatch

// Select to stop only the current rule_set and move to the next.
class SelectMatch extends SelectFieldValueOr {
  static initClass() {
    this.verb = 'match';
    this.label = 'Matches';
    this.value_placeholder = 'String or /regex/';
    this.verb_english = 'matches';
    this.help = 'Field matches a string search. Can be a Javascript // regex ' + 'definition or plain string';
    this.logger = debug('oa:event:rules:select_match');
  }

  // additional checks for `match` should warn against double pipe usage
  sanity_check(values) {
    for (var value of values) {
      if (value.match(/\|\|/)) {
        Message.warn("Double pipe '||' detected - will match everything");
      }
    }
    return true;
  }

  test_event(ev) {
    if (ev[this.field] == null) {
      return false;
    }
    const re = Helpers.regex_from_array(this.value);
    this.logger('SelectMatch testing value[%j] re[%s] field[%s]', this.value, re, this.field);
    if (`${ev[this.field]}`.match(re)) {
      return true;
    }
    return false;
  }
}
SelectMatch.initClass();

// #### Class SelectEquals

// Skip processing this rule, like comment it.
// This should become an Option!
class SelectEquals extends SelectFieldValueOr {
  static initClass() {
    this.verb = 'equals';
    this.label = 'Equals';
    this.value_placeholder = 'String';
    this.verb_english = 'equals';
    this.help = 'Field exactly matches a string';
    this.logger = debug('oa:event:rules:select_equals');
  }

  test_event(ev) {
    for (var value of this.value) {
      if (ev[this.field] === value) {
        return true;
      }
    }
    return false;
  }
}
SelectEquals.initClass();

// #### Class SelectScheduleName

class SelectScheduleName extends SelectSchedule {
  static initClass() {
    this.verb = 'schedule';
    this.label = 'Schedule Name';
    this.verb_english = 'schedule';
    this.help = 'Named Schedule';
    this.logger = debug('oa:event:rules:select_schedule');
  }

  test_event(ev) {
    for (var value of this.value) {
      if (ev[this.field] === value) {
        return true;
      }
    }
    return false;
  }
}
SelectScheduleName.initClass();

// #### Class SelectFieldExists

// Turn on debug for this rule providing extra info
// to event_server about it's inner machinations
class SelectFieldExists extends SelectField {
  static initClass() {
    this.verb = 'field_exists';
    this.label = 'Fields exists';
    this.verb_english = 'exists';
    this.help = 'Field exists in the event';
    this.logger = debug('oa:event:rules:select_field_exists');
  }

  test_event(ev) {
    return ev[this.field] != null;
  }
}
SelectFieldExists.initClass();

// #### Class SelectFieldMissing

// Turn on debug for this rule providing extra info
// to event_server about it's inner machinations
class SelectFieldMissing extends SelectField {
  static initClass() {
    this.verb = 'field_missing';
    this.label = 'Fields is missing';
    this.verb_english = 'is missing';
    this.help = 'Field does not exist in the event';
    this.logger = debug('oa:event:rules:select_field_missing');
  }

  test_event(ev) {
    return ev[this.field] == null;
  }
}
SelectFieldMissing.initClass();

// #### Class SelectStartsWith

// Turn on debug for this rule providing extra info
// to event_server about it's inner machinations
class SelectStartsWith extends SelectFieldValue {
  static initClass() {
    this.verb = 'starts_with';
    this.label = 'Starts with';
    this.value_placeholder = 'String';
    this.verb_english = 'starts with';
    this.help = 'Field starts with a specific string';
    this.logger = debug('oa:event:rules:select_starts_with');
  }

  test_event(ev) {
    return `${ev[this.field]}`.startsWith(this.value);
  }
}
SelectStartsWith.initClass();

// #### Class SelectEndsWith

// Turn on debug for this rule providing extra info
// to event_server about it's inner machinations
class SelectEndsWith extends SelectFieldValue {
  static initClass() {
    this.verb = 'ends_with';
    this.label = 'Ends with';
    this.value_placeholder = 'String';
    this.verb_english = 'ends with';
    this.help = 'Field ends with a specific string';
    this.logger = debug('oa:event:rules:select_ends_with');
  }

  test_event(ev) {
    return `${ev[this.field]}`.endsWith(this.value);
  }
}
SelectEndsWith.initClass();

// #### Class SelectLessThan

// Turn on debug for this rule providing extra info
// to event_server about it's inner machinations
class SelectLessThan extends SelectFieldValueNumeric {
  static initClass() {
    this.verb = 'less_than';
    this.label = 'Less than';
    this.verb_english = 'is less than';
    this.help = 'Field is less than (integers only)';
    this.logger = debug('oa:event:rules:select_less_than');
  }

  test_event(ev) {
    return ev[this.field] < this.value;
  }
}
SelectLessThan.initClass();

// #### Class SelectGreaterThan

// Turn on debug for this rule providing extra info
// to event_server about it's inner machinations
class SelectGreaterThan extends SelectFieldValueNumeric {
  static initClass() {
    this.verb = 'greater_than';
    this.label = 'Greater than';
    this.verb_english = 'is greater than';
    this.help = 'Field is greater than (integers only)';
    this.logger = debug('oa:event:rules:select_greater_than');
  }

  test_event(ev) {
    return ev[this.field] > this.value;
  }
}
SelectGreaterThan.initClass();

// -------------------------------------------------------------------
// ### Class SelectTypes

// Describes the various types of Action configured above
Cls = this.SelectTypes = class SelectTypes extends RuleVerbTypes {
  static initClass() {
    this.verb_type = 'select';

    this.logger = debug('oa:event:rules:select_types');

    this.types = {
      _initial: SelectInitial,
      all: SelectAll,
      none: SelectNone,
      match: SelectMatch,
      equals: SelectEquals,
      field_exists: SelectFieldExists,
      field_missing: SelectFieldMissing,
      starts_with: SelectStartsWith,
      ends_with: SelectEndsWith,
      less_than: SelectLessThan,
      greater_than: SelectGreaterThan,
      schedule: SelectScheduleName,
    };
  }
};
Cls.initClass();

// -------------------------------------------------------------------
// ### Class Selects

// Houses all the Selects. It's the public API for the rules system
// to get access to a select instances
//
//     Select.generate( yamlRule, options )
//
// Please note its possible for `.generate` to return an array of
// `SelectVerb` as verbs with multiple keys will be split into an
// instance for each key, that can me merged at the other end.
Cls = this.Selects = class Selects extends RuleVerbSet {
  static initClass() {
    this.logger = debug('oa:event:rules:selects');

    this.verb_type = 'select';
    this.verb_lookup_class = SelectTypes;
    this.verb_class = SelectBase;
  }

  validate(options) {
    const errors = super.validate(options);
    if (this.verb_instances.length === 0) {
      errors.add_new_error(`You must have at least one ${this.verb_type}`, { $element: this.$container });
    }
    return errors;
  }

  test_event(ev) {
    for (var verb_instance of this.verb_instances) {
      if (!verb_instance.test_event(ev)) {
        return false;
      }
    }
    return true;
  }
};
Cls.initClass();

window.SelectBase = SelectBase;
window.SelectOnly = SelectOnly;
window.SelectSchedule = SelectSchedule;
window.SelectField = SelectField;
window.SelectFieldValue = SelectFieldValue;
window.SelectFieldValueNumeric = SelectFieldValueNumeric;
window.SelectFieldValueOr = SelectFieldValueOr;
window.SelectAll = SelectAll;
window.SelectNone = SelectNone;
window.SelectMatch = SelectMatch;
window.SelectEquals = SelectEquals;
window.SelectScheduleName = SelectScheduleName;
window.SelectFieldExists = SelectFieldExists;
window.SelectFieldMissing = SelectFieldMissing;
window.SelectStartsWith = SelectStartsWith;
window.SelectEndsWith = SelectEndsWith;
window.SelectLessThan = SelectLessThan;
window.SelectGreaterThan = SelectGreaterThan;
