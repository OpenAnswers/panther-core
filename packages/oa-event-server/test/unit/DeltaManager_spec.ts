//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../mocha_helpers');

const DeltaManager = require('../../lib/DeltaManager');

describe('DeltaManager', function () {
  // NOTE: the module references an undeclared `logger` in two branches
  // (constructor-without-ids, delID-on-missing-id, hasID-when-logger-used-elsewhere).
  // Tests avoid exercising those paths; they would throw ReferenceError.

  describe('constructor', function () {
    it('seeds the id hash from args.ids', function () {
      const dm = new DeltaManager({ ids: ['alpha', 'beta'] });
      expect(dm.hasID('alpha')).to.equal(true);
      expect(dm.hasID('beta')).to.equal(true);
      expect(dm.hasID('gamma')).to.equal(false);
    });

    it('keeps outstanding insert/update/delete arrays empty', function () {
      const dm = new DeltaManager({ ids: [] });
      expect(dm.outstanding_inserts).to.eql([]);
      expect(dm.outstanding_updates).to.eql([]);
      expect(dm.outstanding_deletes).to.eql([]);
    });

    it('stores session_id, filter and time_from from args', function () {
      const dm = new DeltaManager({
        ids: [],
        session_id: 'sess-1',
        filter: { severity: 3 },
        time_from: 1700000000,
      });
      expect(dm.session_id).to.equal('sess-1');
      expect(dm.filter).to.eql({ severity: 3 });
      expect(dm.time_from).to.equal(1700000000);
    });
  });

  describe('addID', function () {
    it('adds an id to the hash', function () {
      const dm = new DeltaManager({ ids: [] });
      dm.addID('new-id');
      expect(dm.hasID('new-id')).to.equal(true);
    });

    it('is idempotent for the same id', function () {
      const dm = new DeltaManager({ ids: [] });
      dm.addID('x');
      dm.addID('x');
      expect(dm.hasID('x')).to.equal(true);
      expect(Object.keys(dm.ids)).to.eql(['x']);
    });
  });

  describe('delID', function () {
    it('removes an existing id from the hash', function () {
      const dm = new DeltaManager({ ids: ['keep', 'remove'] });
      dm.delID('remove');
      expect(dm.hasID('remove')).to.equal(false);
      expect(dm.hasID('keep')).to.equal(true);
    });
  });

  describe('hasID', function () {
    it('returns false for undefined input', function () {
      const dm = new DeltaManager({ ids: ['a'] });
      expect(dm.hasID(undefined)).to.equal(false);
    });

    it('returns true for a known id and false for an unknown id', function () {
      const dm = new DeltaManager({ ids: ['a'] });
      expect(dm.hasID('a')).to.equal(true);
      expect(dm.hasID('b')).to.equal(false);
    });
  });

  describe('resetID', function () {
    it('clears the stored ids', function () {
      const dm = new DeltaManager({ ids: ['a', 'b'] });
      dm.resetID();
      expect(dm.hasID('a')).to.equal(false);
      expect(dm.hasID('b')).to.equal(false);
    });
  });
});
