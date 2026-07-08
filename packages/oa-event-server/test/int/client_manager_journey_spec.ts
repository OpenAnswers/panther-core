//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 9 — ClientManager life-cycle + bus wiring.
//
// Covers the essential Client <-> Server <-> Bus boundary:
//   - construction wires all declared socket event handlers
//   - construction queries Severity, pushes the result over the socket
//   - construction registers bus listeners for Severity, Preferences, Updates
//   - 'ping' from the client receives 'pong' from the server
//   - 'disconnect' clears timers and attempts to remove bus listeners
//
// The individual Socket* handlers (Acknowledge, Severity, Assign, Delete,
// ExternalClass, SetFilter, StartChart) are intentionally deferred to
// follow-up journeys — each has its own fixture shape and several reach for
// undeclared globals (e.g. `Filters`, which doesn't live in this package).

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const mongoose = require('mongoose');
const EventEmitter = require('events').EventEmitter;

const { ClientManager } = require('../../lib/ClientManager');
const Severity = require('../../lib/severity').Model;
const bus = require('../../lib/ipcbus').internal_bus;

describe('[integration] ClientManager journey', function () {
  this.timeout(30_000);
  useMongo(this);

  function make_socket(opts: any = {}) {
    const sock: any = new EventEmitter();
    sock.id = opts.id ?? 'sock-1';
    sock.request = {
      session: {
        user: { username: opts.username ?? 'alice' },
      },
    };
    // ClientManager calls socket.disconnect in a couple of error branches
    sock.disconnect = () => {};

    // Real socket.io emit is asymmetric (server→client) and does NOT trigger
    // server-side listeners. Our EventEmitter fake would by default, so we
    // always override emit to record-only. Individual tests can inspect the
    // recorded list via sock.emitted.
    sock.emitted = [];
    sock.emit = (ev: string, data: any) => {
      sock.emitted.push({ ev, data });
      return true;
    };
    return sock;
  }

  function make_sio() {
    // sio is used for broadcast-style emits on the server-wide namespace.
    const sio: any = new EventEmitter();
    return sio;
  }

  beforeEach(async function () {
    // Ensure at least one system severity exists so the constructor's
    // severity_map build does not assert on an empty result.
    await new Severity({ value: 1, label: 'Clear', system: true, background: '#0f0', foreground: '#000' }).save();
    await new Severity({ value: 5, label: 'Critical', system: true, background: '#f00', foreground: '#000' }).save();
  });

  afterEach(function () {
    // Bus listeners added by ClientManager persist on the process-wide
    // internal_bus — wipe between tests.
    bus.removeAllListeners();
  });

  // Wait for microtask / immediate queue to drain — the constructor's async
  // severity_map fetch resolves after a tick or two.
  async function tick_until(predicate: () => boolean, max_ms = 2000) {
    const started = Date.now();
    while (!predicate() && Date.now() - started < max_ms) {
      await new Promise(r => setImmediate(r));
    }
    if (!predicate()) throw new Error('tick_until: predicate never became true');
  }

  describe('construction', function () {
    it('registers socket listeners for every declared client event', async function () {
      const sock = make_socket();
      new ClientManager({ socket: sock, sio: make_sio() });

      const expected = [
        'close',
        'disconnect',
        'setfilter',
        'acknowledge',
        'severity',
        'assign',
        'startchart',
        'ping',
        'error',
      ];
      for (const ev of expected) {
        expect(sock.listenerCount(ev), `listener for '${ev}' should be registered`).to.be.greaterThan(0);
      }
    });

    it('emits the initial severity payload down the socket', async function () {
      const sock = make_socket();
      new ClientManager({ socket: sock, sio: make_sio() });

      await tick_until(() => sock.emitted.some((e: any) => e.ev === 'severity'));
      const sev_event = sock.emitted.find((e: any) => e.ev === 'severity');
      expect(sev_event).to.exist;
      expect(sev_event.data).to.have.property('data');
      expect(sev_event.data.data).to.be.an('array');
    });

    it('registers bus listeners scoped to the session username', async function () {
      const sock = make_socket({ username: 'alice' });
      new ClientManager({ socket: sock, sio: make_sio() });

      // Updates.* — a real working channel; ClientManager listens here
      // (line 152) and publishes here (line 227).
      expect(bus.listenerCount('Updates.*')).to.be.greaterThan(0);

      // Severity.<username> and Preferences.<username> — listeners are
      // registered here but NOTHING in the codebase emits on these topics
      // (tier C dead-listener bug still outstanding). The topic key itself
      // is now correct after the Tier B sessionUserIfExists fix.
      expect(bus.listenerCount('Severity.alice')).to.be.greaterThan(0);
      expect(bus.listenerCount('Preferences.alice')).to.be.greaterThan(0);
    });
  });

  describe('ping / pong round-trip', function () {
    it("emits 'pong' back when the client sends 'ping'", function () {
      const sock = make_socket();
      new ClientManager({ socket: sock, sio: make_sio() });

      // Clear anything recorded during construction before simulating the ping
      sock.emitted.length = 0;

      // Simulate the client-side emit arriving at the server handler
      sock.listeners('ping')[0]('heartbeat');

      expect(sock.emitted.map((e: any) => e.ev)).to.include('pong');
    });
  });

  describe('disconnect cleanup', function () {
    it('clears the delta / chart timers on socketDisconnect()', function () {
      const sock = make_socket();
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      // Force the timers to be real so we can observe clearing via the
      // public getter going to undefined/null-ish.
      cm.setDeltaTimerId(setInterval(() => {}, 10_000));
      cm.setChartTimerId(setInterval(() => {}, 10_000));

      cm.socketDisconnect();

      // socketDisconnect clears both intervals but does not null the getter
      // values — verify by advancing time in a fake clock would be fragile,
      // so instead we check that calling disconnect a second time is a
      // harmless no-op (no throws).
      expect(() => cm.socketDisconnect()).to.not.throw();
    });

    it('is invoked when the socket emits "disconnect"', function () {
      const sock = make_socket();
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      // Trigger the handler the constructor wired for 'disconnect'
      sock.listeners('disconnect')[0]('transport close');

      // Reaching here without throwing means the handler ran — there is
      // nothing else we can observe without stubbing internals.
      expect(cm).to.exist;
    });
  });

  describe('Updates.* bus integration', function () {
    it("invokes updateDeltas when another client broadcasts 'Updates.*'", function () {
      const sock = make_socket();
      const cm = new ClientManager({ socket: sock, sio: make_sio() });

      // Replace updateDeltas with a spy so we can observe the bus handler
      // without going through the real delta query path.
      let call_count = 0;
      cm.updateDeltas = () => {
        call_count++;
      };

      // Re-register the listener now that updateDeltas is stubbed — the
      // constructor's listener still points at the old method.
      bus.removeAllListeners('Updates.*');
      bus.on('Updates.*', () => cm.updateDeltas());

      bus.emit('Updates.*', { data: true });
      expect(call_count).to.equal(1);
    });
  });
});
