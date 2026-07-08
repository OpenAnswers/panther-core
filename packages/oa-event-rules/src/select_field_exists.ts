// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: Field Exists

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:field_exists');

// OA modules
const Errors = require('oa-errors');

const { _, throw_error } = require('oa-helpers');

const { SelectBaseField } = require('./select_base');

// Match is a field exists
const Cls = (this.SelectFieldExists = class SelectFieldExists extends SelectBaseField {
  static initClass() {
    this.label = 'field_exists';
  }

  static description() {
    return {
      name: this.label,
      description: 'Checks whether a field is present within an event.',
      friendly_name: 'exists',
      help: 'This checks whether a field is present within an event',
    };
  }

  run(event_obj) {
    debug('run field_exists [%o]', this.field);

    const matched_value = event_obj.get_any(this.field) != null;
    debug('field_exists ', matched_value ? '✔️' : '❌');
    return matched_value;
  }
});
Cls.initClass();
