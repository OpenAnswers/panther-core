//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 11 — MonitorServer event ingest pipeline.
//
// Drives the hot path:
//   newevent(ev) -> insertevent -> rules processing
//                                -> inventory + occurrences + alert upsert
//
// start() is NOT called. start() binds a port, creates a socket.io server,
// and loads the rules yaml from disk — all out of scope for a unit-shaped
// integration test. We mount serverRules directly via setServerRules() so
// insertevent has something to run the event through.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

const { EventRules } = require('oa-event-rules');

const { MonitorServer } = require('../../lib/monitor_server');
const Inventory = require('../../lib/inventory').Model;

describe('[integration] MonitorServer event ingest journey', function () {
  this.timeout(30_000);
  useMongo(this);

  let tmp_dir: string;
  let Alert: any;

  before(async function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mon-int-'));
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
        { name: 'first_occurrence', type: 'Date',  priority: 'O' },
        { name: 'state_change',    type: 'Date',   priority: 'O' },
        { name: 'tally',           type: 'Number', priority: 'O' },
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

    // promisedUpsertAlert references the global `Alerts` (line 329 of
    // monitor_server.js) — server.js:121 sets this in production.
    (global as any).Alerts = Alert;
  });

  after(function () {
    delete (global as any).Alerts;
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  // Build a MonitorServer with a minimal in-memory ruleset attached.
  function make_ms(rules_doc: any = { globals: { rules: [] }, groups: { _order: [] }, schedules: [] }) {
    const rules = new EventRules({ server: true, doc: rules_doc });
    const ms: any = new MonitorServer({
      Alerts: Alert,
      endpoint: 0,
      mandatoryColumns: ['identifier', 'node', 'summary', 'severity'],
      allowedColumns: [
        'identifier',
        'node',
        'summary',
        'severity',
        'last_occurrence',
        'first_occurrence',
        'state_change',
        'tally',
      ],
    });
    ms.setServerRules(rules);
    return ms;
  }

  describe('newevent routing', function () {
    it('routes mode="insert" to insertevent', function (done) {
      const ms = make_ms();
      ms.newevent(
        {
          mode: 'insert',
          fields: { identifier: 'n:3:route', node: 'n', summary: 'route-ins', severity: 3 },
        },
        function (_err: any, result: any) {
          expect(result).to.exist;
          expect(result.state).to.equal('inserted');
          done();
        }
      );
    });

    it('routes mode="inserts" to insertevents and processes each item', async function () {
      const ms = make_ms();
      // insertevents fires each item asynchronously without awaiting — we
      // can verify the side effects landed by polling mongo after it returns.
      ms.newevent({
        mode: 'inserts',
        alerts: [
          { mode: 'insert', fields: { identifier: 'b:1', node: 'batch-1', summary: 's1', severity: 1 } },
          { mode: 'insert', fields: { identifier: 'b:2', node: 'batch-2', summary: 's2', severity: 2 } },
        ],
      });

      // Poll briefly for both docs to land — the batch runs fire-and-forget.
      const deadline = Date.now() + 5_000;
      let count = 0;
      while (Date.now() < deadline) {
        count = await Alert.countDocuments({ node: { $in: ['batch-1', 'batch-2'] } });
        if (count >= 2) break;
        await new Promise(r => setTimeout(r, 50));
      }
      expect(count).to.equal(2);
    });

    it('no-ops (warn log) when mode is missing', function () {
      const ms = make_ms();
      // Should not throw
      expect(() => ms.newevent({ fields: { identifier: 'x' } })).to.not.throw();
    });

    it('no-ops (warn log) when mode is unknown', function () {
      const ms = make_ms();
      expect(() => ms.newevent({ mode: 'mystery', fields: {} })).to.not.throw();
    });
  });

  describe('insertevent — happy path', function () {
    // NOTE: the rules engine rewrites the identifier with a deterministic
    // hash during processing (see event_rules.ts / Event.generate). The
    // alert ends up in mongo under the hashed identifier, NOT the one we
    // sent in. The processed identifier is returned on result.event.
    it('upserts a new event into alerts and calls back with "inserted"', function (done) {
      const ms = make_ms();
      ms.insertevent(
        {
          mode: 'insert',
          fields: {
            identifier: 'happy:3:cpu',
            node: 'happy-host',
            summary: 'cpu high',
            severity: 3,
          },
        },
        async function (err: any, result: any) {
          try {
            expect(err).to.equal(null);
            expect(result.state).to.equal('inserted');
            const processed_id = result.event.identifier;
            expect(processed_id).to.be.a('string');
            const stored = await Alert.findOne({ identifier: processed_id }).lean();
            expect(stored).to.exist;
            expect(stored.node).to.equal('happy-host');
            expect(stored.summary).to.equal('cpu high');
            done();
          } catch (e) {
            done(e);
          }
        }
      );
    });

    it('updates an existing event when the same fields produce the same hashed identifier', function (done) {
      const ms = make_ms();
      const ev = {
        mode: 'insert',
        fields: {
          identifier: 'repeat:3:flap',
          node: 'flap-host',
          summary: 'flap first',
          severity: 3,
        },
      };

      ms.insertevent(ev, function (_err1: any, first_result: any) {
        const hashed_id = first_result.event.identifier;
        // Second occurrence — new summary, same other fields; rules engine
        // should produce the same hashed identifier and the upsert should
        // land on the existing document.
        const ev2 = { ...ev, fields: { ...ev.fields, summary: 'flap second' } };
        ms.insertevent(ev2, async function (_err: any, result: any) {
          try {
            expect(result.state).to.equal('updated');
            const count = await Alert.countDocuments({ node: 'flap-host' });
            expect(count).to.equal(1);
            const stored = await Alert.findOne({ identifier: hashed_id }).lean();
            expect(stored.summary).to.equal('flap second');
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });

    it('populates Inventory with the event node', function (done) {
      const ms = make_ms();
      ms.insertevent(
        {
          mode: 'insert',
          fields: {
            identifier: 'inv:4:noise',
            node: 'inv-host',
            summary: 'noise',
            severity: 4,
          },
        },
        async function () {
          try {
            const entry = await Inventory.findOne({ node: 'inv-host' }).lean();
            expect(entry).to.exist;
            done();
          } catch (e) {
            done(e);
          }
        }
      );
    });
  });

  describe('insertevent — validation', function () {
    it('calls back with a ValidationError when ev.fields is missing', function (done) {
      const ms = make_ms();
      ms.insertevent({ mode: 'insert' /* no fields */ }, function (err: any) {
        expect(err).to.exist;
        expect(err)
          .to.have.property('message')
          .that.match(/missing the fields property/);
        done();
      });
    });

    it('throws when cb is not a function', function () {
      const ms = make_ms();
      expect(() => ms.insertevent({ mode: 'insert', fields: {} }, /* cb */ undefined)).to.throw(/cb not fn/);
    });
  });

  describe('insertevent — rule discards event', function () {
    it('does NOT insert when a rule discards the event', function (done) {
      // A rule that matches every event and marks it discarded
      const rules_doc = {
        globals: {
          rules: [
            {
              name: 'discard_all',
              all: true,
              discard: true,
            },
          ],
        },
        groups: { _order: [] },
        schedules: [],
      };

      const ms = make_ms(rules_doc);
      ms.insertevent(
        {
          mode: 'insert',
          fields: {
            identifier: 'drop:1:ignore',
            node: 'drop-host',
            summary: 'should be ignored',
            severity: 1,
          },
        },
        async function (response: any) {
          try {
            expect(response).to.have.property('state', 'dropped');
            const count = await Alert.countDocuments({ identifier: 'drop:1:ignore' });
            expect(count).to.equal(0);
            done();
          } catch (e) {
            done(e);
          }
        }
      );
    });
  });

  describe('flattenMatches', function () {
    it('returns an empty array for an event with no rule matches', function () {
      const ms = make_ms();
      const fake_event = { matches: { global: [], group: [] } };
      const flattened = ms.flattenMatches(fake_event);
      expect(flattened).to.eql([]);
    });

    it('returns global uuids when present', function () {
      const ms = make_ms();
      const fake_event = {
        matches: {
          global: [
            { name: 'r1', uuid: 'u1' },
            { name: 'r2', uuid: 'u2' },
          ],
          group: [],
        },
      };
      const flattened = ms.flattenMatches(fake_event);
      expect(flattened).to.include('u1');
      expect(flattened).to.include('u2');
    });
  });
});
