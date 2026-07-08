//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 4 — TriggerDelete.fire end-to-end.
//
// The production boot sequence in server.js:121 installs the compiled Alert
// model as the global `Alerts`. TriggerDelete.fire then references that
// global to query and remove matching documents, emitting `Deletes.*` on
// the internal bus with the list of deleted _ids.
//
// This spec mirrors that flow against in-memory mongo + a real trigger
// instance, asserting that matching docs are removed, non-matching docs
// remain, and the bus event fires with the right payload.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

const { TriggerDelete } = require('../../lib/triggers');
const bus = require('../../lib/ipcbus').internal_bus;

describe('[integration] TriggerDelete.fire journey', function () {
  this.timeout(30_000);
  useMongo(this);

  let tmp_dir: string;
  let Alert: any;

  before(async function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdel-int-'));
    const defs_file = path.join(tmp_dir, 'alertdef.js');
    fs.writeFileSync(
      defs_file,
      `module.exports = {
      columns: [
        { name: 'identifier',      type: 'String', priority: 'M', uniq: true },
        { name: 'node',            type: 'String', priority: 'M' },
        { name: 'summary',         type: 'String', priority: 'M' },
        { name: 'severity',        type: 'Number', priority: 'M' },
        { name: 'last_occurrence', type: 'Date',   priority: 'O' },
      ],
    };`
    );

    try {
      mongoose.deleteModel('alerts');
    } catch {
      /* not registered */
    }

    const { AlertsLoader } = require('../../lib/alerts_loader');
    const loader = new AlertsLoader({ definitionsFile: defs_file });
    loader.setup();

    await new Promise<void>((resolve, reject) => {
      loader.registerAlertsSchema(mongoose.connection.db, (err: any, model: any) => {
        if (err) return reject(err);
        Alert = model;
        resolve();
      });
    });

    // server.js:121 installs the Alert model as a global for the trigger /
    // action code paths to reach. Mirror that here.
    (global as any).Alerts = Alert;
  });

  after(function () {
    delete (global as any).Alerts;
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  // helper: seed a fresh set of alerts for a test
  async function seed(rows: any[]) {
    for (const r of rows) {
      await new Alert({
        node: r.node ?? 'host',
        summary: r.summary ?? 'probe',
        severity: r.severity,
        identifier: r.identifier,
        last_occurrence: new Date(),
      }).save();
    }
  }

  // helper: remove all listeners for 'Deletes.*' added inside a test
  function resetBus() {
    bus.removeAllListeners('Deletes.*');
  }

  it('deletes documents matching the trigger query, leaves others untouched', async function () {
    await seed([
      { identifier: 'd1', severity: 1 },
      { identifier: 'd2', severity: 1 },
      { identifier: 'k1', severity: 5 },
    ]);

    const trigger = new TriggerDelete({
      name: `tdel_match_${Date.now()}`,
      query: { severity: 1 },
      action: 'delete',
      when: { periodic: 60 },
    });

    await new Promise<void>((resolve, reject) => {
      trigger.fire((err: any) => (err ? reject(err) : resolve()));
    });

    const remaining = await Alert.find({}).lean();
    const ids = remaining.map((a: any) => a.identifier).sort();
    expect(ids).to.eql(['k1']);
    resetBus();
  });

  it('emits Deletes.* on the internal bus with the removed _ids', async function () {
    await seed([
      { identifier: 'e1', severity: 2 },
      { identifier: 'e2', severity: 2 },
    ]);

    const before_ids = (await Alert.find({ severity: 2 }).lean()).map((a: any) => String(a._id)).sort();

    let captured: any = null;
    bus.once('Deletes.*', function (source: string, ids: any[]) {
      captured = { source, ids: ids.map(String).sort() };
    });

    const trigger = new TriggerDelete({
      name: `tdel_bus_${Date.now()}`,
      query: { severity: 2 },
      action: 'delete',
      when: { periodic: 60 },
    });

    await new Promise<void>((resolve, reject) => {
      trigger.fire((err: any) => (err ? reject(err) : resolve()));
    });

    expect(captured, 'bus event should have fired').to.exist;
    expect(captured.source).to.equal('triggers');
    expect(captured.ids).to.eql(before_ids);
    resetBus();
  });

  it('does nothing and does not emit when no documents match', async function () {
    await seed([{ identifier: 'x1', severity: 9 }]);

    let fired = false;
    bus.once('Deletes.*', () => {
      fired = true;
    });

    const trigger = new TriggerDelete({
      name: `tdel_empty_${Date.now()}`,
      query: { severity: 1 },
      action: 'delete',
      when: { periodic: 60 },
    });

    await new Promise<void>((resolve, reject) => {
      trigger.fire((err: any) => (err ? reject(err) : resolve()));
    });

    const remaining = await Alert.find({}).lean();
    expect(remaining).to.have.lengthOf(1);
    expect(fired).to.equal(false);
    resetBus();
  });

  it('supports a function-valued query via fetchQuery()', async function () {
    await seed([
      { identifier: 'f1', severity: 3 },
      { identifier: 'f2', severity: 7 },
    ]);

    const trigger = new TriggerDelete({
      name: `tdel_fn_${Date.now()}`,
      query: function () {
        return { severity: { $lt: 5 } };
      },
      action: 'delete',
      when: { periodic: 60 },
    });

    await new Promise<void>((resolve, reject) => {
      trigger.fire((err: any) => (err ? reject(err) : resolve()));
    });

    const remaining = await Alert.find({}).lean();
    const ids = remaining.map((a: any) => a.identifier);
    expect(ids).to.eql(['f2']);
    resetBus();
  });
});
