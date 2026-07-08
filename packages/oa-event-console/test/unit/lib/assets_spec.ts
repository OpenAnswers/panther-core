//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const fs = require('fs');
const { buildAssetHelpers } = require('../../../lib/assets');

const SAMPLE_MANIFEST = {
  // JS entry with a name and associated CSS chunk (code-split)
  'src/js/vendor.ts': {
    file:    'js/vendor-abc123.js',
    name:    'vendor',
    isEntry: true,
    css:     ['css/vendor-def456.css']
  },
  // CSS-only entry: name derived from filename
  'src/css/global_css.css': {
    file: 'css/global_css-oF66Pue8.css'
  },
  // JS entry with no associated CSS
  'src/js/app.ts': {
    file:    'js/app-xyz789.js',
    name:    'app',
    isEntry: true
  }
};

describe('Unit::EventConsole::lib::assets', function() {

  let existsStub: any;
  let readStub: any;

  beforeEach(function() {
    existsStub = sinon.stub(fs, 'existsSync').returns(true);
    readStub   = sinon.stub(fs, 'readFileSync').returns(JSON.stringify(SAMPLE_MANIFEST));
  });

  afterEach(function() {
    existsStub.restore();
    readStub.restore();
  });

  describe('js()', function() {

    it('returns a module script tag for a named JS entry', function() {
      const { js } = buildAssetHelpers();
      expect(js('vendor')).to.equal(
        '<script type="module" src="/assets/bld/js/vendor-abc123.js"></script>'
      );
    });

    it('returns a not-found HTML comment for unknown names', function() {
      const { js } = buildAssetHelpers();
      expect(js('does-not-exist')).to.contain('not found in Vite manifest');
      expect(js('does-not-exist')).to.contain('does-not-exist');
    });

    it('returns not-found when manifest file is missing', function() {
      existsStub.returns(false);
      const { js } = buildAssetHelpers();
      expect(js('vendor')).to.contain('not found in Vite manifest');
    });
  });

  describe('css()', function() {

    it('returns a link tag for a CSS-only entry (name derived from filename)', function() {
      const { css } = buildAssetHelpers();
      expect(css('global_css')).to.equal(
        '<link rel="stylesheet" href="/assets/bld/css/global_css-oF66Pue8.css">'
      );
    });

    it('returns link tag(s) for code-split CSS on a JS entry', function() {
      const { css } = buildAssetHelpers();
      expect(css('vendor')).to.equal(
        '<link rel="stylesheet" href="/assets/bld/css/vendor-def456.css">'
      );
    });

    it('returns a not-found comment for a JS entry with no associated CSS', function() {
      const { css } = buildAssetHelpers();
      expect(css('app')).to.contain('not found in Vite manifest');
    });

    it('returns a not-found comment for unknown names', function() {
      const { css } = buildAssetHelpers();
      expect(css('missing')).to.contain('not found in Vite manifest');
    });

    it('joins multiple code-split CSS chunks with newlines', function() {
      readStub.returns(JSON.stringify({
        'src/js/multi.ts': {
          file: 'js/multi-xxx.js',
          name: 'multi',
          css:  ['css/a.css', 'css/b.css']
        }
      }));
      const { css } = buildAssetHelpers();
      const out = css('multi');
      expect(out.split('\n')).to.have.lengthOf(2);
      expect(out).to.contain('css/a.css');
      expect(out).to.contain('css/b.css');
    });
  });

  describe('manifest edge cases', function() {

    it('handles malformed JSON by surfacing a parse error', function() {
      readStub.returns('{ not json');
      const { js } = buildAssetHelpers();
      expect(() => js('vendor')).to.throw(SyntaxError);
    });

    it('treats missing manifest as an empty index (not a crash)', function() {
      existsStub.returns(false);
      const { js, css } = buildAssetHelpers();
      expect(() => { js('anything'); css('anything'); }).to.not.throw();
    });

    it('indexes CSS-only entries without a hash suffix under the plain basename', function() {
      readStub.returns(JSON.stringify({
        'x.css': { file: 'css/plain.css' }
      }));
      const { css } = buildAssetHelpers();
      expect(css('plain')).to.equal(
        '<link rel="stylesheet" href="/assets/bld/css/plain.css">'
      );
    });

    it('invalidates the name-index when the manifest disappears (no stale entries)', function() {
      // The guard at lib/assets.ts:44-45 resets cachedManifest/cachedIndex when
      // the file is missing. Without it, findEntry would continue to serve
      // entries from the last successful read. Exercise that path directly.

      // Ensure non-production so loadManifest re-checks existsSync each call.
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const { js } = buildAssetHelpers();
        // Populate cache with SAMPLE_MANIFEST.
        expect(js('vendor')).to.contain('vendor-abc123.js');

        // Manifest disappears — helper must not serve the stale hashed path.
        existsStub.returns(false);
        expect(js('vendor')).to.contain('not found in Vite manifest');

        // Manifest reappears with different contents — helper reads fresh.
        existsStub.returns(true);
        readStub.returns(JSON.stringify({
          'src/js/vendor.ts': {
            file:    'js/vendor-NEW999.js',
            name:    'vendor',
            isEntry: true
          }
        }));
        expect(js('vendor')).to.contain('vendor-NEW999.js');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});
