//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 1 — AlertDefinitions → alerts_loader → save/fetch alert.
//
// Exercises the path the server follows at boot (server.js:108-124):
//   1. new AlertsLoader({ definitionsFile })
//   2. loader.setup()  -> parses column definitions from a JS file
//   3. loader.registerAlertsSchema(db, cb) -> compiles + registers the
//                                             'alerts' mongoose model
//   4. save + fetch a document against an in-memory mongo, verifying the
//      dynamically-built schema actually round-trips data.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

describe('[integration] alerts_loader journey', function () {
  this.timeout(30_000);
  useMongo(this);

  let tmp_dir: string;
  let defs_file: string;
  let Alert: any;

  before(async function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'als-int-'));
    defs_file = path.join(tmp_dir, 'alertdef.js');

    // Minimal column set mirroring the shape the real alertdef.js uses.
    fs.writeFileSync(
      defs_file,
      `module.exports = {
      columns: [
        { name: 'identifier',       type: 'String',  priority: 'M', uniq: true },
        { name: 'node',             type: 'String',  priority: 'M', idx: true },
        { name: 'summary',          type: 'String',  priority: 'M' },
        { name: 'severity',         type: 'Number',  priority: 'M' },
        { name: 'owner',            type: 'String',  priority: 'O', default: '' },
        { name: 'acknowledged',     type: 'Boolean', priority: 'O' },
        { name: 'last_occurrence',  type: 'Date',    priority: 'O' },
        { name: 'upsert_timestamps', type: 'Number', priority: 'O' },
        { name: 'pre_identifier',   type: 'String',  priority: 'O' },
      ],
    };`
    );

    // The 'alerts' model name is shared with alerts.js and may already be
    // registered from a prior unit-test run in the same process. Drop it.
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
  });

  after(function () {
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  it('registers the "alerts" model backed by the in-memory mongo connection', function () {
    expect(Alert).to.exist;
    expect(Alert.modelName).to.equal('alerts');
    expect(Alert.db).to.equal(mongoose.connection);
  });

  it('saves an alert and reads it back with every declared column', async function () {
    const now = new Date();
    const doc = new Alert({
      identifier: 'host1:2:cpu high',
      node: 'host1',
      summary: 'cpu high',
      severity: 2,
      owner: 'alice',
      acknowledged: false,
      last_occurrence: now,
      upsert_timestamps: now.getTime(),
    });
    await doc.save();

    const fetched: any = await Alert.findOne({ identifier: 'host1:2:cpu high' }).lean();
    expect(fetched).to.exist;
    expect(fetched.node).to.equal('host1');
    expect(fetched.summary).to.equal('cpu high');
    expect(fetched.severity).to.equal(2);
    expect(fetched.owner).to.equal('alice');
    expect(fetched.acknowledged).to.equal(false);
    expect(new Date(fetched.last_occurrence).getTime()).to.equal(now.getTime());
  });

  it('applies the String default of "" for columns not supplied at save time', async function () {
    const doc = new Alert({
      identifier: 'host2:3:defaults',
      node: 'host2',
      summary: 'testing defaults',
      severity: 3,
      last_occurrence: new Date(),
      // owner not set — should default to ''
    });
    await doc.save();

    const fetched: any = await Alert.findOne({ identifier: 'host2:3:defaults' }).lean();
    expect(fetched.owner).to.equal('');
    expect(fetched.summary).to.equal('testing defaults');
  });

  it('enforces the unique index on identifier', async function () {
    await Alert.init(); // force unique index build before racing duplicates

    await new Alert({
      identifier: 'host3:1:dup',
      node: 'host3',
      summary: 'first',
      severity: 1,
      last_occurrence: new Date(),
    }).save();

    let caught: any = null;
    try {
      await new Alert({
        identifier: 'host3:1:dup',
        node: 'host3',
        summary: 'second — should be rejected',
        severity: 1,
        last_occurrence: new Date(),
      }).save();
    } catch (e: any) {
      caught = e;
    }
    expect(caught, 'duplicate identifier should fail').to.exist;
    expect(caught.code === 11000 || /duplicate/i.test(caught.message)).to.equal(true);
  });

  it('indexes node (idx: true) for query lookups', async function () {
    const indexes = await Alert.collection.indexes();
    const node_index = indexes.find((i: any) => i.key && i.key.node);
    expect(node_index, 'node index should exist').to.exist;
  });

  it('virtual `flags` reflects persisted state after a round trip', async function () {
    const doc = new Alert({
      identifier: 'host4:4:flags',
      node: 'host4',
      summary: 'flags test',
      severity: 4,
      owner: 'bob',
      history: [{ timestamp: new Date(), user: 'u', msg: 'h' }],
      notes: [{ timestamp: new Date(), user: 'u', msg: 'n' }],
      acknowledged: true,
      last_occurrence: new Date(),
    });
    await doc.save();

    // Re-fetch as a full document (not lean) so virtuals + methods are available
    const fetched = await Alert.findOne({ identifier: 'host4:4:flags' });
    expect(fetched.flags).to.include('H');
    expect(fetched.flags).to.include('N');
    expect(fetched.flags).to.include('A');
    expect(fetched.flags).to.include('U');
  });

  it('toClient() strips history and notes from a persisted document', async function () {
    const doc = new Alert({
      identifier: 'host5:2:toClient',
      node: 'host5',
      summary: 'client view',
      severity: 2,
      history: [{ timestamp: new Date(), user: 'u', msg: 'h' }],
      notes: [{ timestamp: new Date(), user: 'u', msg: 'n' }],
      last_occurrence: new Date(),
    });
    await doc.save();

    const fetched = await Alert.findOne({ identifier: 'host5:2:toClient' });
    const out = fetched.toClient();
    expect(out.history).to.equal(undefined);
    expect(out.notes).to.equal(undefined);
    expect(out.node).to.equal('host5');
  });
});
