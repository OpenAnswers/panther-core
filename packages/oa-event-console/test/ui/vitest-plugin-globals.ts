//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//
// Vitest-only plugin that exposes class declarations from concatenated
// bundles onto globalThis, so test files can reference them as bare names
// just like the original browser-based test runner did.
//
// Runs after vite-plugin-concat-imports (which converts `class Foo` to
// `var Foo = class Foo`).  This plugin appends `globalThis.X = X` for
// each such declaration, plus standalone `var X = ...` that aren't classes.
import type { Plugin } from 'vite';

const CONCAT_ENTRIES = ['_scripts.ts', '_rules-management.ts', 'test-scripts.ts', 'test-rules-management.ts'];

export function testGlobalExpose(): Plugin {
  return {
    name: 'vitest-global-expose',
    enforce: 'post',
    apply: 'serve', // only in dev/test, not production build

    transform(code: string, id: string) {
      if (!CONCAT_ENTRIES.some(entry => id.endsWith(entry))) {
        return null;
      }

      // Find all `var X = class X` patterns (from concat plugin)
      const classNames = [...code.matchAll(/\bvar\s+(\w+)\s*=\s*class\s+\1\b/g)].map(m => m[1]);

      // eslint-disable-next-line no-console
      console.log(`[vitest-global-expose] ${id} -> [${classNames.join(', ')}]`);

      if (classNames.length === 0) return null;

      const assignments = classNames.map(n => `globalThis.${n} = ${n};`).join('\n');

      return {
        code: code + '\n// --- vitest global expose ---\n' + assignments,
        map: null,
      };
    },
  };
}
