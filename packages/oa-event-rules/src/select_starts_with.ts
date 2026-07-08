// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: No Events

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:starts_with');

// OA modules
const Errors = require('oa-errors');

const { _, throw_error, starts_with } = require('oa-helpers');

const { SelectBaseFieldValue } = require('./select_base');

// Match if a field name starts with
const Cls = (this.SelectStartsWith = class SelectStartsWith extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'starts_with';
  }

  static description() {
    return {
      name: this.label,
      description: 'Matches values which start with a particular string.',
      friendly_name: 'starts with',
    };
  }

  run(event_obj) {
    debug('run starts_with field:[%o], value:[%o]', this.field, this.value);
    const field_value = event_obj.get_any(this.field);
    if (field_value == null) {
      return false;
    }

    const matched_value = starts_with(field_value, this.value);
    debug('starts_with ', matched_value ? '✔️' : '❌');
    return matched_value;
  }
});
Cls.initClass();
