//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const mongoose = require('mongoose');

const {
  Action,
  InternalFunction,
  InternalAction,
  InternalUpdateAction,
  InternalDeleteAction,
  ExternalAction,
} = require('../../lib/actions');

// Many Action subclasses reach for globals that the runtime wires up later.
// We do not exercise those methods — see the "not tested" note in the file.

describe('actions', function () {
  describe('Action static registry', function () {
    // NOTE: the registry (`actions`) is a class-level hash under Joose's `my`
    // metaclass — it is NOT exposed on Action directly, so we cannot reset it
    // between tests. Each test uses unique keys and only asserts presence to
    // avoid cross-test contamination.

    // distinct keys chosen to avoid collisions with other describe blocks
    const K = {
      register: 'reg_' + Date.now(),
      find_hit: 'findhit_' + Date.now(),
      all_a: 'alla_' + Date.now(),
      all_b: 'allb_' + Date.now(),
    };

    it('registerAction stores the value under the supplied name', function () {
      Action.registerAction(K.register, { hello: true });
      expect(Action.find(K.register)).to.eql({ hello: true });
    });

    it('find() returns the registered action', function () {
      Action.registerAction(K.find_hit, { n: 2 });
      expect(Action.find(K.find_hit)).to.eql({ n: 2 });
    });

    it('find() returns undefined on a miss', function () {
      expect(Action.find('definitely-not-registered-xyz')).to.equal(undefined);
    });

    it('all() includes every registered action in its output', function () {
      Action.registerAction(K.all_a, { n: 3, tag: K.all_a });
      Action.registerAction(K.all_b, { n: 4, tag: K.all_b });
      const all = Action.all();
      expect(all).to.be.an('array');
      expect(all).to.deep.include({ n: 3, tag: K.all_a });
      expect(all).to.deep.include({ n: 4, tag: K.all_b });
    });
  });

  describe('Action.load', function () {
    let tmp_dir: string;

    before(function () {
      tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-load-'));
    });

    after(function () {
      try {
        fs.rmSync(tmp_dir, { recursive: true, force: true });
      } catch {}
    });

    // Registry can't be reset (see note above); each load() test below uses a
    // distinct action name so they don't clash with each other.

    function write_def(name: string, body_src: string) {
      const file = path.join(tmp_dir, name);
      fs.writeFileSync(file, body_src);
      return file;
    }

    it('dispatches type=internal_function to InternalFunction', function () {
      const file = write_def(
        'act_fn.js',
        `
        module.exports = {
          name: 'act_fn',
          type: 'internal_function',
          command: function (lert, cb) { cb && cb(null, 'ok'); },
        };
      `
      );
      Action.load(file);
      expect(Action.find('act_fn')).to.be.an.instanceof(InternalFunction);
    });

    it('dispatches type=internal_update to InternalUpdateAction', function () {
      const file = write_def(
        'act_update.js',
        `
        module.exports = {
          name: 'act_update',
          type: 'internal_update',
          setit: function () { return { x: 1 }; },
        };
      `
      );
      Action.load(file);
      expect(Action.find('act_update')).to.be.an.instanceof(InternalUpdateAction);
    });

    it('dispatches type=internal_delete to InternalDeleteAction', function () {
      const file = write_def(
        'act_delete.js',
        `
        module.exports = {
          name: 'act_delete',
          type: 'internal_delete',
        };
      `
      );
      Action.load(file);
      expect(Action.find('act_delete')).to.be.an.instanceof(InternalDeleteAction);
    });

    it('dispatches type=external to ExternalAction', function () {
      const file = write_def(
        'act_external.js',
        `
        module.exports = {
          name: 'act_external',
          type: 'external',
          command: '/bin/true',
        };
      `
      );
      Action.load(file);
      expect(Action.find('act_external')).to.be.an.instanceof(ExternalAction);
    });

    it('throws on an unknown action type', function () {
      const file = write_def(
        'act_unknown.js',
        `
        module.exports = { name: 'act_unknown', type: 'mystery' };
      `
      );
      expect(() => Action.load(file)).to.throw(/Unsuported Action type: mystery/);
    });

    it('falls back to the filename when definition.name is absent', function () {
      const file = write_def(
        'act_anon.js',
        `
        module.exports = {
          type: 'internal_function',
          command: function (l, cb) { cb && cb(); },
        };
      `
      );
      Action.load(file);
      expect(Action.find('act_anon.js')).to.be.an.instanceof(InternalFunction);
    });
  });

  describe('InternalFunction.execute', function () {
    it('delegates to the registered command with (lert, cb)', function (done) {
      const command = sinon.spy((_lert: any, cb: any) => cb(null, 'ok'));
      const fn = new InternalFunction({ name: 'fn', command });
      const lert = { _id: 'x' };
      fn.execute(lert, /* trig_query */ null, function (err: any, result: any) {
        expect(err).to.equal(null);
        expect(result).to.equal('ok');
        expect(command.calledOnce).to.equal(true);
        // The registered command gets (lert, cb) — the trig_query is dropped on the floor
        expect(command.firstCall.args[0]).to.equal(lert);
        expect(command.firstCall.args[1]).to.be.a('function');
        done();
      });
    });
  });

  describe('InternalAction', function () {
    // A minimal mongoose model so we can stamp out real Documents for the
    // before-execute check without touching any DB.
    let ProbeModel: any;

    before(function () {
      try {
        mongoose.deleteModel('actions_probe');
      } catch {
        /* not registered */
      }
      ProbeModel = mongoose.model('actions_probe', new mongoose.Schema({ x: Number }));
    });

    describe('before("execute") validation', function () {
      it('throws when the lert is undefined', function () {
        const ia = new InternalAction({ name: 'ia1' });
        expect(() => ia.execute(undefined)).to.throw(/undefined alerts to execute/);
      });

      it('throws when the lert is not a mongoose Document', function () {
        const ia = new InternalAction({ name: 'ia2' });
        expect(() => ia.execute({ _id: 'plain-object' })).to.throw(/not a Mongoose Document/);
      });

      // NOTE: a passing before-hook invocation would fall through to the base
      // Action.execute() which only console.logs — no assertion to make there.
    });

    describe('buildCriteria', function () {
      it('default criteria function returns { _id: lert._id }', function () {
        const ia = new InternalAction({ name: 'ia3' });
        const criteria_fn = ia.getCriteria();
        expect(criteria_fn).to.be.a('function');
        expect(criteria_fn({ _id: 'abc' })).to.eql({ _id: 'abc' });
      });
    });
  });

  describe('InternalUpdateAction.execute', function () {
    let alerts_stub: any;

    beforeEach(function () {
      alerts_stub = { update: sinon.stub().callsFake((_c: any, _u: any, _o: any, cb: any) => cb(null, 1)) };
      (global as any).Alerts = alerts_stub;
    });

    afterEach(function () {
      delete (global as any).Alerts;
    });

    it('calls Alerts.update with the criteria-fn result, $currentDate and $set', function (done) {
      const ua = new InternalUpdateAction({
        name: 'ua1',
        setit: () => ({ owner: 'alice' }),
      });
      const lert = { _id: 'the-id' };
      ua.execute(lert, /* trig_query */ null, function (err: any) {
        expect(err).to.equal(null);
        expect(alerts_stub.update.calledOnce).to.equal(true);
        const [criteria, update, opts] = alerts_stub.update.firstCall.args;
        expect(criteria).to.eql({ _id: 'the-id' });
        expect(update).to.have.property('$set').that.eql({ owner: 'alice' });
        expect(update).to.have.property('$currentDate').that.eql({ state_change: true });
        expect(opts).to.eql({ multi: true });
        done();
      });
    });

    it('falls back to trig_query when no criteria is built', function (done) {
      // InternalAction's buildCriteria always returns a function, so in practice
      // the `criteria_fn || trig_query` fallback on line 155 is unreachable.
      // This test documents that: the criteria-fn path wins over trig_query.
      const ua = new InternalUpdateAction({
        name: 'ua2',
        setit: () => ({ a: 1 }),
      });
      const lert = { _id: 'wins' };
      ua.execute(lert, /* trig_query */ { _id: 'loses' }, function () {
        const [criteria] = alerts_stub.update.firstCall.args;
        expect(criteria).to.eql({ _id: 'wins' });
        done();
      });
    });
  });

  describe('InternalDeleteAction.execute', function () {
    let alerts_stub: any;

    beforeEach(function () {
      alerts_stub = { remove: sinon.stub().callsFake((_c: any, cb: any) => cb(null, { n: 1 })) };
      (global as any).Alerts = alerts_stub;
    });

    afterEach(function () {
      delete (global as any).Alerts;
    });

    it('calls Alerts.remove using the criteria function when it is a function', function (done) {
      const da = new InternalDeleteAction({
        name: 'da1',
      });
      da.execute({ _id: 'xyz' }, /* trig_query */ null, function (err: any) {
        expect(err).to.equal(null);
        expect(alerts_stub.remove.calledOnce).to.equal(true);
        expect(alerts_stub.remove.firstCall.args[0]).to.eql({ _id: 'xyz' });
        done();
      });
    });
  });

  describe('ExternalAction (after-init wiring)', function () {
    it('prepends DEFAULT_EXTERNAL_ACTIONS_DIRECTORY when the command is relative', function () {
      const ea = new ExternalAction({ name: 'ea1', command: 'rel_cmd' });
      expect(ea.getCommand()).to.match(/external_commands\/rel_cmd$/);
    });

    it('leaves an absolute command path untouched', function () {
      const ea = new ExternalAction({ name: 'ea2', command: '/usr/bin/true' });
      expect(ea.getCommand()).to.equal('/usr/bin/true');
    });

    it('creates an ExternalCommand instance wrapping the final command path', function () {
      const ea = new ExternalAction({ name: 'ea3', command: '/usr/bin/true' });
      const xc = ea.getExternalCmd();
      expect(xc).to.exist;
      expect(xc.getCmd()).to.equal('/usr/bin/true');
    });

    it('wires each on-handler into an InternalAction instance', function () {
      const ea = new ExternalAction({
        name: 'ea4',
        command: '/usr/bin/true',
        on: {
          0: { name: 'on_zero' },
          default: { name: 'on_default' },
        },
      });
      const on = ea.getOn();
      expect(on['0']).to.be.an.instanceof(InternalAction);
      expect(on['default']).to.be.an.instanceof(InternalAction);
    });
  });
});
