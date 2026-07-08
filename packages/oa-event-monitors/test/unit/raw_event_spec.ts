//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Exercise the raw_event / newalert / sendAlert pipeline in common/index.js.
// The readyAlerts handler is attached to the OaMon EventEmitter, so we test
// by emitting 'newalert' directly rather than standing up socket.io.

process.env.NODE_ENV = 'test';

const { expect, sinon } = require('../mocha_helpers');
const nconf = require('nconf');
const OaMon = require('../../common');

describe('Unit::EventMonitors::raw_event pipeline', function () {
  let oamon: any;
  let nconf_stub: any;
  let monitor_stub: any;
  let rules_stub: any;

  // nconf defaults used by readyAlerts. Tests override individual keys.
  const nconf_values: Record<string, any> = {
    'agent:type': 'test-agent',
    oneshot: false,
  };

  beforeEach(function (done: Function) {
    nconf_stub = sinon.stub(nconf, 'get').callsFake((key: string) => nconf_values[key]);

    oamon = new OaMon();

    // Rules step: copy through whatever fields the test set on `obj` into `e`.
    // Allows a test to supply `{ identifier, severity }` on obj and have them
    // land on the processed event.
    rules_stub = {
      rules: sinon.stub().callsFake(function (e: any, obj: any) {
        Object.assign(e, obj);
      }),
    };
    oamon.agent_rules = rules_stub;

    monitor_stub = {
      sendAlert: sinon.stub(),
      sendOneAlert: sinon.stub(),
    };
    oamon.monitor = monitor_stub;

    // Registers the 'newalert' handler we are testing.
    oamon.readyAlerts(function () {
      done();
    });
  });

  afterEach(function () {
    nconf_stub.restore();
    // Reset any test-local key changes
    nconf_values['oneshot'] = false;
    delete nconf_values['rawlog'];
  });

  function fire(obj: any, cb?: Function, qcb?: Function, lcb?: Function) {
    oamon.emit('newalert', obj, cb, qcb, lcb);
  }

  describe('happy path', function () {
    it('routes to monitor.sendAlert with the processed event and forwards cb+qcb', function () {
      const cb = sinon.spy();
      const qcb = sinon.spy();
      fire({ identifier: 'node-a:3:boom', severity: 3 }, cb, qcb);

      expect(monitor_stub.sendAlert.calledOnce).to.equal(true);
      const [ev, passed_cb, passed_qcb] = monitor_stub.sendAlert.firstCall.args;
      expect(ev.identifier).to.equal('node-a:3:boom');
      expect(ev.severity).to.equal(3);
      expect(ev.agent).to.equal('test-agent');
      expect(passed_cb).to.equal(cb);
      expect(passed_qcb).to.equal(qcb);
      expect(monitor_stub.sendOneAlert.called).to.equal(false);
    });

    it('routes to monitor.sendOneAlert when nconf.oneshot is true', function () {
      nconf_values['oneshot'] = true;
      const cb = sinon.spy();
      fire({ identifier: 'node-a:3:boom', severity: 3 }, cb);

      expect(monitor_stub.sendOneAlert.calledOnce).to.equal(true);
      expect(monitor_stub.sendAlert.called).to.equal(false);
    });
  });

  describe('rules-level discard (severity < 0)', function () {
    it('does not forward to the monitor', function () {
      fire({ identifier: 'x', severity: -1 });
      expect(monitor_stub.sendAlert.called).to.equal(false);
      expect(monitor_stub.sendOneAlert.called).to.equal(false);
    });

    it('invokes cb with a discard result when cb is provided (socket path)', function () {
      const cb = sinon.spy();
      fire({ identifier: 'x', severity: -1 }, cb);
      expect(cb.calledOnce).to.equal(true);
      const [err, result] = cb.firstCall.args;
      expect(err).to.equal(null);
      expect(result.status).to.equal('discarded');
      expect(result.message).to.equal('Event discarded');
    });

    it('invokes qcb with a discard result when qcb is provided', function () {
      const qcb = sinon.spy();
      fire({ identifier: 'x', severity: -1 }, undefined, qcb);
      expect(qcb.calledOnce).to.equal(true);
      expect(qcb.firstCall.args[1].status).to.equal('discarded');
    });

    it('invokes lcb with a discard result when lcb is provided (http path)', function () {
      const lcb = sinon.spy();
      fire({ identifier: 'x', severity: -1 }, undefined, undefined, lcb);
      expect(lcb.calledOnce).to.equal(true);
      expect(lcb.firstCall.args[1].status).to.equal('discarded');
    });

    it('invokes every supplied callback so no transport hangs', function () {
      const cb = sinon.spy();
      const qcb = sinon.spy();
      const lcb = sinon.spy();
      fire({ identifier: 'x', severity: -1 }, cb, qcb, lcb);
      expect(cb.calledOnce).to.equal(true);
      expect(qcb.calledOnce).to.equal(true);
      expect(lcb.calledOnce).to.equal(true);
    });
  });

  describe('missing-identifier discard', function () {
    it('discards and notifies all supplied callbacks when identifier is undefined', function () {
      const cb = sinon.spy();
      const qcb = sinon.spy();
      const lcb = sinon.spy();
      fire({ severity: 3 }, cb, qcb, lcb);

      expect(monitor_stub.sendAlert.called).to.equal(false);
      expect(cb.calledOnce).to.equal(true);
      expect(qcb.calledOnce).to.equal(true);
      expect(lcb.calledOnce).to.equal(true);
      expect(lcb.firstCall.args[1].message).to.equal('Event missing identifier');
    });

    it('discards and notifies when identifier is null', function () {
      const lcb = sinon.spy();
      fire({ severity: 3, identifier: null }, undefined, undefined, lcb);
      expect(monitor_stub.sendAlert.called).to.equal(false);
      expect(lcb.calledOnce).to.equal(true);
      expect(lcb.firstCall.args[1].status).to.equal('discarded');
    });
  });

  describe('identifier normalisation', function () {
    it('coerces a non-string identifier via toString()', function () {
      fire({ identifier: 12345, severity: 3 });
      expect(monitor_stub.sendAlert.calledOnce).to.equal(true);
      const ev = monitor_stub.sendAlert.firstCall.args[0];
      expect(ev.identifier).to.equal('12345');
    });

    it('truncates identifiers longer than 1024 chars to 1012', function () {
      const long = 'a'.repeat(2000);
      fire({ identifier: long, severity: 3 });
      const ev = monitor_stub.sendAlert.firstCall.args[0];
      expect(ev.identifier.length).to.equal(1012);
    });

    it('leaves identifiers of 1024 chars or fewer unchanged', function () {
      const exactly_1024 = 'b'.repeat(1024);
      fire({ identifier: exactly_1024, severity: 3 });
      const ev = monitor_stub.sendAlert.firstCall.args[0];
      expect(ev.identifier.length).to.equal(1024);
    });
  });

  describe('rawlog', function () {
    it('writes an inspected record containing a timestamp Date and the raw event', function () {
      const rawlog_spy = { log: sinon.spy() };
      oamon.rawlog = rawlog_spy;

      fire({ identifier: 'node-a:3:boom', severity: 3, extra: 'hello' });

      expect(rawlog_spy.log.calledOnce).to.equal(true);
      const line = rawlog_spy.log.firstCall.args[0];
      // util.inspect output — contains identifier and the raw event fields
      expect(line).to.include("identifier: 'node-a:3:boom'");
      expect(line).to.include("extra: 'hello'");
      // timestamp is a real Date object, not the ReferenceError from the bug
      expect(line).to.match(/timestamp: \d{4}-\d{2}-\d{2}T/);

      oamon.rawlog = undefined;
    });

    it('does not throw when rawlog is absent', function () {
      expect(function () {
        fire({ identifier: 'x', severity: 3 });
      }).to.not.throw();
    });
  });
});
