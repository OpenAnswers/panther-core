// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: No Events

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:none');

// OA modules
const { throw_error, _ } = require('oa-helpers');

const { SelectBaseSingle } = require('./select_base');

// None matches nothing.
const Cls = (this.SelectNone = class SelectNone extends SelectBaseSingle {
  static initClass() {
    this.label = 'none';
  }

  run() {
    debug(this.constructor.name);
    return false;
  }
});
Cls.initClass();
