// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Vitest setup file — phase 2.
// Templates must be in the DOM BEFORE source modules load (classes
// call initClass() which reads templates).  We use dynamic import()
// to ensure sequential execution.
import { loadTemplates } from './template-loader';

// 1. Insert templates into DOM
loadTemplates();

// 2. Then load source modules (processed by concat + testGlobalExpose plugins)
await import('./test-scripts');

// Stub jQuery UI plugins not present in jsdom
$.fn.sortable = function () {
  return this;
};

// Fix Module.include for ES class syntax: ES class prototype methods are
// non-enumerable, but Module.include uses for-in which only sees enumerable
// properties.  Patch it to use Object.getOwnPropertyNames before the
// rules-management modules run their initClass() calls which rely on mixin
// inclusion.
Module.include = function (obj) {
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (key !== 'constructor' && !['extended', 'included'].includes(key)) {
      this.prototype[key] = obj[key];
    }
  }
  if (obj.included != null) {
    obj.included.apply(this);
  }
  return this;
};

await import('./test-rules-management');
