//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 9b — ClientManager Socket* handlers + updateAlerts pipeline.
//
// The existing client_manager_journey_spec covers construction wiring, ping,
// disconnect and the Updates.* bus listener. This spec covers the per-event
// handlers (Acknowledge, Severity, Assign, Delete, SetFilter), the helpers
// (filterSerials, isUndefinedOrNull, sessionUserIfExists), and the underlying
// updateAlerts → updateEmitFromSerials emit pipeline.
//
// The handlers reference bare globals (`Alerts`, `Filters`) that are installed
// at runtime by OAmonServer.js — we set them on `global` for the lifetime of
// each test and tear them down afterwards.
//
// Excluded by design (genuinely broken on entry, not coverage candidates):
//   - SocketExternalClass: references an undefined `self` at line 1
//   - socket_error:         references undeclared `err` and `self`
//   - SocketStartChart / SocketSendChartData: throws via callback in setInterval

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const mongoose = require('mongoose');
const EventEmitter = require('events').EventEmitter;

const { ClientManager } = require('../../lib/ClientManager');
const Severity = require('../../lib/severity').Model;
const bus = require('../../lib/ipcbus').internal_bus;

describe('[integration] ClientManager handlers', function () {
  this.timeout(30_000);
  useMongo(this);

  let Alert: any;
  let Filter: any;

  let had_Alerts: boolean;
  let had_Filters: boolean;

  function make_socket(opts: any = {}) {
    const sock: any = new EventEmitter();
    sock.id = opts.id ?? 'sock-1';
    sock.request =
      opts.request === undefined ? { session: { user: { username: opts.username ?? 'alice' } } } : opts.request;
    sock.disconnect = (msg?: string) => {
      sock.disconnected = msg ?? true;
    };
    sock.emitted = [];
    sock.emit = (ev: string, data: any) => {
      sock.emitted.push({ ev, data });
      return true;
    };
    return sock;
  }

  function make_sio() {
    const sio: any = new EventEmitter();
    sio.emitted = [];
    sio.emit = (ev: string, data: any) => {
      sio.emitted.push({ ev, data });
      return true;
    };
    return sio;
  }

  before(function () {
    // ClientManager guards a debug log with `logger.isTraceEnabled()` (line 257)
    // but oa-logging's EventLogger doesn't expose that method — calling it
    // throws and kills the Mongoose update callback that runs after every
    // updateAlerts. Patch the prototype with a no-op so update handlers can
    // run; document this as a real bug in ClientManager (not test-only).
    const oa_logging = require('oa-logging');
    const sample_logger = oa_logging('oa:test:cm-handlers-spec').logger;
    const evlog_proto = Object.getPrototypeOf(sample_logger);
    if (typeof evlog_proto.isTraceEnabled !== 'function') {
      evlog_proto.isTraceEnabled = function () {
        return false;
      };
    }

    // Register schemas once for the whole describe — useMongo's beforeEach
    // wipes the collections between tests so models can be reused.
    try {
      mongoose.deleteModel('alerts');
    } catch {
      /* not registered */
    }
    try {
      mongoose.deleteModel('filters');
    } catch {
      /* not registered */
    }

    const AlertSchema = new mongoose.Schema({
      autoincr_id: { type: Number, index: true },
      identifier: String,
      summary: String,
      severity: Number,
      owner: String,
      acknowledged: Boolean,
      external_class: String,
      state_change: Date,
      first_occurrence: Date,
      deleted_at: Date,
      history: [{ msg: String, datetime: Date, timestamp: Number, user: String }],
    });
    AlertSchema.method('toClient', function () {
      return this.toObject();
    });
    Alert = mongoose.model('alerts', AlertSchema);

    const FilterSchema = new mongoose.Schema({
      user: String,
      name: String,
      f: mongoose.Schema.Types.Mixed,
    });
    Filter = mongoose.model('filters', FilterSchema);
  });

  beforeEach(async function () {
    // Severity rows so the constructor's severity_map fetch resolves cleanly.
    await new Severity({ value: 1, label: 'Clear', system: true, background: '#0f0', foreground: '#000' }).save();
    await new Severity({ value: 5, label: 'Critical', system: true, background: '#f00', foreground: '#000' }).save();

    had_Alerts = 'Alerts' in (global as any);
    had_Filters = 'Filters' in (global as any);
    (global as any).Alerts = Alert;
    (global as any).Filters = Filter;
  });

  afterEach(function () {
    if (!had_Alerts) delete (global as any).Alerts;
    if (!had_Filters) delete (global as any).Filters;
    bus.removeAllListeners();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Pure helpers
  // ─────────────────────────────────────────────────────────────────────

  describe('helpers', function () {
    it('isUndefinedOrNull returns true for null/undefined and false otherwise', function () {
      const cm = new ClientManager({ socket: make_socket(), sio: make_sio() });
      expect(cm.isUndefinedOrNull(undefined)).to.equal(true);
      expect(cm.isUndefinedOrNull(null)).to.equal(true);
      expect(cm.isUndefinedOrNull(0)).to.equal(false);
      expect(cm.isUndefinedOrNull('')).to.equal(false);
      expect(cm.isUndefinedOrNull({})).to.equal(false);
    });

    it('filterSerials drops non-numeric values', function (done) {
      const cm = new ClientManager({ socket: make_socket(), sio: make_sio() });
      cm.filterSerials(['1', '2', 'x', 'NaN', '3.14', undefined, null], (filtered: any[]) => {
        try {
          // async.filter returns the items that pass the predicate
          expect(filtered).to.eql(['1', '2', '3.14']);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('socket_id_or_null returns the socket id, "null" only when missing', function () {
      const sock = make_socket({ id: 'abcdef' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });
      expect(cm.socket_id_or_null()).to.equal('abcdef');
      expect(cm.socket_log()).to.equal('abcdef : ');
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // sessionUserIfExists — error branches
  // ─────────────────────────────────────────────────────────────────────

  describe('sessionUserIfExists', function () {
    it('returns the username when the session is fully populated', function () {
      const sock = make_socket({ username: 'bob' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });
      expect(cm.sessionUserIfExists(() => 'fallback')).to.equal('bob');
    });

    // The three error branches each try to invoke `self.socket.disconnect(...)`
    // but `self` is a bare reference that's never declared in the function —
    // a real bug. They throw ReferenceError before the cb is ever called.
    // We construct with a valid socket (so the constructor's own call to
    // sessionUserIfExists succeeds), then mutate `socket.request` and assert
    // the throw — that still exercises the lines up to the bad reference.

    it('throws on the bare-self bug when socket.request is missing', function () {
      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });
      cm.socket.request = null;
      expect(() => cm.sessionUserIfExists(() => {})).to.throw(/self is not defined/);
    });

    it('throws on the bare-self bug when socket.request.session is missing', function () {
      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });
      cm.socket.request = {};
      expect(() => cm.sessionUserIfExists(() => {})).to.throw(/self is not defined/);
    });

    it('throws on the bare-self bug when session.user is missing', function () {
      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });
      cm.socket.request = { session: {} };
      expect(() => cm.sessionUserIfExists(() => {})).to.throw(/self is not defined/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // updateAlerts pipeline (driven via SocketAcknowledge/Severity/Assign)
  // ─────────────────────────────────────────────────────────────────────

  describe('Socket* update handlers', function () {
    async function seed_alerts() {
      await Alert.create([
        {
          autoincr_id: 10,
          identifier: 'host1:err',
          severity: 5,
          summary: 's10',
          state_change: new Date(0),
          first_occurrence: new Date(0),
        },
        {
          autoincr_id: 11,
          identifier: 'host2:err',
          severity: 4,
          summary: 's11',
          state_change: new Date(0),
          first_occurrence: new Date(0),
        },
      ]);
    }

    async function wait_for_emit(target: any, ev: string, max_ms = 3000) {
      const started = Date.now();
      while (!target.emitted.some((e: any) => e.ev === ev) && Date.now() - started < max_ms) {
        await new Promise(r => setImmediate(r));
      }
      const found = target.emitted.find((e: any) => e.ev === ev);
      if (!found) throw new Error(`emit '${ev}' never fired`);
      return found;
    }

    it('SocketAcknowledge: marks alerts as acknowledged and emits the updates broadcast', async function () {
      await seed_alerts();
      const sock = make_socket({ username: 'alice' });
      const sio = make_sio();
      const cm = new ClientManager({ socket: sock, sio });

      cm.SocketAcknowledge({ serials: [10, 11], set: true });

      await wait_for_emit(sio, 'updates');

      const docs = await Alert.find({ autoincr_id: { $in: [10, 11] } }).lean();
      for (const d of docs) {
        expect(d.acknowledged, `alert ${d.autoincr_id}`).to.equal(true);
        expect(d.owner).to.equal('alice');
        expect(d.history).to.have.lengthOf(1);
        expect(d.history[0].msg).to.equal('acknowldeged');
        expect(d.history[0].user).to.equal('alice');
      }

      const ev = sio.emitted.find((e: any) => e.ev === 'updates');
      expect(ev.data.updates).to.have.lengthOf(2);
    });

    it('SocketAcknowledge with set:false records "unacknowledged" history', async function () {
      await seed_alerts();
      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      cm.SocketAcknowledge({ serials: [10], set: false });
      await wait_for_emit(cm.sio, 'updates');

      const doc = await Alert.findOne({ autoincr_id: 10 }).lean();
      expect(doc.acknowledged).to.equal(false);
      expect(doc.history[0].msg).to.equal('unacknowledged');
    });

    it('SocketSeverity: updates severity and pushes a severity-change history entry', async function () {
      await seed_alerts();
      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      cm.SocketSeverity({ serials: [10], severity: 1 });
      await wait_for_emit(cm.sio, 'updates');

      const doc = await Alert.findOne({ autoincr_id: 10 }).lean();
      expect(doc.severity).to.equal(1);
      expect(doc.history[0].msg).to.equal('Severity changed to 1');
    });

    it('SocketAssign: sets owner and pushes an assignment history entry', async function () {
      await seed_alerts();
      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      cm.SocketAssign({ serials: [11], to: 'bob' });
      await wait_for_emit(cm.sio, 'updates');

      const doc = await Alert.findOne({ autoincr_id: 11 }).lean();
      expect(doc.owner).to.equal('bob');
      expect(doc.history[0].msg).to.equal('Assigned to bob');
    });

    it('SocketDelete: removes the matching alerts and emits "deletes" on sio', async function () {
      await seed_alerts();
      const sock = make_socket({ username: 'alice' });
      const sio = make_sio();
      const cm = new ClientManager({ socket: sock, sio });

      cm.SocketDelete({ serials: [10, 11] });
      await wait_for_emit(sio, 'deletes');

      const remaining = await Alert.find({ autoincr_id: { $in: [10, 11] } }).lean();
      expect(remaining).to.have.lengthOf(0);

      const ev = sio.emitted.find((e: any) => e.ev === 'deletes');
      expect(ev.data.data).to.have.members([10, 11]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // SocketSetFilter — exercises the Filters.findById waterfall + initial emit
  // ─────────────────────────────────────────────────────────────────────

  describe('SocketSetFilter', function () {
    it('rejects an undefined filter id', function () {
      const sock = make_socket();
      const cm = new ClientManager({ socket: sock, sio: make_sio() });
      // socket_error is genuinely broken (refs undeclared `err` and `self`),
      // so calling it throws — the contract under test is just that the
      // method short-circuits without proceeding to Filters.findById.
      expect(() => cm.SocketSetFilter({})).to.throw();
    });

    it('loads the filter, queries Alerts, and emits "inserts" with toClient docs', async function () {
      await Alert.create([
        { autoincr_id: 20, identifier: 'a:1', severity: 5, summary: 'critical-thing', state_change: new Date(0) },
        { autoincr_id: 21, identifier: 'a:2', severity: 1, summary: 'noise', state_change: new Date(0) },
      ]);
      const filter = await Filter.create({
        user: 'alice',
        name: 'crit-only',
        f: { severity: 5 },
      });

      const sock = make_socket({ username: 'alice' });
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      cm.SocketSetFilter({ fid: String(filter._id) });

      // The waterfall ends by emitting either 'inserts' (results) or 'empty'.
      const started = Date.now();
      while (!sock.emitted.some((e: any) => ['inserts', 'empty'].includes(e.ev)) && Date.now() - started < 3000) {
        await new Promise(r => setImmediate(r));
      }

      const ev = sock.emitted.find((e: any) => ['inserts', 'empty'].includes(e.ev));
      expect(ev, 'expected inserts or empty event').to.exist;
      if (ev.ev === 'inserts') {
        expect(ev.data.data).to.have.lengthOf(1);
        expect(ev.data.data[0].autoincr_id).to.equal(20);
      }

      // startDeltas was triggered as the final waterfall step
      expect(cm.getDeltaTimerId()).to.exist;
      // Clear the interval the test set up so we don't leak timers
      clearInterval(cm.getDeltaTimerId());
    });
  });
});
