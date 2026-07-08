// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// # Select: All Events

// logging
const { logger, debug } = require('oa-logging')('oa:event:rules:select:all');

// OA modules
const Errors = require('oa-errors');

const { throw_error, _ } = require('oa-helpers');

const { SelectBaseSingle } = require('./select_base');

// All matches everything.
// Needed something to take a selects place
const Cls = (this.SelectAll = class SelectAll extends SelectBaseSingle {
  static initClass() {
    this.label = 'all';
  }

  run() {
    debug(this.constructor.name);
    return true;
  }
});
Cls.initClass();
