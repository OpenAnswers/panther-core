// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Vitest setup file — phase 1.
// Sets vendor globals on globalThis BEFORE any concat'd source modules load.
// Must run as a separate setupFile so its module body completes first.
import debugLib from 'debug';
import jQuery from 'jquery';
import lodash from 'lodash';
import Mustache from 'mustache';

globalThis.$ = jQuery;
globalThis.jQuery = jQuery;

globalThis._ = lodash;

globalThis.debug = debugLib;

globalThis.Mustache = Mustache;

// jQuery plugins not available in jsdom
jQuery.fn.tooltip = function () {
  return this;
};

// Stubs for modules excluded from test entry (have socket.io/AJAX side effects)
globalThis.Typeaheads = {
  add_typeahead_to_select() {},
  add_typeahead_to_action() {},
  add_typeahead_to_schedule() {},
};
