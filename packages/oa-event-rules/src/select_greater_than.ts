// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: Greater Than

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:greater_than');

// OA modules
const Errors = require('oa-errors');

const { _, throw_error } = require('oa-helpers');

const { SelectBaseFieldValue } = require('./select_base');

// Match if a field is greater than x

const Cls = (this.SelectGreaterThan = class SelectGreaterThan extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'greater_than';
  }

  static description() {
    return {
      name: this.label,
      description: 'Matches values greater than a specified value.',
      friendly_name: 'greater than',
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

    const matched_value = field_value > this.value;
    debug('greather_than ', matched_value ? '✔️' : '❌');
    return matched_value;
  }
});
Cls.initClass();
