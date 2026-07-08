// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Rule Options

// Options allow you to change the way a rule ia applied

// - `original`
//   select an action on the original message content instead of copy
//   being modified as the event progresses through the rules
//
// - `unless`
//   Special cases to not match a match

// Logging
const { logger, debug } = require('oa-logging')('oa:event:rules:action');

// NPM modules
const yaml = require('js-yaml');

// OA modules
const { throw_error, _ } = require('oa-helpers');

// ## OptionBase

// Generic Option to implement
class OptionBase {
  static initClass() {
    this.label = '__base';
  }

  static generate(yaml, options) {
    return new this({ yaml });
  }

  static description() {
    return {
      name: this.label,
      input: [],
    };
  }

  constructor() {
    this.label = this.constructor.label;
  }

  to_object() {
    const o = {};
    o[this.label] = true;
    return o;
  }

  to_yaml_obj() {
    const o = {};
    o[this.label] = true;
    return o;
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
OptionBase.initClass();

// ## OptionOriginal

// Match on the original input message instead of the modified copy
class OptionOriginal extends OptionBase {
  static initClass() {
    this.label = 'original';
    this.disabled = true;
  }
}
OptionOriginal.initClass();

// ## OptionSkip

// Skip this rule in certain cases
class OptionSkip extends OptionBase {
  static initClass() {
    this.label = 'skip';
  }
}
OptionSkip.initClass();

// ## OptionDebug

// Skip this rule in certain cases
class OptionDebug extends OptionBase {
  static initClass() {
    this.label = 'debug';
  }
}
OptionDebug.initClass();

// ## OptionAuthor
// Might be for metadata? probably not an option
class OptionAuthor extends OptionBase {
  static initClass() {
    this.label = 'author';
    this.disabled = true;
  }
}
OptionAuthor.initClass();

// ## OptionUnless
// Skip this rule in certain cases
class OptionUnless extends OptionBase {
  static initClass() {
    this.label = 'unless';
    this.disabled = true;
  }
}
OptionUnless.initClass();

// ## Option

// Option that a Rule interacts with
class Option {
  static initClass() {
    this.types = {
      original: OptionOriginal,
      skip: OptionSkip,
      debug: OptionDebug,
      unless: OptionUnless,
      author: OptionAuthor,
    };

    // Store a static variable of all the type information
    this.types_description = {};
    for (var name in this.types) {
      this.types_description[name] = this.types[name].description();
    }
  }

  static types_list() {
    if (this._types_list) {
      return this._types_list;
    }
    this._types_list = [];
    for (const type in this.types) {
      this._types_list.push(type);
    }
    return this._types_list;
  }

  static all_types_list() {
    return this._all_types_list != null ? this._all_types_list : (this._all_types_list = _.keys(this.types));
  }

  static disabled_types_list() {
    if (this._disabled_types_list) {
      return this._disabled_types_list;
    }
    this._disabled_types_list = [];
    return (() => {
      const result = [];
      for (var type in this.types) {
        if (type.disabled) {
          result.push(this._disabled_types_list.push(type));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  // Generate an object from a yaml definition
  static generate(yaml_def) {
    debug('generate option from', yaml_def);

    let option_instances = [];

    const options = _.intersection(_.keys(yaml_def), this.types_list());

    // Generate the actions present in the yaml
    for (var option of Array.from(options)) {
      debug('found option', option);
      var option_instance = this.types[option].generate(yaml_def);

      // Should probaly check if the instances in the array are
      // of the right type as well
      if (!(option_instance instanceof OptionBase) && !(option_instance instanceof Array)) {
        throw_error('option is not of type ActionBase', option_instance);
      }
      option_instances = option_instances.concat(option_instance);
    }

    // Create the object
    debug('built options', option_instances);
    return new Option(option_instances);
  }

  // Add a contstructor so generate can pass in `options`
  constructor(options) {
    this.options = options;
  }

  to_object() {
    const o = {};
    for (var option of Array.from(this.options)) {
      _.defaults(o, option.to_object());
    }
    return o;
  }

  to_yaml_obj() {
    const o = {};
    for (var option of Array.from(this.options)) {
      _.defaults(o, option.to_yaml_obj());
    }
    return o;
  }

  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
}
Option.initClass();

module.exports = {
  Option,
  OptionBase,
  OptionUnless,
  OptionDebug,
  OptionSkip,
  OptionAuthor,
  OptionOriginal,
};
