//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const Promise: any = require('bluebird');

const { MongoPoll, MongoSummaryPoll } = require('../../../lib/mongopoll');
const { Mongoose } = require('../../../lib/mongoose');
const { SocketIO } = require('../../../lib/socketio');

describe('Unit::EventConsole::lib::mongopoll', function() {

  let prevIo: any;
  let delayStub: any;

  beforeEach(function() {
    prevIo = SocketIO.io;
    SocketIO.io = { to: sinon.stub().returns({ emit: sinon.stub() }) };
    // MongoPollBase#start kicks off promise() which immediately calls
    // Promise.delay(sleep). Short-circuit it so tests don't hang.
    delayStub = sinon.stub(Promise, 'delay').callsFake(() => ({
      then: () => ({ then: () => Promise.resolve(true) })
    }));
  });

  afterEach(function() {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('MongoPoll constructor', function() {
    it('throws when no filter is supplied', function() {
      expect(() => new MongoPoll({})).to.throw(/No filter/);
    });

    it('computes filter_hash from objhash and defaults the index to state_change', function() {
      const p = new MongoPoll({ filter: { group: 'web' }, sleep: 9999 });
      expect(p.filter_hash).to.be.a('string').with.lengthOf(40);
      expect(p.index).to.equal('state_change');
      expect(p.sleep).to.equal(9999);
    });
  });

  describe('stop()/start()', function() {
    it('stop flips running false; second start is a no-op', function() {
      const p = new MongoPoll({ filter: { x: 1 } });
      p.stop();
      expect(p.running).to.equal(false);

      p.running = true;
      const prevPromise = p.promise;
      p.promise = sinon.spy();
      const result = p.start();
      expect(result).to.equal(true);
      expect(p.promise.called).to.be.false;
      p.promise = prevPromise;
    });
  });

  describe('emit_current_ids', function() {
    it('short-circuits for the empty-filter hash when type is not "clear"', async function() {
      const p = new MongoPoll({ filter: { x: 1 } });
      // Force the well-known empty-filter hash path.
      p.filter_hash = 'bf21a9e8fbc5a3846fb05b4fa0859e0917b2202f';
      const result = p.emit_current_ids({});
      expect(result).to.be.undefined;
    });

    it('queries Mongoose.alerts and emits events::ids on the normal path', async function() {
      const p = new MongoPoll({ filter: { group: 'web' } });
      sinon.stub(Mongoose, 'alerts').value({
        find: () => ({ toArray: () => Promise.resolve([{ _id: 'a' }, { _id: 'b' }]) })
      });
      const emitStub = sinon.stub();
      SocketIO.io = { to: sinon.stub().returns({ emit: emitStub }) };

      const idsObj: any = await p.emit_current_ids({});
      expect(idsObj).to.deep.equal({ a: 1, b: 1 });
      expect(SocketIO.io.to.calledWith(p.filter_hash)).to.be.true;
      expect(emitStub.calledWith('events::ids', { ids: { a: 1, b: 1 } })).to.be.true;
    });
  });

  describe('MongoSummaryPoll', function() {
    it('builds a filter_hash from the options object', function() {
      const p = new MongoSummaryPoll({});
      expect(p.filter_hash).to.be.a('string').with.lengthOf(40);
    });
  });
});
