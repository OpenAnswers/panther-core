//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 2 — Alert save pre-save hook writes to AlertOccurences.
//
// The pre-save hook in alerts_loader.js upserts an AlertOccurences record
// keyed on the alert's identifier, pushing last_occurrence onto `current`
// with a 1440-element rolling window. Exercised end-to-end against real
// mongoose models in an in-memory mongo.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

const AlertOccurences = require('../../lib/alert_occurrences').Model;

describe('[integration] AlertOccurences pre-save journey', function () {
  this.timeout(30_000);
  useMongo(this);

  let tmp_dir: string;
  let defs_file: string;
  let Alert: any;

  before(async function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alo-int-'));
    defs_file = path.join(tmp_dir, 'alertdef.js');

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
  });

  after(function () {
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  async function save_alert(identifier: string, last: Date) {
    // With a unique index on identifier, subsequent saves of the "same" alert
    // need to reuse the document; simulate the monitor server's upsert flow
    // by finding+updating or inserting.
    let doc = await Alert.findOne({ identifier });
    if (!doc)
      doc = new Alert({
        identifier,
        node: 'host1',
        summary: 'probe',
        severity: 3,
      });
    doc.last_occurrence = last;
    await doc.save();
    return doc;
  }

  it('creates an AlertOccurences record on the first save', async function () {
    const t0 = new Date('2026-04-23T08:00:00Z');
    await save_alert('occ:first', t0);

    const occ = await AlertOccurences.findOne({ identifier: 'occ:first' }).lean();
    expect(occ).to.exist;
    expect(occ.current).to.have.lengthOf(1);
    expect(new Date(occ.current[0]).getTime()).to.equal(t0.getTime());
  });

  it('appends timestamps to the existing record on repeat saves', async function () {
    const t0 = new Date('2026-04-23T08:00:00Z');
    const t1 = new Date('2026-04-23T08:01:00Z');
    const t2 = new Date('2026-04-23T08:02:00Z');

    await save_alert('occ:repeat', t0);
    await save_alert('occ:repeat', t1);
    await save_alert('occ:repeat', t2);

    const occ = await AlertOccurences.findOne({ identifier: 'occ:repeat' }).lean();
    expect(occ.current).to.have.lengthOf(3);
    expect(occ.current.map((d: any) => new Date(d).getTime())).to.eql([t0.getTime(), t1.getTime(), t2.getTime()]);
  });

  it('keeps one AlertOccurences record per identifier (not one per save)', async function () {
    const base = new Date('2026-04-23T09:00:00Z').getTime();
    for (let i = 0; i < 5; i++) {
      await save_alert('occ:single', new Date(base + i * 1000));
    }

    const count = await AlertOccurences.countDocuments({ identifier: 'occ:single' });
    expect(count).to.equal(1);

    const occ = await AlertOccurences.findOne({ identifier: 'occ:single' }).lean();
    expect(occ.current).to.have.lengthOf(5);
  });

  it('keeps different identifiers in separate AlertOccurences records', async function () {
    const t = new Date('2026-04-23T10:00:00Z');
    await save_alert('occ:a', t);
    await save_alert('occ:b', t);

    const a = await AlertOccurences.findOne({ identifier: 'occ:a' }).lean();
    const b = await AlertOccurences.findOne({ identifier: 'occ:b' }).lean();
    expect(a).to.exist;
    expect(b).to.exist;
    expect(String(a._id)).to.not.equal(String(b._id));
  });

  it('caps the rolling window at 1440 entries via $slice', async function () {
    // Seed a record with 1440 existing entries, then save once more and verify
    // the window stays at 1440 (oldest entry dropped, newest appended).
    const seeded: Date[] = [];
    for (let i = 0; i < 1440; i++) {
      seeded.push(new Date(1_700_000_000_000 + i * 1000));
    }
    await AlertOccurences.create({
      identifier: 'occ:capped',
      current: seeded,
    });

    const next_ts = new Date(1_700_000_000_000 + 1440 * 1000);
    await save_alert('occ:capped', next_ts);

    const occ = await AlertOccurences.findOne({ identifier: 'occ:capped' }).lean();
    expect(occ.current).to.have.lengthOf(1440);
    // Newest entry should be the one we just pushed
    expect(new Date(occ.current[occ.current.length - 1]).getTime()).to.equal(next_ts.getTime());
    // Oldest entry (seeded[0]) should have been shifted out
    expect(new Date(occ.current[0]).getTime()).to.equal(seeded[1].getTime());
  });
});
