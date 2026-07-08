//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const { Trigger, TriggerAction, TriggerDelete, TriggerUpdate, PeriodicActionRole } = require('../../lib/triggers');

const { Action } = require('../../lib/actions');

// NOTE: TriggerAction.fire / TriggerDelete.fire / TriggerUpdate.fire reference
// `async` (never imported) and `Alerts` (undeclared global). Invoking them
// throws immediately — see the package notes; integration surfaces the failure
// mode more honestly than a mocks-heavy unit test would.

describe('triggers', function () {
  describe('Trigger static registry', function () {
    // Registry uses Joose `my` — not exposed as Trigger.triggers. Use unique
    // keys per test and assert via find()/all() (same pattern as actions_spec).

    const K = {
      reg: 'trig_reg_' + Date.now(),
      hit: 'trig_hit_' + Date.now(),
      all_a: 'trig_alla_' + Date.now(),
      all_b: 'trig_allb_' + Date.now(),
    };

    it('registerTrigger stores the value under the supplied name', function () {
      Trigger.registerTrigger(K.reg, { hello: true });
      expect(Trigger.find(K.reg)).to.eql({ hello: true });
    });

    it('find() returns undefined on a miss', function () {
      expect(Trigger.find('not-registered-anywhere-xyz')).to.equal(undefined);
    });

    it('all() includes every registered trigger', function () {
      Trigger.registerTrigger(K.all_a, { tag: K.all_a });
      Trigger.registerTrigger(K.all_b, { tag: K.all_b });
      const all = Trigger.all();
      expect(all).to.be.an('array');
      expect(all).to.deep.include({ tag: K.all_a });
      expect(all).to.deep.include({ tag: K.all_b });
    });
  });

  describe('Trigger.load', function () {
    let tmp_dir: string;
    let next_id = 0;

    before(function () {
      tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triggers-load-'));
    });

    after(function () {
      try {
        fs.rmSync(tmp_dir, { recursive: true, force: true });
      } catch {}
    });

    function write_trig(body_src: string): string {
      const file = path.join(tmp_dir, `trig_${next_id++}.js`);
      fs.writeFileSync(file, body_src);
      return file;
    }

    it('returns undefined when `action` is missing', function () {
      const file = write_trig(`module.exports = {
        name: 'no_action',
        when: { periodic: 1 },
        query: {},
      };`);
      expect(Trigger.load(file)).to.equal(undefined);
    });

    it('returns undefined when `when` is missing', function () {
      const file = write_trig(`module.exports = {
        name: 'no_when',
        action: { execute: 'some' },
        query: {},
      };`);
      expect(Trigger.load(file)).to.equal(undefined);
    });

    it('builds a TriggerAction for action.execute', function () {
      const file = write_trig(`module.exports = {
        name: 'trig_action',
        action: { execute: 'some_action' },
        when: { periodic: 5 },
        query: {},
      };`);
      const t = Trigger.load(file);
      expect(t).to.be.an.instanceof(TriggerAction);
      expect(Trigger.find('trig_action')).to.equal(t);
    });

    it('builds a TriggerUpdate for action.update', function () {
      const file = write_trig(`module.exports = {
        name: 'trig_update',
        action: { update: { severity: 3 } },
        when: { periodic: 5 },
        query: {},
      };`);
      const t = Trigger.load(file);
      expect(t).to.be.an.instanceof(TriggerUpdate);
    });

    it('builds a TriggerDelete for action: "delete"', function () {
      const file = write_trig(`module.exports = {
        name: 'trig_delete',
        action: 'delete',
        when: { periodic: 5 },
        query: {},
      };`);
      const t = Trigger.load(file);
      expect(t).to.be.an.instanceof(TriggerDelete);
    });

    it('returns undefined for an unknown string action', function () {
      const file = write_trig(`module.exports = {
        name: 'trig_mystery',
        action: 'mystery',
        when: { periodic: 5 },
        query: {},
      };`);
      expect(Trigger.load(file)).to.equal(undefined);
    });

    it('returns undefined for an invalid action object', function () {
      const file = write_trig(`module.exports = {
        name: 'trig_invalid_action',
        action: { nope: 1 },
        when: { periodic: 5 },
        query: {},
      };`);
      expect(Trigger.load(file)).to.equal(undefined);
    });

    it('falls back to the filename when name is omitted', function () {
      const file = write_trig(`module.exports = {
        action: { execute: 'some_action' },
        when: { periodic: 5 },
        query: {},
      };`);
      Trigger.load(file);
      const basename = path.basename(file);
      expect(Trigger.find(basename)).to.be.an.instanceof(TriggerAction);
    });
  });

  describe('Trigger after("initialize") validation', function () {
    it('throws on a non-object / non-function query', function () {
      expect(
        () =>
          new TriggerAction({
            name: 'bad_query',
            action: { execute: 'x' },
            when: { periodic: 1 },
            query: 'not-an-object',
          })
      ).to.throw(/invalid query type/);
    });

    it('throws on a non-object when', function () {
      expect(
        () =>
          new TriggerAction({
            name: 'bad_when',
            action: { execute: 'x' },
            when: 'not-an-object',
            query: {},
          })
      ).to.throw(/invalid when type/);
    });
  });

  describe('Trigger.fetchQuery', function () {
    it('returns the query object as-is when it is an object', function () {
      const q = { severity: { $gte: 5 } };
      const t = new TriggerAction({
        name: 'fq_obj',
        action: { execute: 'x' },
        when: { periodic: 1 },
        query: q,
      });
      expect(t.fetchQuery()).to.equal(q);
    });

    it('invokes the query function and returns its result when query is a function', function () {
      const q = sinon.stub().returns({ node: 'localhost' });
      const t = new TriggerAction({
        name: 'fq_fn',
        action: { execute: 'x' },
        when: { periodic: 1 },
        query: q,
      });
      expect(t.fetchQuery()).to.eql({ node: 'localhost' });
      expect(q.calledOnce).to.equal(true);
    });
  });

  describe('TriggerAction.buildColumns', function () {
    function make(cols: any) {
      return new TriggerAction({
        name: 'bc_' + Date.now() + '_' + Math.random(),
        action: { execute: 'x', columns: cols },
        when: { periodic: 1 },
        query: {},
      });
    }

    it('returns [] when action.columns is undefined', function () {
      const t = make(undefined);
      expect(t.getColumns()).to.eql([]);
    });

    it('splits a comma-separated string', function () {
      const t = make('node,severity,summary');
      expect(t.getColumns()).to.eql(['node', 'severity', 'summary']);
    });

    it('returns arrays untouched', function () {
      const t = make(['a', 'b']);
      expect(t.getColumns()).to.eql(['a', 'b']);
    });

    it('throws on an unsupported columns type', function () {
      expect(() => make(123)).to.throw(/unknown columns type/);
    });
  });

  describe('TriggerAction.buildActionObjects', function () {
    // Register stub actions under unique names via Action.registerAction so
    // the builder's Action.find() lookups succeed.
    const names = {
      a: 'bao_a_' + Date.now(),
      b: 'bao_b_' + Date.now(),
    };
    const fake_a = { getName: () => names.a, kind: 'A' };
    const fake_b = { getName: () => names.b, kind: 'B' };

    before(function () {
      Action.registerAction(names.a, fake_a);
      Action.registerAction(names.b, fake_b);
    });

    it('resolves a comma-separated execute string to action objects', function () {
      const t = new TriggerAction({
        name: 'bao_1',
        action: { execute: `${names.a},${names.b}` },
        when: { periodic: 1 },
        query: {},
      });
      const objs = t.getActionObjects();
      expect(objs).to.have.lengthOf(2);
      expect(objs).to.include(fake_a);
      expect(objs).to.include(fake_b);
    });

    it('silently drops unknown action names', function () {
      const t = new TriggerAction({
        name: 'bao_2',
        action: { execute: `${names.a},nonexistent` },
        when: { periodic: 1 },
        query: {},
      });
      const objs = t.getActionObjects();
      expect(objs).to.have.lengthOf(1);
      expect(objs[0]).to.equal(fake_a);
    });
  });

  describe('TriggerUpdate after("initialize")', function () {
    it('throws when action.update is missing', function () {
      expect(
        () =>
          new TriggerUpdate({
            name: 'tu_missing',
            action: {},
            when: { periodic: 1 },
            query: {},
          })
      ).to.throw(/unhandled action type/);
    });

    it('stores a function update as-is (invokable via getUpdateFunction)', function () {
      const fn = function () {
        return { severity: 1 };
      };
      const t = new TriggerUpdate({
        name: 'tu_fn',
        action: { update: fn },
        when: { periodic: 1 },
        query: {},
      });
      expect(t.getUpdateFunction()).to.equal(fn);
    });

    it('wraps an object update in a function that returns that object', function () {
      const obj = { severity: 1, owner: 'alice' };
      const t = new TriggerUpdate({
        name: 'tu_obj',
        action: { update: obj },
        when: { periodic: 1 },
        query: {},
      });
      const fn = t.getUpdateFunction();
      expect(fn).to.be.a('function');
      expect(fn()).to.equal(obj);
    });
  });

  describe('PeriodicActionRole.buildSamplePeriod', function () {
    it('returns the numeric when.periodic as the sample period', function () {
      // PeriodicActionRole is mixed in via the trait hook in Trigger.load.
      // Construct a TriggerAction with the trait set directly:
      const t = new TriggerAction({
        name: 'per_1',
        action: { execute: 'x' },
        when: { periodic: 42 },
        query: {},
        trait: PeriodicActionRole,
      });
      expect(t.getSample()).to.equal(42);
    });
  });

  describe('PeriodicActionRole start / stop', function () {
    let clock: any;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    function make(activated: boolean) {
      const t = new TriggerAction({
        name: 'p_' + Date.now() + '_' + Math.random(),
        action: { execute: 'x' },
        when: { periodic: 5 }, // 5 seconds
        query: {},
        trait: PeriodicActionRole,
        activated,
      });
      // fire() itself is broken (async/Alerts). Stub it so start()'s timer
      // tick has something benign to call.
      t.fire = sinon.stub().callsFake(function (cb: any) {
        cb && cb(null);
      });
      return t;
    }

    it('start() arms a setInterval when activated and calls fire() on tick', function (done) {
      const t = make(true);
      t.start(function (err: any) {
        expect(err).to.equal(null);
        expect(t.getTimer()).to.exist;
        // advance 5 seconds and verify fire() ran
        clock.tick(5_000);
        expect(t.fire.callCount).to.equal(1);
        // another 5s → another tick
        clock.tick(5_000);
        expect(t.fire.callCount).to.equal(2);
        // clean up the interval we created
        clearInterval(t.getTimer());
        done();
      });
    });

    it('start() does nothing when deactivated', function (done) {
      const t = make(false);
      t.start(function (err: any) {
        expect(err).to.equal(null);
        expect(t.getTimer()).to.equal(undefined);
        clock.tick(60_000);
        expect(t.fire.callCount).to.equal(0);
        done();
      });
    });

    it('stop() clears the interval and deactivates', function (done) {
      const t = make(true);
      t.start(function () {
        expect(t.getActivated()).to.equal(true);
        t.stop(function () {
          expect(t.getActivated()).to.equal(false);
          // further ticks must not fire
          const fire_count_before = t.fire.callCount;
          clock.tick(60_000);
          expect(t.fire.callCount).to.equal(fire_count_before);
          done();
        });
      });
    });
  });
});
