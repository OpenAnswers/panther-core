// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: Less Than

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:less_than');

// OA modules
const Errors = require('oa-errors');

const { _, throw_error } = require('oa-helpers');

const { SelectBaseFieldValue } = require('./select_base');

// Match if a field is less than a value (numbers only)

const Cls = (this.SelectLessThan = class SelectLessThan extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'less_than';
  }

  static description() {
    return {
      name: this.label,
      description: 'Matches values which are less than a specified value.',
      friendly_name: 'less than',
      friendly_before: 'is',
      input: [
        {
          name: 'field',
          label: 'Field',
          type: 'string',
        },
        {
          name: 'value',
          label: 'Number',
          type: 'number',
        },
      ],
    };
  }

  run(event_obj) {
    debug('run greater_than [%o]', this.field);
    const field_value = event_obj.get_any(this.field);
    if (field_value == null) {
      return false;
    }

    const matched_value = field_value < this.value;
    debug('less_than ', matched_value ? '✔️' : '❌');
    return matched_value;
  }
});
Cls.initClass();
