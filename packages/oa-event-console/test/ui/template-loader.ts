// @ts-nocheck
//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Loads Mustache templates from pug files into the jsdom document.
// In production these are rendered server-side by Express/Pug and
// embedded as <script type="text/x-mustache-template"> tags.
// For tests we compile them at setup time using the pug package.
import fs from 'fs';
import path from 'path';
import pug from 'pug';

const TEMPLATE_DIR = path.resolve(__dirname, '../../app/view/rules-management');
const MIXIN_FILE = path.resolve(__dirname, '../../app/view/mixin/buttons.pug');

// Read the mixin file content to prepend to templates that need it
const MIXIN_CONTENT = fs.readFileSync(MIXIN_FILE, 'utf-8');

// All template pug files that render <script> tags with Mustache content.
// Order doesn't matter — they're independent fragments.
const TEMPLATE_FILES = fs
  .readdirSync(TEMPLATE_DIR)
  .filter(f => (f.startsWith('template-') || f.startsWith('action-')) && f.endsWith('.pug'))
  .filter(f => f !== 'template-includes.pug');

export function loadTemplates() {
  for (const file of TEMPLATE_FILES) {
    try {
      // First try compiling standalone
      const html = pug.renderFile(path.join(TEMPLATE_DIR, file));
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      // If it fails (likely needs mixins), prepend the mixin definitions
      try {
        const templateContent = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf-8');
        const combined = MIXIN_CONTENT + '\n' + templateContent;
        const html = pug.render(combined, { filename: path.join(TEMPLATE_DIR, file) });
        document.body.insertAdjacentHTML('beforeend', html);
      } catch (err2) {
        console.warn(`template-loader: skipping ${file}: ${err2.message}`);
      }
    }
  }

  // Add test container elements that specs render into
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div id="action-render-test"></div>
    <div id="ruleverb-render-test"></div>
    <div id="select-render-test"></div>
    <div id="selects-render-test"></div>
    <div id="option-render-test"></div>
    <div id="generic-input-render-test"></div>
    <div id="rule-render-test"></div>
    <div id="rule-set-render-test"></div>
    <div id="groups-render-test"></div>
  `
  );
}
