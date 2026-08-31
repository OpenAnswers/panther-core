//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Unit-level coverage of the error branches in app/index.ts:
//
//   * module-level config-load catch (lines 28-32)
//   * rules-load catch              (lines 78-81)
//   * upload-directory mkdirp catch (lines 89-92)
//
// These are defensive branches that are deliberately not exercised by the
// integration boot path (console_app.ts). The module-load test is run last
// because it briefly clears the require cache.
//
// Branches NOT covered here (documented for the test plan):
//   * lines 100-101 (Mongoose.connect error path) — testing it requires
//     start() to reach `require('./events')` before the stubbed Mongoose
//     callback fires, which permanently registers the events.ts listeners
//     on the shared server_event emitter. That listener set, combined with
//     a pre-existing race in events/fixme_spec.ts (afterEach nulls
//     SocketIO.io while a MongoPoll chain is still queued), reliably crashes
//     the next spec in CI. Dropped on 2026-04-27.
//   * lines 116-117 (per-agent reload_cb body) — covered separately in
//     event_rules_socket_spec.ts.
//   * lines 123-125 (express.serve error → process.exit(1)) — kills mocha.
//   * lines 130-134 (NODE_ENV=development endpoint listing) — tests run
//     with NODE_ENV=production via the repo-root .env.

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const { expect, sinon } = require('../../mocha_helpers');

const FIXTURE_CONFIG = path.resolve(__dirname, '../../fixture/config.test.yml');
const RULES_DIR = path.resolve(__dirname, '../../fixture/rules');

// Materialise the *.fixture rules files into the *.yml names that EventRules
// expects. The integration helper does the same; we replicate it here so this
// spec can run in isolation.
for (const file of fs.readdirSync(RULES_DIR)) {
  if (file.endsWith('.fixture')) {
    const dest = path.join(RULES_DIR, file.replace('.fixture', ''));
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(RULES_DIR, file), dest);
  }
}

process.env.OA_CONSOLE_CONFIG_FILE = FIXTURE_CONFIG;

// First require — module-level config load runs here against the fixture.
const appModule = require('../../../app/index');
const config = require('../../../lib/config').get_instance('default');
const mkdirp = require('mkdirp');
describe('Unit::EventConsole::app/index start() error branches', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('throws when rules construction fails', function () {
    sinon.stub(config, 'rules_path').throws(new Error('rules-fail'));
    expect(() => appModule.start(() => {})).to.throw(/rules-fail/);
  });

  it('throws when mkdirp on the upload directory fails', function () {
    sinon.stub(mkdirp, 'sync').throws(new Error('mkdir-fail'));
    expect(() => appModule.start(() => {})).to.throw(/mkdir-fail/);
  });

  it('lets console plugins disable local auth and register auth providers before express boot', function () {
    const plugin = {
      name: 'test-sso',
      applyConsole(context: any) {
        context.setLocalAuthEnabled(false);
        context.registerAuthProvider({
          id: 'entra',
          label: 'Sign in with Entra',
          url: '/auth/entra',
        });
      },
    };
    const testConfig: any = { consoleAdminSections: [] };

    appModule._internal.applyConsolePlugins([plugin], testConfig, {
      Field: {},
      SocketIO: {},
      logger: { info() {}, warn() {}, error() {} },
    });

    expect(testConfig.auth.local.enabled).to.equal(false);
    expect(testConfig.auth.providers).to.deep.equal([
      { id: 'entra', label: 'Sign in with Entra', url: '/auth/entra', className: '' },
    ]);
  });

  it('runs post-express auth hooks with app and passport context', function () {
    const seen: any[] = [];
    const plugin = {
      applyConsoleAuth(context: any) {
        seen.push(context.app, context.express, context.passport);
      },
    };
    const app = {};
    const express = { app };
    const fakePassport = { use() {} };

    appModule._internal.applyConsoleAuthPlugins([plugin], {}, {
      app,
      express,
      passport: fakePassport,
    });

    expect(seen[0]).to.equal(app);
    expect(seen[1]).to.equal(express);
    expect(seen[2]).to.equal(fakePassport);
  });
});

describe('Unit::EventConsole::app/index module-load failure', function () {
  // Clears app/index from the require cache and points OA_CONSOLE_CONFIG_FILE at a
  // non-existent file to drive the catch on line 28.
  //
  // Notably we do NOT re-require app/index in the finally block: the default
  // lib/config.load_file replaces the singleton wholesale, but lib/mongoose
  // (already cached) captured the original instance — re-requiring with the
  // default load_file desyncs them and breaks any downstream spec that mutates
  // config.mongodb. Leaving app/index out of the require cache is harmless
  // because no other unit spec requires it; integration specs go through the
  // _helpers/console_app helper which patches load_file to mutate-in-place.
  it('throws when the config file cannot be loaded', function () {
    const orig_config = process.env.OA_CONSOLE_CONFIG_FILE;
    const app_path = require.resolve('../../../app/index');
    delete require.cache[app_path];
    try {
      process.env.OA_CONSOLE_CONFIG_FILE = '/no/such/config.yml';
      expect(() => require('../../../app/index')).to.throw();
    } finally {
      process.env.OA_CONSOLE_CONFIG_FILE = orig_config;
      // Cache stays cleared. Original singleton (now mutated by other tests)
      // remains the get_instance() result for any subsequent specs.
    }
  });
});
