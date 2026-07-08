// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: Field Missing

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:field_missing');

// OA modules
const { _, throw_error } = require('oa-helpers');

const { SelectBaseField } = require('./select_base');

// Match if a field doesn't exist
const Cls = (this.SelectFieldMissing = class SelectFieldMissing extends SelectBaseField {
  static initClass() {
    this.label = 'field_missing';
  }

  static description() {
    return {
      name: this.label,
      description: 'Checks whether a field is missing from an event.',
      friendly_before: 'is',
      friendly_name: 'missing',
      help: 'This checks whether a field is missing from an event',
    };
  }

  run(event_obj) {
    debug('run field_missing [%o]', this.field);

    const matched_value = event_obj.get_any(this.field) == null;
    debug('field_missing ', matched_value ? '✔️' : '❌');
    return matched_value;
  }
});
Cls.initClass();
