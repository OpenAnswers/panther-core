//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { EvSocket } = require('../../../lib/evsocket');
const { MongoPollers } = require('../../../lib/mongopollers');
const Errors = require('../../../lib/errors');

function fakeSocket(overrides: any = {}) {
  return {
    id: 's1',
    request: { user: { username: 'alice', email: 'alice@example.com' } },
    emit: sinon.stub(),
    join: sinon.stub(),
    leave: sinon.stub(),
    adapter: { rooms: new Map() },
    ...overrides
  };
}

describe('Unit::EventConsole::lib::evsocket', function() {

  let fetchStub: any;

  beforeEach(function() {
    // Constructor wires filter_room → MongoPollers.fetch_id_and_start; silence it.
    fetchStub = sinon.stub(MongoPollers, 'fetch_id_and_start').returns({});
  });

  afterEach(function() { sinon.restore(); });

  describe('user() / email()', function() {
    it('returns the username off socket.request.user', function() {
      const ev = new EvSocket(fakeSocket(), {});
      expect(ev.user()).to.equal('alice');
    });

    it('throws SocketError when no user is attached', function() {
      const ev = new EvSocket(fakeSocket({ request: {} }), {});
      expect(() => ev.user()).to.throw(Errors.SocketError);
    });

    it('email() returns the user email', function() {
      const ev = new EvSocket(fakeSocket(), {});
      expect(ev.email()).to.equal('alice@example.com');
    });
  });

  describe('rooms()', function() {
    it('returns the adapter rooms map', function() {
      const ev = new EvSocket(fakeSocket(), {});
      expect(ev.rooms()).to.be.a('Map');
    });

    it('throws when no adapter is attached', function() {
      const ev = new EvSocket(fakeSocket({ adapter: undefined }), {});
      expect(() => ev.rooms()).to.throw(Errors.SocketError);
    });
  });

  describe('event_filter / event_group / event_severity', function() {
    it('get/set cycle stores the filter and regenerates filter_room', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      const out = ev.event_filter({ severity: { $gte: 3 } });
      expect(out).to.deep.equal({ severity: { $gte: 3 } });
      expect(s.join.called).to.be.true;
      expect(fetchStub.called).to.be.true;
    });

    it('event_group("No Group") stores the empty string internally', function() {
      const ev = new EvSocket(fakeSocket(), {});
      ev.event_group('No Group');
      expect(ev.event_group()).to.equal('');
    });

    it('event_severity round-trips via the setter', function() {
      const ev = new EvSocket(fakeSocket(), {});
      ev.event_severity(4);
      expect(ev.event_severity()).to.equal(4);
    });
  });

  describe('filter_room', function() {
    it('leaves the old room before joining a new one when the filter changes', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      ev.event_filter({ a: 1 });
      const firstRoom = ev._filter_room;
      ev.event_filter({ a: 2 });
      expect(s.leave.calledWith(firstRoom)).to.be.true;
      expect(s.join.calledWith(ev._filter_room)).to.be.true;
    });
  });

  describe('messaging', function() {
    it('message() emits the typed payload', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      ev.message('Custom', 'hi', 5, { k: 'v' });
      expect(s.emit.calledWith('message', {
        type: 'Custom', message: 'hi', timeout: 5, data: { k: 'v' }
      })).to.be.true;
    });

    it('success/info/warn/error route through message() with canonical types', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      ev.success('s');
      expect(s.emit.firstCall.args[1].type).to.equal('Success');
      ev.info('i');
      expect(s.emit.secondCall.args[1].type).to.equal('Info');
      ev.warn('w');
      expect(s.emit.thirdCall.args[1].type).to.equal('Warning');
      ev.error('e');
      expect(s.emit.getCall(3).args[1].type).to.equal('Error');
    });

    it('exception() emits a message with an error key and 0 default timeout', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      ev.exception('QueryError', 'bad thing');
      const arg = s.emit.firstCall.args[1];
      expect(arg.error).to.equal('QueryError');
      expect(arg.message).to.equal('bad thing');
      expect(arg.timeout).to.equal(0);
    });
  });

  describe('ping lifecycle', function() {
    let clock: any;

    beforeEach(function() { clock = sinon.useFakeTimers(); });
    afterEach(function() { clock.restore(); });

    it('init() sets up a 29s ping interval emitting ping frames', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      ev.init();
      expect(ev.ping_timer_id).to.not.equal(null);
      clock.tick(29_000);
      expect(s.emit.calledWith('ping', {})).to.be.true;
    });

    it('shutdown() clears the ping interval', function() {
      const s = fakeSocket();
      const ev = new EvSocket(s, {});
      ev.init();
      ev.shutdown();
      clock.tick(60_000);
      // No ping emit should have fired after shutdown.
      const pingCalls = s.emit.getCalls().filter((c: any) => c.args[0] === 'ping');
      expect(pingCalls).to.have.lengthOf(0);
    });
  });
});
