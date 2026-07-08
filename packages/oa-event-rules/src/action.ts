// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:action');

// npm modules
const yaml = require('js-yaml');

// oa modules
const { _, is_regexy, regexy_to_regex, throw_error, format_string } = require('oa-helpers');

const Errors = require('oa-errors');

// We need self as we are building the classes on this (`@`) for export
// If we reference need to reference the classes anywhere @ changes
// probably should go back to module.exports to be less esoteric
const self = this;

// ## Class ActionBase
// The base Action implementation

let Cls = (this.ActionBase = class ActionBase {
  static initClass() {
    this.label = '__base';

    // ###### format_string( event, value = @value )

    // Field `{field}` and re match group `{match.1}` replacement
    this.match_group_re = /\{match\.\d+\}/;
    this.input_re = /\{input\.[\w\.]+}/;
  }

  // Provides a description of the Actions fields
  static description() {
    return {
      name: this.label,
      input: [],
    };
  }

  static generate(yaml_def) {
    if (yaml_def[this.label] == null) {
      Errors.throw_a(Errors.ValidationError, `No [${this.label}] field in definition`, yaml_def);
    }
    return new this();
  }

  // The action_id must be a truthey value
  constructor(action_id) {
    if (action_id == null) {
      action_id = true;
    }
    this.action_id = action_id;
    this.label = this.constructor.label;
  }

  run(event_obj) {
    return throw_error('run not implemented');
  }

  toString() {
    return '@::constructor.label';
  }

  to_yaml_obj() {
    return throw_error('to_yaml_obj not implemented');
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }

  //@format_string_re: /\{match\.\d+\}/
  replace_format_string(event, value) {
    if (value == null) {
      ({ value } = this);
    }
    if (!_.isString(value)) {
      return value;
    }

    // first replace the {values} with anything from the modified event
    value = format_string(this.value, event.copy);

    // Check if the have a {input.structuredData} group in the message
    if (value.match(/\{input\.structuredData\.[\w\._\-@]+\.[\w\._-]+\}/)) {
      if (event.has_structured_data()) {
        debug('found a {input.structuredData} value to replace [%o], [%o]', value, event.input.structuredData);
        value = ActionBase.format_string_with_prefix('input.structuredData', this.value, event.input.structuredData);
      } else {
        logger.warn('Rule was looking for structured data but none was available');
      }
    }

    // Check if the have a {input.structuredData1} group in the message
    if (value.match(/\{input\.structuredData1\.[\w\._\-@]+=[\w\._-]+\}/)) {
      if (event.has_structured_data()) {
        debug('found a {input.structuredData1} value to replace [%o], [%o]', value, event.input.structuredData1);
        value = ActionBase.format_string_with_prefix('input.structuredData1', this.value, event.input.structuredData1);
      } else {
        logger.warn('Rule was looking for structuredData1 but none was available');
      }
    }

    // Check if the have a {input.} group in the message
    if (value.match(/\{input\.[\w\._]+}/)) {
      debug('found a {input.} value to replace', value, event.input);
      value = ActionBase.format_string_with_prefix('input', this.value, event.input);
    }

    // Check if the have a {match.1} group still in the message
    if (!value.match(/\{match\.\d+\}/)) {
      return value;
    }

    const match_arr = event.match_groups();
    if (!(match_arr.length > 0)) {
      debug("format_string: event didn't have match groups", match_arr);
      logger.warn("A rule tried to replace match groups but the supplied event didn't have any", event, value);
      return value;
    }

    debug('format_string: doing a match replace with match_arr', match_arr);
    const match_format_vars = {};
    for (let i = 0; i < match_arr.length; i++) {
      var matched = match_arr[i];
      match_format_vars[`match.${i + 1}`] = matched;
    }

    debug('format_string: doing a match replace @val[%s] val[%s] vars[%j]', this.value, value, match_format_vars);

    return (value = format_string(value, match_format_vars));
  }

  // Replace only {prefix.field} values with data.
  // For log4j2/RFC5424 syslog.implementation.
  // Does not recurse down objects!
  // I did this quickly, It needs a generic solution for . notation replacements
  // like `format_string` in `oa-helpers` where most of this is yanked from
  static format_string_with_prefix(prefix, str, ...args) {
    debug('format_string_with_prefix in [%o],[%o],[%o]', prefix, str, args);
    // leave if there's something odd
    if (typeof str !== 'string') {
      return str;
    }
    // leave unless we have data
    if (!args) {
      return str;
    }
    // leave unless we have something to replace `{blah}`
    // which is a bit quicker than failing to match every arg
    if (!(str.indexOf('{') > -1) || !(str.indexOf('}') > -1)) {
      return str;
    }

    if (typeof args[0] === 'object') {
      args = args[0];
    }
    for (var arg in args) {
      var re;
      debug('format_string_with_prefix arg [%o], [%o], [%o]', arg, prefix, str);

      if (typeof args[arg] === 'string') {
        re = RegExp(`\\{${prefix}\.${arg}\\}`, 'gi');
        str = str.replace(re, args[arg]);
      } else if (typeof args[arg] === 'object') {
        // nested object
        for (var subarg in args[arg]) {
          debug('format_string_with_prefix subarg [%o].[%o], [%o], [%o]', arg, subarg, prefix, str);
          re = RegExp(`\\{${prefix}\.${arg}\.${subarg}\\}`, 'gi');
          str = str.replace(re, args[arg][subarg]);
        }
      }
    }

    return str;
  }
});
Cls.initClass();

// ### ActionSet

// Set an event field to a value
// Supports a {field} notation to reference fields from the event
// Supports a {match.n} notation to reference captured groups from
// Select Match

// Plain values

//    set:
//      afield: value

// Multiple values

//    set:
//      afield: value
//      bfield: value

// Use entities from the event object

//    set:
//      afield: "Use the value from {another_event_field}"

// Use capture groups from the Select Match

//    set:
//      afield: "Use the capture group from select > {match.1}"

Cls = this.ActionSet = class ActionSet extends this.ActionBase {
  static initClass() {
    this.label = 'set';
  }

  static description() {
    return {
      name: this.label,
      description: 'Sets the value of a field to a specified value.',
      input: [
        {
          name: 'field',
          label: 'field',
          type: 'string',
        },
        {
          name: 'value',
          label: 'value',
          type: 'string',
          beforetext: 'to',
        },
      ],
    };
  }

  // Generate a set

  //     set:
  //       a_field: new_view

  //     set:
  //       a_field: new_valuesys
  //       both_field: other value

  // Returns an array of set objects

  static generate(yaml_def) {
    let sets;
    if (yaml_def[this.label] == null) {
      Errors.throw_a(Errors.ValidationError, `no [${this.label}] in definition`, yaml_def);
    }

    return (sets = (() => {
      const result = [];
      for (var field in yaml_def[this.label]) {
        var value = yaml_def[this.label][field];
        if (value == null) {
          Errors.throw_a(Errors.ValidationError, `no [${this.label}] value in definition`, yaml_def);
        }
        result.push(new this(field, value));
      }
      return result;
    })());
  }

  constructor(field, value) {
    super();
    this.field = field;
    this.value = value;
    // Check for emptiness of field and value
    if (this.field == null) {
      throw_error('Action param 1: field');
    }
    if (this.value == null) {
      throw_error('Action param 2: value');
    }
    if (this.field === '') {
      throw_error('Action param 1: field');
    }
    if (this.value === '') {
      throw_error('Action param 2: value');
    }
    debug('new', this.label, this.field, this.value);
    this.label = this.constructor.label;
  }

  // store the {match.n} regexp
  //@match_re: /\{match\.\d+\}/g

  run(event_obj) {
    debug('run about to set field [%s] to [%s]', this.field, this.value);
    let { value } = this;

    // magical field and match group replacement
    value = this.replace_format_string(event_obj);

    event_obj.set(this.field, value);
    debug('set field [%s] to [%s]', this.field, value);
    return event_obj;
  }

  toString() {
    return `set [${this.field}] to [${this.value}]`;
  }

  to_yaml_obj() {
    const action_obj = {};
    action_obj[this.field] = this.value;
    return action_obj;
  }
};
Cls.initClass();

// ### ActionDiscard

//    discard: true

// Discard this event, and stop rule processing

Cls = this.ActionDiscard = class ActionDiscard extends this.ActionBase {
  static initClass() {
    this.label = 'discard';
  }

  static description() {
    return {
      name: this.label,
      description: 'Discards the event immediately, and applies no further processing.',
      friendly_name: 'Discard',
      friendly_after: 'this event',
      input: [],
    };
  }

  run(event_obj) {
    debug('discarding event', this.action_id);
    event_obj.set('severity', -1);
    event_obj.discard(this.action_id);
    event_obj.stop(this.action_id);
    return event_obj;
  }

  to_yaml_obj() {
    const action_obj = {};
    action_obj[this.constructor.label] = true;
    return action_obj;
  }
};
Cls.initClass();

// ### ActionReplace

//    replace:
//      field: name
//      this:  /what to look for/
//      with:  whatever

Cls = this.ActionReplace = class ActionReplace extends this.ActionBase {
  static initClass() {
    this.label = 'replace';
  }

  static description() {
    return {
      name: this.label,
      description: 'Replaces content within a field. Regex is allowed.',
      input: [
        {
          name: 'field',
          label: 'field',
          type: 'string',
          beforetext: 'in',
        },
        {
          name: 'this',
          label: 'search text or /regex/',
          type: 'stregex',
          beforetext: 'where',
        },
        {
          name: 'with',
          label: 'replacement',
          type: 'string',
          beforetext: 'with',
        },
      ],
    };
  }

  // ###### generate( yaml_def )
  // Generates a *Replace* from an object in the yaml format
  static generate(yaml_def) {
    let replace_this;
    if (yaml_def.replace == null) {
      Errors.throw_a(Errors.ValidationError, 'No field [replace] in definition', yaml_def);
    }
    const replace_def = yaml_def.replace;

    // horrible but had problems calling an `@` function from in here
    if (replace_def instanceof Array) {
      let replaces;
      return (replaces = (() => {
        const result = [];
        for (var replace of Array.from(replace_def)) {
          if (replace.field == null) {
            Errors.throw_a(Errors.ValidationError, 'No field [field] in replace definition', yaml_def);
          }
          if (replace.field === '') {
            Errors.throw_a(Errors.ValidationError, 'No field [field] in replace definition', yaml_def);
          }

          if (replace.this == null) {
            Errors.throw_a(Errors.ValidationError, 'No field [this] in replace definition', yaml_def);
          }
          if (replace.with == null) {
            Errors.throw_a(Errors.ValidationError, 'No field [with] in replace definition', yaml_def);
          }
          if (is_regexy(replace.this)) {
            replace_this = regexy_to_regex(replace.this);
          } else {
            replace_this = replace.this;
          }
          result.push(new ActionReplace(replace.field, replace_this, replace.with));
        }
        return result;
      })());
    } else {
      if (replace_def.field == null) {
        Errors.throw_a(Errors.ValidationError, 'No field [field] in replace definition', yaml_def);
      }
      if (replace_def.field === '') {
        Errors.throw_a(Errors.ValidationError, 'No field [field] in replace definition', yaml_def);
      }

      if (replace_def.this == null) {
        Errors.throw_a(Errors.ValidationError, 'No field [this] in replace definition', yaml_def);
      }
      if (replace_def.with == null) {
        Errors.throw_a(Errors.ValidationError, 'No field [with] in replace definition', yaml_def);
      }

      debug('is_regexy', replace_def.this, is_regexy, is_regexy('test'), is_regexy('/test/'));
      if (is_regexy(replace_def.this)) {
        replace_this = regexy_to_regex(replace_def.this);
      } else {
        replace_this = replace_def.this;
      }

      return new ActionReplace(replace_def.field, replace_this, replace_def.with);
    }
  }

  // ###### new Replace( field_name, serach, replace )
  // Run an *Event* object though the *Replace* action
  // Note, this isn't the plain event but the Event class
  constructor(field, this_val, with_val) {
    super();
    this.field = field;
    this.this = this_val;
    this.with = with_val;
    // check for emptiness
    // we don't car about 'this' or 'with' as emptiness may be desired
    if (this.field == null) {
      throw_error('param 1: field');
    }
    if (this.this == null) {
      throw_error('param 2: this');
    }
    if (this.with == null) {
      throw_error('param 3: with');
    }
    if (this.field === '') {
      throw_error('param 1: field');
    }
    this.label = this.constructor.label;
  }

  // ###### run( event_object )
  // Run an *Event* object though the *Replace* action
  // Note, this isn't the plain event but the Event class
  run(event_obj) {
    const field = event_obj.get(this.field);
    debug('replace run: [%s] [%s] [%s]', field, this.this, this.with);
    const new_field = `${field}`.replace(this.this, this.with);
    event_obj.set(this.field, new_field);
    debug('replace ran: [%s]', new_field);
    return event_obj;
  }

  // ###### toString()
  // Create a human readable representation of the object
  toString() {
    return `replace this [${this.this}] with [${this.with}] in [${this.field}]`;
  }

  // ###### to_yaml_obj()
  // Turn it back into the yaml format of object
  to_yaml_obj() {
    const obj = {};
    return (obj[this.constructor.label] = {
      field: this.field,
      this: this.this,
      with: this.with,
    });
  }
};
Cls.initClass();

// ### ActionStop

// This stops rule processing completely

Cls = this.ActionStop = class ActionStop extends this.ActionBase {
  static initClass() {
    this.label = 'stop';
  }

  constructor(id) {
    super();
    this.id = id;
    // end should be a hash identifying the
    // RuleSet:Rule doing the ending
    this.label = this.constructor.label;
  }

  run(event_obj) {
    debug('end', this.id);
    return event_obj.stop();
  }

  toString() {
    return 'stop processing rules';
  }

  to_yaml_obj() {
    const obj = {};
    return (obj[this.constructor.label] = true);
  }
};
Cls.initClass();

// ### ActionStopRuleSet

// This stops processing for the current ruleset, but will
// continue to the next

Cls = this.ActionStopRuleSet = class ActionStopRuleSet extends this.ActionBase {
  static initClass() {
    this.label = 'stop_rule_set';
  }

  constructor(id) {
    super();
    this.id = id;
    // end should be a hash identifying the
    // RuleSet:Rule doing the ending
    this.label = this.constructor.label;
  }

  run(event_obj) {
    debug('end', this.id);
    return event_obj.stop_rule_set();
  }

  toString() {
    return 'stop processing this rule set';
  }

  to_yaml_obj() {
    const obj = {};
    return (obj[this.constructor.label] = true);
  }
};
Cls.initClass();

// ### ActionNothing

// Do nothing.. no matter what is defined skip these actions
// This lives in Selects as well so no actions will take effect

Cls = this.ActionNothing = class ActionNothing extends this.ActionBase {
  static initClass() {
    this.label = 'skip';
  }

  run() {
    debug('nothing');
    return true;
  }

  toString() {
    return 'nothing';
  }

  to_yaml_obj() {
    const o = {};
    o[this.constructor.label] = true;
    return o;
  }
};
Cls.initClass();

// ### Action

// Public interface to the Actions on a Rule

// This is a kind of factory class.
// It takes the YAML definition of a rule in and sets up
// an array of Actions of the required types.
// That array can then be `run` on an event and
// make the required modifications.
// Selects guard the event object from actions.

Cls = this.Action = class Action {
  static initClass() {
    // Map the yaml words to classes (should be auto Action+CamelWord)
    this.types = {
      discard: self.ActionDiscard,
      replace: self.ActionReplace,
      set: self.ActionSet,
      stop: self.ActionStop,
      stop_rule_set: self.ActionStopRuleSet,
    };

    // Build the types description object from all the different
    // Action types
    this.types_description = {};
    for (var name in this.types) {
      this.types_description[name] = this.types[name].description();
    }
  }

  // Return the list of types
  static types_list() {
    return _.keys(this.types);
  }

  // Generate an object from a yaml definition
  static generate(yaml_def) {
    debug('generate action from', yaml_def);

    let action_instances = [];

    const actions = _.intersection(_.keys(yaml_def), _.keys(this.types));

    if (actions.length === 0) {
      const msg = 'Action generate: No action found in definition';
      Errors.throw_a(Errors.ValidationError, msg, yaml_def, _.keys(yaml_def), _.keys(this.types));
    }

    // Generate the actions present in the yaml
    for (var action of Array.from(actions)) {
      debug('found action', action);
      var action_instance = this.types[action].generate(yaml_def);

      // Should probaly check if the instances in the array are
      // of the right type as well
      if (!(action_instance instanceof self.ActionBase) && !(action_instance instanceof Array)) {
        throw_error('action is not of type ActionBase', action_instance);
      }
      action_instances = action_instances.concat(action_instance);
    }

    // Create the object
    debug('built actions', action_instances);
    return new Action(action_instances);
  }

  // Add a contstructor so generate can pass in `actions`
  constructor(actions) {
    this.actions = actions;
  }

  // Run the event through the actions
  // This will generally only happen after a *Select*
  // has returned `true`
  run(event_obj) {
    for (var action of Array.from(this.actions)) {
      action.run(event_obj);
    }
    return event_obj;
  }

  // Create a string for a hu-man
  toString() {
    return Array.from(this.actions)
      .map(action => action.toString())
      .join(' and ');
  }

  // Loop through the actions and generate the object for yaml
  // FIXME This doesn't deal with arrays in `replace:`!!
  to_yaml_obj() {
    const o = {};
    for (var action of Array.from(this.actions)) {
      if (action === 'replace') {
        if (!o.replace) {
          o.replace = [];
        }
        o.replace.push(action.to_yaml_obj().replace);
      } else {
        _.defaults(o, action.to_yaml_obj());
      }
    }
    return o;
  }

  // Convert the object into yaml
  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
};
Cls.initClass();
