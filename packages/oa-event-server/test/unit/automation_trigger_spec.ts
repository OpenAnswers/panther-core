//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const Trigger = require('../../lib/automation_trigger');

describe('automation_trigger (Trigger)', function () {
  // NOTE: Trigger.start() and Trigger.fire() reference undeclared `logger`,
  // `debug` and `Alerts` globals — at runtime these are installed as bare
  // globals by OAmonServer / oa-logging. The fire/start specs below stub
  // those globals for the duration of each test.

  let tmp_dir: string;

  before(function () {
    tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'automation-trigger-'));
  });

  after(function () {
    try {
      fs.rmSync(tmp_dir, { recursive: true, force: true });
    } catch {}
  });

  function write_def(name: string, body: any) {
    const file = path.join(tmp_dir, name);
    fs.writeFileSync(file, `module.exports = ${JSON.stringify(body)};`);
    return file;
  }

  describe('constructor', function () {
    it('splits the path into filedir and filename and loads the module', function () {
      const file = write_def('trig1.js', { name: 'trig-one', action: 'act-one' });
      const t = new Trigger(file);
      expect(t.filedir).to.equal(tmp_dir);
      expect(t.filename).to.equal('trig1.js');
      expect(t.definition).to.eql({ name: 'trig-one', action: 'act-one' });
    });
  });

  describe('name()', function () {
    it('returns definition.name when present', function () {
      const file = write_def('trig2.js', { name: 'declared-name' });
      const t = new Trigger(file);
      expect(t.name()).to.equal('declared-name');
    });

    it('falls back to the filename when definition.name is absent', function () {
      const file = write_def('trig3.js', { action: 'a' });
      const t = new Trigger(file);
      expect(t.name()).to.equal('trig3.js');
    });
  });

  describe('actionName()', function () {
    it('returns definition.action when present', function () {
      const file = write_def('trig4.js', { action: 'custom_action' });
      const t = new Trigger(file);
      expect(t.actionName()).to.equal('custom_action');
    });

    it('falls back to "default_action" when definition.action is absent', function () {
      const file = write_def('trig5.js', { name: 'n' });
      const t = new Trigger(file);
      expect(t.actionName()).to.equal('default_action');
    });
  });

  describe('start() and fire()', function () {
    let logger_stub: any;
    let debug_stub: any;
    let alerts_stub: any;
    let had_logger: boolean;
    let had_debug: boolean;
    let had_Alerts: boolean;

    beforeEach(function () {
      logger_stub = { info: sinon.stub(), error: sinon.stub(), debug: sinon.stub() };
      debug_stub = sinon.stub();
      alerts_stub = { find: sinon.stub() };

      had_logger = 'logger' in (global as any);
      had_debug = 'debug' in (global as any);
      had_Alerts = 'Alerts' in (global as any);

      (global as any).logger = logger_stub;
      (global as any).debug = debug_stub;
      (global as any).Alerts = alerts_stub;
    });

    afterEach(function () {
      if (!had_logger) delete (global as any).logger;
      if (!had_debug) delete (global as any).debug;
      if (!had_Alerts) delete (global as any).Alerts;
    });

    describe('start()', function () {
      it('non-periodic: calls cb(null) and does not set a timer', function (done) {
        const file = write_def('start_np.js', { name: 'np' });
        const t = new Trigger(file);
        t.start({ execute: () => {} }, function (err: any) {
          try {
            expect(err).to.be.null;
            expect(t.timer_id).to.be.undefined;
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('periodic: installs an interval that calls fire(action) every sample seconds', function (done) {
        const clock = sinon.useFakeTimers();
        try {
          const file = write_def('start_p.js', { name: 'p', type: 'periodic', sample: 5 });
          const t = new Trigger(file);
          t.fire = sinon.stub();
          const action = { execute: () => {} };
          t.start(action, function (err: any) {
            expect(err).to.be.null;
            expect(t.timer_id).to.exist;

            clock.tick(5_000);
            expect(t.fire.calledOnceWith(action)).to.be.true;

            clock.tick(5_000);
            expect(t.fire.calledTwice).to.be.true;

            clearInterval(t.timer_id);
            done();
          });
        } finally {
          clock.restore();
        }
      });
    });

    describe('fire()', function () {
      it('each:true — finds alerts, maps via toClient, executes action per item', function (done) {
        const file = write_def('fire_each.js', {
          name: 'fe',
          each: true,
          query: { severity: 5 },
        });
        const t = new Trigger(file);

        const item_a = { _id: 'a', toClient: () => ({ id: 'A' }) };
        const item_b = { _id: 'b', toClient: () => ({ id: 'B' }) };
        alerts_stub.find.callsFake((_q: any, cb: any) => cb(null, [item_a, item_b]));

        const executed: any[] = [];
        const action = {
          execute: (lert: any, cb: any) => {
            executed.push(lert);
            cb(null);
          },
        };

        t.fire(action);

        // async map/forEach are sync in this stubbed flow — assert next tick.
        setImmediate(() => {
          try {
            expect(alerts_stub.find.calledOnceWith({ severity: 5 })).to.be.true;
            expect(executed).to.eql([{ id: 'A' }, { id: 'B' }]);
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('each:true — Alerts.find error is logged and execution stops', function (done) {
        const file = write_def('fire_each_err.js', { name: 'fee', each: true, query: {} });
        const t = new Trigger(file);

        const action = { execute: sinon.stub() };
        alerts_stub.find.callsFake((_q: any, cb: any) => cb(new Error('mongo down')));

        t.fire(action);

        setImmediate(() => {
          try {
            expect(logger_stub.error.calledOnce).to.be.true;
            expect(action.execute.called).to.be.false;
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('each:false — collects ids and calls action.execute with the id array', function () {
        const file = write_def('fire_ids.js', { name: 'fi', query: {} });
        const t = new Trigger(file);

        alerts_stub.find.callsFake((_q: any, _proj: any, cb: any) =>
          cb(null, [{ _id: 'id1' }, { _id: 'id2' }, { _id: 'id3' }])
        );

        const action = { execute: sinon.stub() };
        t.fire(action);

        expect(alerts_stub.find.calledOnce).to.be.true;
        expect(alerts_stub.find.firstCall.args[1]).to.eql(['_id']);
        expect(action.execute.calledOnceWith(['id1', 'id2', 'id3'])).to.be.true;
      });

      it('each:false — empty result set does NOT call action.execute', function () {
        const file = write_def('fire_ids_empty.js', { name: 'fie', query: {} });
        const t = new Trigger(file);

        alerts_stub.find.callsFake((_q: any, _proj: any, cb: any) => cb(null, []));

        const action = { execute: sinon.stub() };
        t.fire(action);

        expect(action.execute.called).to.be.false;
      });

      it('each:false — Alerts.find error is logged', function () {
        const file = write_def('fire_ids_err.js', { name: 'fier', query: {} });
        const t = new Trigger(file);

        alerts_stub.find.callsFake((_q: any, _proj: any, cb: any) => cb(new Error('boom')));

        const action = { execute: sinon.stub() };
        t.fire(action);

        expect(logger_stub.error.calledOnce).to.be.true;
        expect(action.execute.called).to.be.false;
      });
    });
  });
});
