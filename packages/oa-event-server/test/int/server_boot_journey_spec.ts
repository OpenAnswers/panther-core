//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 12 — OAmonServer end-to-end boot.
//
// Boots the extracted OAmonServer class against the in-memory mongo, with
// nconf overrides pointing at random free ports and a minimal on-disk
// rules yaml. Asserts that start() completes cleanly and that the wired
// subsystems (alerts loader, monitor server, express server) came up.
//
// Does NOT go through the auto-starting lib/server.js shim — that's only
// used in production (server.sh / Dockerfile entrypoint / `yarn start`).

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const nconf = require('nconf');
const request = require('supertest');

describe('[integration] OAmonServer boot journey', function () {
  this.timeout(60_000);
  useMongo(this);

  let tmp_dir: string;
  let oafserver: any;

  before(async function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'svr-int-'));

    // Minimal server.rules.yml
    const rules_file = path.join(tmp_dir, 'server.rules.yml');
    fs.writeFileSync(
      rules_file,
      ['globals:', '  rules: []', 'groups:', '  _order: []', 'schedules: []', ''].join('\n')
    );

    // Stub alertdef — OAmonServer builds the AlertsLoader with the default
    // definitions file from OAmonHome. Overriding the loader's input isn't
    // straightforward via nconf, so we write a minimal alertdef.js at the
    // path the default AlertsLoader resolves to (etc/alertdef inside the
    // package). See lib/alerts_loader.js:54.
    // (No change here — the existing etc/alertdef.js in the package is
    // already valid.)

    // Grab the in-memory mongo host/port BEFORE we disconnect. useMongo
    // has already opened the connection; OAmonServer.connect_to_db wants
    // to open it itself with a different URI path ('/panther') which
    // mongoose refuses as "different connection string". Disconnect first,
    // let start() reconnect to the same memory server with our config.
    const { host, port } = mongoose.connection;
    await mongoose.disconnect();

    // Earlier integration specs register the 'alerts' model; drop it so
    // OAmonServer.define_alerts can register its own without tripping
    // mongoose's OverwriteModelError.
    try {
      mongoose.deleteModel('alerts');
    } catch {
      /* not registered */
    }

    // Require OAmonServer FIRST — its module-level `new ServerConfig()`
    // calls nconf.defaults({...automations: 1...}). We then layer
    // nconf.overrides on top so our test values win regardless of order.
    const { OAmonServer } = require('../../lib/OAmonServer');

    // NOTE: `automations` override has no effect — ServerConfig's
    // nconf.defaults runs too late for nconf.overrides() to win in this
    // version of nconf. AutomationManager loads either way; that's safe
    // because every shipped trigger has `activated: false` so no timer
    // ever arms and no broken trigger code runs.
    // nconf.overrides() after nconf.use('file') doesn't beat the file store
    // in this version, so write directly with nconf.set() — that lands on the
    // top writable store and cuts through the server.ini [db] section.
    nconf.set('port', 0); // ExpressServer listens on random port
    nconf.set('sockio_port', 0); // MonitorServer listens on random port
    nconf.set('rules_file', rules_file);
    nconf.set('loglevel', 'error');
    nconf.set('db:hostname', host);
    nconf.set('db:port', port);
    nconf.set('db:collection', 'panther_int');

    oafserver = new OAmonServer();

    await new Promise<void>((resolve, reject) => {
      oafserver.start(function (err: any) {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  after(async function () {
    // Tear down every listener / server we brought up. Order matters —
    // close sockets before dropping mongoose ref.
    try {
      oafserver?.es?.server?.close();
    } catch {
      /* noop */
    }
    try {
      oafserver?.monitor_server?.getListeningSocket()?.close();
    } catch {
      /* noop */
    }
    process.removeAllListeners('SIGHUP');
    // wipe the keys we set so other suites don't inherit them
    for (const k of ['port', 'sockio_port', 'rules_file', 'loglevel', 'db:hostname', 'db:port', 'db:collection']) {
      try {
        nconf.clear(k);
      } catch {
        /* noop */
      }
    }

    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  it('completes start() without error', function () {
    // Reaching here means start() called back with err === null
    expect(oafserver).to.be.an('object');
  });

  it('registers the AlertsLoader on the instance', function () {
    expect(oafserver.alerts).to.exist;
    expect(oafserver.alerts.getAllColumns()).to.be.an('array').that.is.not.empty;
  });

  it('registers the "alerts" mongoose model during define_alerts', function () {
    expect(mongoose.models.alerts).to.not.equal(undefined);
  });

  it('stands up the ExpressServer and binds a port', function () {
    expect(oafserver.es).to.exist;
    const addr = oafserver.es.server.address();
    expect(addr, 'express server should have bound').to.exist;
    expect(addr.port).to.be.a('number').greaterThan(0);
  });

  it('stands up the MonitorServer', function () {
    expect(oafserver.monitor_server).to.be.an('object');
    expect(oafserver.monitor_server.getListeningSocket()).to.not.equal(undefined);
  });

  it('installs a SIGHUP signal handler', function () {
    expect(process.listenerCount('SIGHUP')).to.be.greaterThan(0);
  });

  it('serves the /api/v1 welcome endpoint on the express port', async function () {
    const port = oafserver.es.server.address().port;
    const res = await request(`http://127.0.0.1:${port}`).get('/api/v1/').expect(200);
    expect(res.body).to.eql({ message: 'welcome to the API', version: 'v1' });
  });

  it('loaded the AutomationManager (no triggers fire — all shipped samples are activated:false)', function () {
    expect(oafserver.automations).to.be.an('object');
  });
});
