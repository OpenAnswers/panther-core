//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const mongoose = require('mongoose');
const { Mongoose } = require('../../../lib/mongoose');

describe('Unit::EventConsole::lib::mongoose', function() {

  describe('recid_to_objectid_false', function() {
    it('returns a Types.ObjectId for a valid 24-char hex string', function() {
      const oid = Mongoose.recid_to_objectid_false('507f1f77bcf86cd799439011');
      expect(oid).to.be.instanceof(mongoose.Types.ObjectId);
    });

    it('returns false when the id is null or undefined', function() {
      expect(Mongoose.recid_to_objectid_false(null)).to.equal(false);
      expect(Mongoose.recid_to_objectid_false(undefined)).to.equal(false);
    });

    it('returns false for non-string inputs', function() {
      expect(Mongoose.recid_to_objectid_false(42)).to.equal(false);
      expect(Mongoose.recid_to_objectid_false({})).to.equal(false);
    });

    it('returns false for malformed ids', function() {
      expect(Mongoose.recid_to_objectid_false('too-short')).to.equal(false);
      expect(Mongoose.recid_to_objectid_false('zzzzzzzzzzzzzzzzzzzzzzzz')).to.equal(false);
    });
  });

  describe('recids_to_objectids_false', function() {
    it('filters out invalid ids and keeps the valid ones', function() {
      const result = Mongoose.recids_to_objectids_false([
        '507f1f77bcf86cd799439011',
        'not-valid',
        '507f1f77bcf86cd799439012'
      ]);
      expect(result).to.have.lengthOf(2);
      expect(result.every((x: any) => x instanceof mongoose.Types.ObjectId)).to.be.true;
    });
  });

  describe('recid_to_objectid_safe', function() {
    it('throws when the id is missing', function() {
      expect(() => Mongoose.recid_to_objectid_safe(undefined)).to.throw(/No event id/);
    });

    it('throws when the id is the wrong type', function() {
      expect(() => Mongoose.recid_to_objectid_safe(123 as any)).to.throw(/not a string/);
    });

    it('throws for a malformed id', function() {
      expect(() => Mongoose.recid_to_objectid_safe('bad-id')).to.throw(/Invalid event id/);
    });

    it('returns an ObjectId for a valid id', function() {
      const oid = Mongoose.recid_to_objectid_safe('507f1f77bcf86cd799439011');
      expect(oid).to.be.instanceof(mongoose.Types.ObjectId);
    });
  });

  describe('recids_to_objectid', function() {
    it('maps every id through recid_to_objectid', function() {
      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const out = Mongoose.recids_to_objectid(ids);
      expect(out).to.have.lengthOf(2);
      expect(out.every((x: any) => x instanceof mongoose.Types.ObjectId)).to.be.true;
    });
  });

  describe('connect', function() {
    it('rejects via callback when mongodb.uri is undefined', function(done) {
      const config = require('../../../lib/config').get_instance();
      const prev = config.mongodb.uri;
      config.mongodb.uri = undefined;
      try {
        Mongoose.connect(function(err: any) {
          config.mongodb.uri = prev;
          try {
            expect(err).to.match(/mongodb\.uri is undefined/);
            done();
          } catch (e) { done(e); }
        });
      } catch (e) {
        config.mongodb.uri = prev;
        done(e);
      }
    });

    it('short-circuits when already connected', function() {
      const prevConnected = Mongoose.connected;
      Mongoose.connected = true;
      try {
        const cb = sinon.spy();
        const result = Mongoose.connect(cb);
        expect(cb.calledOnce).to.be.true;
        expect(cb.firstCall.args[0]).to.equal(null);
        expect(result).to.equal(Mongoose.db);
      } finally {
        Mongoose.connected = prevConnected;
      }
    });
  });
});
