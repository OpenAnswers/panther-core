// Vite plugin that concatenates imported files into a single module scope.
//
// The old connect-assets build system concatenated files via //= require
// directives — all files shared a single global scope with `var`
// declarations and no IIFE wrapper.  Vite treats each `import './foo'`
// as a separate ES module with its own scope, which breaks the hundreds
// of bare cross-file variable references in the current bundle sources.
//
// This plugin intercepts specific entry files and replaces their
// side-effect imports with the literal file contents, converting
// const/let/class declarations to var so redeclaration is allowed —
// restoring the original single-scope concatenation behaviour.
//
// Usage in vite.config.ts:
//   import { concatImports } from './vite-plugin-concat'
//   plugins: [concatImports()]
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

// Entry files whose side-effect imports should be concatenated.
const CONCAT_ENTRIES = [
  '/app/assets/js/console.ts',
  '/app/assets/js/charts.ts',
  '/app/assets/js/_scripts.ts',
  '/app/assets/js/admin.ts',
  '/app/assets/js/_rules-management.ts',
  // Test-only entries (same concat behaviour, subset of modules)
  '/test/ui/test-scripts.ts',
  '/test/ui/test-rules-management.ts',
];

export function concatImports(): Plugin {
  return {
    name: 'vite-plugin-concat-imports',
    enforce: 'pre',

    transform(code: string, id: string) {
      if (!CONCAT_ENTRIES.some(entry => id.endsWith(entry))) {
        return null;
      }

      const dir = path.dirname(id);
      const lines = code.split('\n');
      const result: string[] = [];

      // In the old connect-assets system, $(function(){}) queued callbacks
      // for DOMContentLoaded.  Module scripts are deferred, so the DOM is
      // already ready and jQuery fires those callbacks immediately — before
      // the rest of the bundle has executed.  We intercept $.fn.ready at
      // the top and flush all collected callbacks at the bottom, restoring
      // the original "run after all code loads" semantics.
      result.push(
        'var __readyQ = []; var __origReady = $.fn.ready; $.fn.ready = function(fn){ __readyQ.push(fn); return this; };'
      );

      for (const line of lines) {
        // Match side-effect imports: import './foo'  or  import './foo';
        const m = line.match(/^\s*import\s+['"](\.[^'"]+)['"]\s*;?\s*$/);
        if (m) {
          const importSpec = m[1];
          const resolved = resolveFile(dir, importSpec);
          if (resolved) {
            let content = fs.readFileSync(resolved, 'utf-8');
            // Strip @ts-nocheck from inlined files — the entry already has it
            content = content.replace(/^\s*\/\/\s*@ts-nocheck\s*\n?/, '');
            content = toBareScope(content);
            result.push(`// --- inlined from ${importSpec} ---`);
            result.push(content);
            continue;
          }
        }
        result.push(line);
      }

      // Restore $.fn.ready and flush all collected callbacks
      result.push('$.fn.ready = __origReady; __readyQ.forEach(function(fn){ fn.call(document, $); });');

      return { code: result.join('\n'), map: null };
    },
  };
}

/**
 * Convert ES2015+ declarations to var so they can be redeclared in a
 * shared (concatenated) scope — emulating the old single-scope bundle output.
 *
 * Processes line-by-line, skipping comment lines and string interiors.
 * Also converts `class Foo {` to `var Foo = class Foo {`.
 */
function toBareScope(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Skip full-line comments — don't mangle words inside them
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      out.push(line);
      continue;
    }

    let converted = line;

    // Defensive semicolons for ASI hazards: converting class declarations
    // to `var X = class X { ... }` expressions means a subsequent line
    // starting with ( is parsed as a call on the class value.
    // Only match unindented ( — IIFE-wrapped expressions like
    // `((window.X = class X {...}))` sit at column 0; ( inside expressions
    // is indented.
    if (line.startsWith('(')) {
      converted = ';' + line;
    }

    // Pattern `this.X = class X` in the bundle sources expected
    // this === window (top-level in a shared scope); under ES modules
    // this === undefined.  Rewrite any `this.Name = class Name` to use
    // window. so the export still lands globally — parens around the
    // assignment are optional (prettier strips redundant ones).
    converted = converted.replace(/\bthis\.(\w+\s*=\s*class\s)/g, 'window.$1');

    // const / let  →  var   (only at a word boundary, not inside strings)
    converted = converted.replace(/^(\s*)(const|let)\s/, '$1var ');

    // class Foo {  →  var Foo = class Foo {
    // Handles: class Foo {   and   class Foo extends Bar {
    const classMatch = converted.match(/^(\s*)class\s+(\w+)(.*)$/);
    if (classMatch) {
      const [, indent, name, rest] = classMatch;
      converted = `${indent}var ${name} = class ${name}${rest}`;
    }

    out.push(converted);
  }

  return out.join('\n');
}

function resolveFile(dir: string, spec: string): string | null {
  const base = path.resolve(dir, spec);
  for (const ext of ['', '.ts', '.js']) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
