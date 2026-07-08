// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: Ends with

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:ends_with');

// OA modules
const { _, throw_error, ends_with } = require('oa-helpers');

const { SelectBaseFieldValue } = require('./select_base');

// Match if a field name ends with
const Cls = (this.SelectEndsWith = class SelectEndsWith extends SelectBaseFieldValue {
  static initClass() {
    this.label = 'ends_with';
  }

  static description() {
    return {
      name: this.label,
      description: 'Matches values which end with a particular string.',
      friendly_name: 'ends with',
    };
  }

  run(event_obj) {
    debug('run ends_with field:[%o], value:[%o]', this.field, this.value);
    const field_value = event_obj.get_any(this.field);
    if (field_value == null) {
      return false;
    }

    const matched_value = ends_with(field_value, this.value);
    debug('ends_with ', matched_value ? '✔️' : '❌');
    return matched_value;
  }
});
Cls.initClass();
