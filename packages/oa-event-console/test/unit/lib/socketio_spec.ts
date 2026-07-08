//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket }    = require('../../helpers/socket_mock');

const { SocketIO } = require('../../../lib/socketio');

describe('Unit::EventConsole::lib::socketio', function() {

  afterEach(function() { sinon.restore(); });

  describe('route / route_return registration', function() {
    it('route() stores the handler under client_routes[name]', function() {
      const fn = () => 42;
      SocketIO.route('test::route', fn);
      expect(SocketIO.client_routes['test::route']).to.equal(fn);
    });

    it('route_return() stores handler + timeout under client_return_routes[name]', function() {
      const fn = () => 42;
      SocketIO.route_return('test::rroute', fn, { timeout: 5000 });
      expect(SocketIO.client_return_routes['test::rroute'].function).to.equal(fn);
      expect(SocketIO.client_return_routes['test::rroute'].timeout).to.equal(5000);
    });

    it('route_return() defaults the timeout to 20 seconds', function() {
      SocketIO.route_return('test::rroute-default', () => {});
      expect(SocketIO.client_return_routes['test::rroute-default'].timeout).to.equal(20000);
    });

    it('init_routes throws when a return route conflicts with a regular route', function() {
      SocketIO.route('test::dup', () => {});
      SocketIO.route_return('test::dup', () => {});
      const socket: any = makeSocket({ withEv: true });
      // init_routes binds via socket.on — the mock doesn't provide it by default.
      socket.on = () => {};
      expect(() => SocketIO.init_routes(socket)).to.throw(/Route already exists/);
    });
  });

  describe('socket_check_msg / socket_check_data / socket_check_ids', function() {
    it('socket_check_msg returns true when msg.socket is present', function() {
      const socket = makeSocket({ withEv: true });
      expect(SocketIO.socket_check_msg({ socket })).to.equal(true);
    });

    it('socket_check_data returns false and exceptions when data is missing', function() {
      const socket = makeSocket({ withEv: true });
      const spy = sinon.spy(socket.ev, 'exception');
      expect(SocketIO.socket_check_data({ socket })).to.equal(false);
      expect(spy.calledWith('SocketMsgError')).to.be.true;
    });

    it('socket_check_ids rejects missing / non-array ids', function() {
      const socket = makeSocket({ withEv: true });
      const spy = sinon.spy(socket.ev, 'exception');
      expect(SocketIO.socket_check_ids({ socket, data: {} })).to.equal(false);
      expect(SocketIO.socket_check_ids({ socket, data: { ids: 'nope' } })).to.equal(false);
      expect(spy.callCount).to.equal(2);
    });

    it('socket_check_ids accepts a well-formed ids array', function() {
      const socket = makeSocket({ withEv: true });
      expect(SocketIO.socket_check_ids({ socket, data: { ids: ['a'] } })).to.equal(true);
    });
  });

  describe('room / room_has_members', function() {
    it('room(name) returns true when a room is present in the adapter', function() {
      const prevIo = SocketIO.io;
      SocketIO.io = { sockets: { adapter: { rooms: new Map([['r1', new Set(['s1'])]]) } } };
      try {
        expect(SocketIO.room('r1')).to.equal(true);
        expect(SocketIO.room('r2')).to.equal(false);
      } finally {
        SocketIO.io = prevIo;
      }
    });

    it('room_has_members returns the room when it exists', function() {
      const prevIo = SocketIO.io;
      const room = new Set(['s1']);
      SocketIO.io = { sockets: { adapter: { rooms: new Map([['r1', room]]) } } };
      try {
        expect(SocketIO.room_has_members('r1')).to.be.ok;
      } finally {
        SocketIO.io = prevIo;
      }
    });
  });

  describe('connection tracking', function() {
    let prevConnections: any;
    let fetchStub: any;

    beforeEach(function() {
      prevConnections = SocketIO.connections;
      SocketIO.connections = {};
      const { MongoPollers } = require('../../../lib/mongopollers');
      fetchStub = sinon.stub(MongoPollers, 'fetch_id_and_start').returns({});
    });

    afterEach(function() {
      SocketIO.connections = prevConnections;
    });

    it('add_connection stores an EvSocket under the socket id', function() {
      const socket = makeSocket({ userId: 'alice' });
      const ev = SocketIO.add_connection(socket);
      expect(SocketIO.connections[socket.id]).to.equal(ev);
      expect(socket.ev).to.equal(ev);
      ev.shutdown();
    });

    it('get_connection returns the previously added ev socket', function() {
      const socket = makeSocket({ userId: 'alice' });
      const ev = SocketIO.add_connection(socket);
      expect(SocketIO.get_connection(socket.id)).to.equal(ev);
      ev.shutdown();
    });

    it('del_connection removes the tracked connection and calls shutdown', function() {
      const socket = makeSocket({ userId: 'alice' });
      const ev = SocketIO.add_connection(socket);
      const shutdownSpy = sinon.spy(ev, 'shutdown');
      SocketIO.del_connection(socket);
      expect(SocketIO.connections[socket.id]).to.be.undefined;
      expect(shutdownSpy.calledOnce).to.be.true;
    });

    it('connected_users returns a deduped list of usernames across all tracked sockets', function() {
      const a = makeSocket({ id: 's-a', userId: 'alice' });
      const b = makeSocket({ id: 's-b', userId: 'bob' });
      const c = makeSocket({ id: 's-c', userId: 'alice' });
      SocketIO.add_connection(a);
      SocketIO.add_connection(b);
      SocketIO.add_connection(c);
      const users = SocketIO.connected_users();
      expect(users).to.have.members(['alice', 'bob']);
      expect(users).to.have.lengthOf(2);
      for (const ev of Object.values(SocketIO.connections) as any[]) ev.shutdown();
    });
  });

  describe('run_route_async', function() {
    it('resolves with the handler return value', async function() {
      const handler = (_s: any, data: any) => data * 2;
      const result = await SocketIO.run_route_async(handler, {}, 21);
      expect(result).to.equal(42);
    });

    it('rejects when the handler throws', async function() {
      const handler = () => { throw new Error('nope'); };
      let threw: any;
      try { await SocketIO.run_route_async(handler, {}); } catch (e) { threw = e; }
      expect(threw).to.be.an('error');
      expect(threw.message).to.equal('nope');
    });
  });
});
