// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Selecting Base Implementations

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select_base');

// npm modules
const yaml = require('js-yaml');

// OA modules
const Errors = require('oa-errors');
const { throw_error, _ } = require('oa-helpers');

// ## SelectBase

// Generic Select to implement
let Cls = (this.SelectBase = class SelectBase {
  static initClass() {
    this.label = '__base';
  }

  // Return a descriptor of the object
  // to a web building form
  // not sure it needs to be a function but
  // it makes this implementation/throw easier...
  static description() {
    return throw_error('description not implemented', this.label);
  }

  // Generate takes a definition, normally from yaml
  // and creates a class instance from it
  // Can return an array of class instances if there
  // are multiple selects conained within the one field
  static generate(yaml_def) {
    debug('generate select', this.label, yaml_def);
    if (yaml_def[this.label] == null) {
      Errors.throw_a(Errors.ValidationError, `${this.constructor}: Definition has no key [${this.label}]`);
    }

    // refer to the local class name @::
    return new this.prototype.constructor(yaml_def[this.label]);
  }

  constructor() {
    this.label = this.constructor.label;
  }

  // Run executes the select, should probably `debug` to
  // So people can see what is going on
  run() {
    return throw_error('run not implemented');
  }

  // Create a nice string for people to read, describing the select
  toString() {
    return `${this.constructor.label}`;
  }

  // Create the definition representation of the class
  to_yaml_obj() {
    return throw_error('to_yaml_obj not implemented');
  }

  // Dump the yaml of the object
  to_yaml() {
    return yaml.dump(this.to_yaml_obj());
  }
});
Cls.initClass();

// ## SelectBaseField

// Generic Select to extend that only holds a field

Cls = this.SelectBaseField = class SelectBaseField extends this.SelectBase {
  static initClass() {
    this.label = '__base_field';
  }

  static description() {
    return {
      name: this.label,
      input: [
        {
          name: 'field',
          type: 'string',
        },
      ],
    };
  }

  static generate(yaml_def) {
    debug('generate select', this.label, yaml_def);
    if (yaml_def[this.label] == null) {
      Errors.throw_a(Errors.ValidationError, `${this.constructor}: Definition has no key [${this.label}]`);
    }

    // refer to the local class name @::
    return new this.prototype.constructor(yaml_def[this.label]);
  }

  constructor(field, value) {
    super();
    this.field = field;
    this.value = value;
    if (this.field == null) {
      throw_error(`${this.constructor.label} The first paramater \`field\` must be defined`);
    }
    debug('new', this.constructor.label, this.field);
    this.label = this.constructor.label;
  }

  run() {
    return throw_error('run not implemented');
  }

  toString() {
    return `${this.constructor.label} ${this.field}`;
  }

  to_yaml_obj() {
    const obj = {};
    obj[this.constructor.label] = this.field;
    return obj;
  }
};
Cls.initClass();

// ## SelectBaseFieldValue

// Generic Select to extend that holds a field and value

Cls = this.SelectBaseFieldValue = class SelectBaseFieldValue extends this.SelectBase {
  static initClass() {
    this.label = '__base_field_value';
  }

  static description() {
    return {
      name: this.label,
      input: [
        {
          name: 'field',
          label: 'Field',
          type: 'string',
        },
        {
          name: 'value',
          label: 'Value',
          type: 'string',
        },
      ],
    };
  }

  static generate(yaml_def) {
    debug('generate select', this.label, yaml_def);
    if (yaml_def[this.label] == null) {
      Errors.throw_a(
        Errors.ValidationError,
        `${this.prototype.constructor.name}.generate: Definition has no key [${this.label}]`
      );
    }

    // Get any fieldname and objects
    const selects = [];
    for (var fieldname in yaml_def[this.label]) {
      var value = yaml_def[this.label][fieldname];
      selects.push(new this.prototype.constructor(fieldname, value));
    }

    if (!(selects.length > 0)) {
      Errors.throw_a(
        Errors.ValidationError,
        `${this.prototype.constructor.name}: No fields defined for select`,
        yaml_def
      );
    }

    return selects;
  }

  constructor(field, value) {
    super();
    this.field = field;
    this.value = value;
    if (this.field == null) {
      Errors.throw_a(Errors.ValidationError, `${this.constructor.label} The first paramater \`field\` must be defined`);
    }
    if (this.field === '') {
      Errors.throw_a(Errors.ValidationError, `${this.constructor.label} The first paramater \`field\` must be defined`);
    }
    if (this.value == null) {
      Errors.throw_a(
        Errors.ValidationError,
        `${this.constructor.label} The second paramater \`value\` must be defined`
      );
    }
    if (this.value === '') {
      Errors.throw_a(
        Errors.ValidationError,
        `${this.constructor.label} The second paramater \`value\` must be defined`
      );
    }
    debug('new', this.constructor.label, this.field, this.value);
    this.label = this.constructor.label;
  }

  run() {
    return throw_error('run not implemented');
  }

  toString() {
    return `${this.field} ${this.constructor.label} '${this.value}'`;
  }

  to_yaml_obj() {
    const obj = {};
    obj[this.constructor.label] = {};
    obj[this.constructor.label][this.field] = this.value;
    return obj;
  }
};
Cls.initClass();

// ## SelectBaseSingle

// Single selects have no value but true/false.
// Basically boolean select flags.
Cls = this.SelectBaseSingle = class SelectBaseSingle extends this.SelectBase {
  static initClass() {
    this.label = 'none';
  }

  static description() {
    return {
      name: this.label,
      input: [],
    };
  }

  static generate(yaml_def) {
    return new this();
  }

  to_yaml_obj() {
    const obj = {};
    obj[this.constructor.label] = true;
    return obj;
  }
};
Cls.initClass();
