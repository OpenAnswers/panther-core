//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const Promise: any = require('bluebird');

const { BaseMongoPollers, MongoPollers, MongoSummaryPollers } = require('../../../lib/mongopollers');
const { MongoPoll, MongoSummaryPoll } = require('../../../lib/mongopoll');
const { SocketIO } = require('../../../lib/socketio');

describe('Unit::EventConsole::lib::mongopollers', function() {

  let prevIo: any;
  let delayStub: any;

  beforeEach(function() {
    prevIo = SocketIO.io;
    SocketIO.io = { to: sinon.stub().returns({ emit: sinon.stub() }) };
    // Pollers auto-start on add(); bypass the poll loop for test speed.
    delayStub = sinon.stub(Promise, 'delay').callsFake(() => ({
      then: () => ({ then: () => Promise.resolve(true) })
    }));
  });

  afterEach(function() {
    SocketIO.io = prevIo;
    sinon.restore();
    MongoPollers.instances = {};
    MongoSummaryPollers.instances = {};
  });

  describe('class registry', function() {
    it('MongoPollers uses MongoPoll as its implementation', function() {
      expect(MongoPollers.pollImpl).to.equal(MongoPoll);
    });

    it('MongoSummaryPollers uses MongoSummaryPoll as its implementation', function() {
      expect(MongoSummaryPollers.pollImpl).to.equal(MongoSummaryPoll);
    });

    it('subclasses do not share instance maps', function() {
      MongoPollers.add({ filter: { a: 1 } });
      expect(Object.keys(MongoSummaryPollers.instances)).to.have.lengthOf(0);
    });
  });

  describe('add / get / fetch / delete', function() {
    it('add() stores a new poll indexed by its filter_hash', function() {
      const poll = MongoPollers.add({ filter: { a: 1 } });
      expect(poll.filter_hash).to.be.a('string');
      expect(MongoPollers.instances[poll.filter_hash]).to.equal(poll);
    });

    it('get() by filter returns the matching poll', function() {
      const filter = { group: 'web' };
      const poll = MongoPollers.add({ filter });
      expect(MongoPollers.get(filter)).to.equal(poll);
    });

    it('get() returns false when no poll matches', function() {
      expect(MongoPollers.get({ does_not_exist: true })).to.equal(false);
    });

    it('fetch() adds when missing and returns the existing entry when present', function() {
      const filter = { kind: 'fetch-test' };
      const first = MongoPollers.fetch(filter);
      const second = MongoPollers.fetch(filter);
      expect(first).to.equal(second);
    });

    it('delete() stops the poll and removes it; returns false on a missing key', function() {
      const filter = { kind: 'delete-test' };
      const poll = MongoPollers.add({ filter });
      const stopSpy = sinon.spy(poll, 'stop');
      expect(MongoPollers.delete(filter)).to.equal(true);
      expect(stopSpy.calledOnce).to.be.true;
      expect(MongoPollers.delete(filter)).to.equal(false);
    });
  });

  describe('emit_current_ids (broadcast)', function() {
    it('invokes emit_current_ids on every registered poll', async function() {
      const p1 = MongoPollers.add({ filter: { a: 1 } });
      const p2 = MongoPollers.add({ filter: { b: 2 } });
      const e1 = sinon.stub(p1, 'emit_current_ids').resolves();
      const e2 = sinon.stub(p2, 'emit_current_ids').resolves();

      const result = await MongoPollers.emit_current_ids({ type: 'clear' });
      expect(result).to.equal(true);
      expect(e1.called).to.be.true;
      expect(e2.called).to.be.true;
    });
  });
});
