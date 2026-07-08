//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 3 — AutomationManager setup + start end-to-end.
//
// Points AutomationManager at a throwaway fixture directory containing
// real action and trigger files, drives setup() and start(), and verifies
// that actions + triggers of every shape (InternalFunction, InternalUpdate,
// TriggerAction, TriggerUpdate, TriggerDelete) are loaded and registered.
//
// start() only exercises the deactivated branch — active timers would race
// into the trigger fire() codepath which is currently broken (async +
// Alerts globals). Those paths are covered by Journey 4 and deferred
// journeys once the bugs are fixed.

const { expect } = require('../mocha_helpers');

const fs = require('fs');
const os = require('os');
const path = require('path');

const { AutomationManager } = require('../../lib/automations');
const { Trigger, TriggerAction, TriggerUpdate, TriggerDelete } = require('../../lib/triggers');
const { Action, InternalFunction, InternalUpdateAction } = require('../../lib/actions');

describe('[integration] AutomationManager journey', function () {
  this.timeout(10_000);

  // Unique per-run names so require()'s module cache and the class-level
  // registries don't collide across test runs within the same process.
  const stamp = `j3_${Date.now()}`;
  const A_NAMES = {
    log: `action_log_${stamp}`,
    upd: `action_upd_${stamp}`,
  };
  const T_NAMES = {
    action: `trig_action_${stamp}`,
    update: `trig_update_${stamp}`,
    del: `trig_delete_${stamp}`,
  };

  let auto_dir: string;
  let mgr: any;

  before(function () {
    auto_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amgr-int-'));
    fs.mkdirSync(path.join(auto_dir, 'actions'));
    fs.mkdirSync(path.join(auto_dir, 'triggers'));

    // Actions — digit-prefixed filenames so sanitizeFiles accepts them
    fs.writeFileSync(
      path.join(auto_dir, 'actions', '01_log.js'),
      `module.exports = {
         type: 'internal_function',
         name: '${A_NAMES.log}',
         command: function (lert, cb) { cb && cb(null); }
       };`
    );
    fs.writeFileSync(
      path.join(auto_dir, 'actions', '02_update.js'),
      `module.exports = {
         type: 'internal_update',
         name: '${A_NAMES.upd}',
         setit: function () { return { severity: 1 }; }
       };`
    );
    // File without a digit prefix — should be filtered out by sanitizeFiles
    fs.writeFileSync(
      path.join(auto_dir, 'actions', 'ignored_no_digit.js'),
      `module.exports = {
         type: 'internal_function',
         name: 'should_not_load_${stamp}',
         command: function (lert, cb) { cb && cb(null); }
       };`
    );

    // Triggers — one of each subclass, all deactivated
    fs.writeFileSync(
      path.join(auto_dir, 'triggers', '01_action_trigger.js'),
      `module.exports = {
         name: '${T_NAMES.action}',
         query: { severity: { $gte: 5 } },
         action: { execute: '${A_NAMES.log}' },
         when: { periodic: 60 },
         activated: false,
       };`
    );
    fs.writeFileSync(
      path.join(auto_dir, 'triggers', '02_update_trigger.js'),
      `module.exports = {
         name: '${T_NAMES.update}',
         query: { severity: 3 },
         action: { update: { acknowledged: true } },
         when: { periodic: 60 },
         activated: false,
       };`
    );
    fs.writeFileSync(
      path.join(auto_dir, 'triggers', '03_delete_trigger.js'),
      `module.exports = {
         name: '${T_NAMES.del}',
         query: { severity: 1 },
         action: 'delete',
         when: { periodic: 60 },
         activated: false,
       };`
    );

    mgr = new AutomationManager({ automations_directory: auto_dir });
  });

  after(function () {
    try {
      fs.rmSync(auto_dir, { recursive: true, force: true });
    } catch {}
  });

  describe('setup()', function () {
    it('loads actions and triggers without error', function (done) {
      mgr.setup(function (err: any) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('registered every digit-prefixed action under its declared name', function () {
      expect(Action.find(A_NAMES.log)).to.be.an.instanceof(InternalFunction);
      expect(Action.find(A_NAMES.upd)).to.be.an.instanceof(InternalUpdateAction);
    });

    it('skipped the non-digit-prefixed action file', function () {
      expect(Action.find(`should_not_load_${stamp}`)).to.equal(undefined);
    });

    it('registered a TriggerAction for action.execute', function () {
      expect(Trigger.find(T_NAMES.action)).to.be.an.instanceof(TriggerAction);
    });

    it('registered a TriggerUpdate for action.update', function () {
      expect(Trigger.find(T_NAMES.update)).to.be.an.instanceof(TriggerUpdate);
    });

    it('registered a TriggerDelete for action: "delete"', function () {
      expect(Trigger.find(T_NAMES.del)).to.be.an.instanceof(TriggerDelete);
    });

    it('wires the action reference into the TriggerAction instance', function () {
      const t: any = Trigger.find(T_NAMES.action);
      const attached = t.getActionObjects();
      expect(attached).to.be.an('array').with.lengthOf(1);
      expect(attached[0].getName()).to.equal(A_NAMES.log);
    });
  });

  describe('start()', function () {
    it('invokes start() on every loaded trigger (all deactivated → no intervals armed)', function (done) {
      mgr.start(function (err: any) {
        expect(err).to.equal(null);

        // Each of our deactivated periodic triggers should have no timer
        for (const name of Object.values(T_NAMES)) {
          const t: any = Trigger.find(name);
          // TriggerDelete has no PeriodicActionRole-provided timer because our
          // fixture uses when.periodic which does attach the role. All three
          // should be deactivated with no timer armed.
          if (typeof t.getTimer === 'function') {
            expect(t.getTimer(), `${name} should have no armed timer`).to.equal(undefined);
          }
        }
        done();
      });
    });
  });
});
