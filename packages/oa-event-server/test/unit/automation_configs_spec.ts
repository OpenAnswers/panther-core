//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// The shipped automations/triggers and automations/actions modules each
// expose pure `query`/`criteria`/`setit`/`command` functions that the trigger
// framework loads and invokes at runtime. The framework specs cover the
// loader; this spec invokes the per-module functions directly so they
// register as covered.

const { expect } = require('../mocha_helpers');

const ACTIONS = '../../automations/actions/';
const TRIGGERS = '../../automations/triggers/';

describe('automations/actions config modules', function () {
  describe('00_default_logging', function () {
    const mod = require(ACTIONS + '00_default_logging');

    it('exports the expected internal_function shape', function () {
      expect(mod.type).to.equal('internal_function');
      expect(mod.command).to.be.a('function');
    });

    it('command(obj, cb) logs and calls back with null', function (done) {
      // The command body uses a bare-global `logger` (installed at runtime by
      // OAmonServer); stub it for the duration of the call.
      const had = 'logger' in (global as any);
      (global as any).logger = { warn: () => {} };
      try {
        mod.command({ alert: 'shape' }, function (err: any) {
          try {
            expect(err).to.equal(null);
            done();
          } catch (e) {
            done(e);
          }
        });
      } finally {
        if (!had) delete (global as any).logger;
      }
    });
  });

  describe('01_sample_internal_action', function () {
    const mod = require(ACTIONS + '01_sample_internal_action');

    it('criteria(lert) builds a node + older-than query', function () {
      const lert = { node: 'h1', last_occurrence: 1000 };
      expect(mod.criteria(lert)).to.eql({ node: 'h1', last_occurrence: { $lt: 1000 } });
    });

    it('setit(lert) bumps severity', function () {
      expect(mod.setit({ severity: 2 })).to.eql({ severity: 3 });
    });
  });

  describe('02_clear_downs', function () {
    const mod = require(ACTIONS + '02_clear_downs');

    it('criteria(lert) builds the clear-downs query', function () {
      const lert = { node: 'h1', agent: 'syslog', last_occurrence: 5000 };
      expect(mod.criteria(lert)).to.eql({
        severity: { $gte: 1 },
        node: 'h1',
        agent: 'syslog',
        type: 'down',
        last_occurrence: { $lt: 5000 },
      });
    });

    it('setit(lert) returns the cleared/acknowledged update', function () {
      expect(mod.setit({})).to.eql({ severity: 0, acknowledged: true, owner: 'system' });
    });
  });

  describe('02_clear_older_downs_for_this_node', function () {
    const mod = require(ACTIONS + '02_clear_older_downs_for_this_node');

    it('criteria(lert) restricts to same-node, older down events', function () {
      const lert = { node: 'h2', agent: 'http', last_occurrence: 7000 };
      expect(mod.criteria(lert)).to.eql({
        severity: { $gte: 1 },
        node: 'h2',
        agent: 'http',
        type: 'down',
        last_occurrence: { $lt: 7000 },
      });
    });

    it('setit returns the standard clear update', function () {
      expect(mod.setit({})).to.eql({ severity: 0, acknowledged: true, owner: 'system' });
    });
  });

  describe('03_delete_by_id', function () {
    const mod = require(ACTIONS + '03_delete_by_id');

    it('criteria(lert) keys on _id', function () {
      expect(mod.criteria({ _id: 'abc' })).to.eql({ _id: 'abc' });
    });
  });
});

describe('automations/triggers config modules', function () {
  describe('01_find_older_clears', function () {
    const mod = require(TRIGGERS + '01_find_older_clears');

    it('query() returns severity:0 with a last_occurrence cutoff in the past', function () {
      const before = Date.now();
      const q = mod.query();
      const after = Date.now();

      expect(q.severity).to.equal(0);
      expect(q.last_occurrence).to.have.property('$lt');
      // Cutoff is "now − 2 minutes", so it must be at least 2 minutes before
      // the time we observed *after* the call.
      const two_min_ms = 2 * 60 * 1000;
      expect(q.last_occurrence.$lt).to.be.at.most(after - two_min_ms);
      expect(q.last_occurrence.$lt).to.be.at.least(before - two_min_ms - 1000);
    });
  });
});
