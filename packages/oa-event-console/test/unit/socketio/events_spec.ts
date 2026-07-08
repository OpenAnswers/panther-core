//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const { Mongoose } = require('../../../lib/mongoose');
require('../../../app/socketio/events');

describe('Unit::EventConsole::socketio::events', function () {
  const clear = getHandler('events::clear');
  const severity = getHandler('events::severity');
  const del = getHandler('events::delete');
  const ack = getHandler('events::acknowledge');
  const unack = getHandler('events::unacknowledge');
  const ack_note = getHandler('events::acknowledge::note');
  const external_id = getHandler('events::external_id');
  const delete_all = getHandler('events::delete::all', 'route_return');
  const assign = getHandler('events::assign', 'route_return');
  const details = getHandler('event::details', 'route_return');
  const join_raw = getHandler('events::join_raw_stream', 'route_return');

  let prevIo: any;

  beforeEach(function () {
    prevIo = SocketIO.io;
    SocketIO.io = {
      emit: sinon.stub(),
      to: sinon.stub().returns({ emit: sinon.stub() }),
    };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('validation: missing / non-array ids', function () {
    const handlers: Array<[string, Function]> = [
      ['events::clear', clear],
      ['events::severity', severity],
      ['events::delete', del],
      ['events::acknowledge', ack],
      ['events::unacknowledge', unack],
      ['events::acknowledge::note', ack_note],
      ['events::external_id', external_id],
    ];

    for (const [name, fn] of handlers) {
      it(`${name}: raises SocketMsgError when ids is missing`, function () {
        const socket = makeSocket({ userId: 'alice', withEv: true });
        const spy = sinon.spy(socket.ev, 'exception');
        fn(socket, {});
        expect(spy.calledWith('SocketMsgError')).to.be.true;
      });

      it(`${name}: raises SocketMsgError when ids is not an array`, function () {
        const socket = makeSocket({ userId: 'alice', withEv: true });
        const spy = sinon.spy(socket.ev, 'exception');
        fn(socket, { ids: 'abc' });
        expect(spy.calledWith('SocketMsgError')).to.be.true;
      });
    }
  });

  describe('events::severity extra validation', function () {
    it('throws ValidationError when severity is missing from the payload', function () {
      const Errors = require('../../../lib/errors');
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => severity(socket, { ids: ['x'] })).to.throw(Errors.ValidationError, /No severity/);
    });
  });

  describe('events::external_id extra validation', function () {
    it('raises SocketMsgError when external_id is missing', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'exception');
      external_id(socket, { ids: ['x'] });
      expect(spy.calledWith('SocketMsgError')).to.be.true;
    });
  });

  describe('events::delete::all', function () {
    it('throws RequestError when the caller is not admin', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      socket.request.user.group = 'user';
      expect(() => delete_all(socket, {})).to.throw(/Permision Denied/);
    });
  });

  describe('events::assign', function () {
    it('throws SocketMsgError when msg is missing', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => assign(socket, null)).to.throw(/No message/);
    });

    it('throws ValidationError when ids is missing', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => assign(socket, { user: 'bob' })).to.throw(/No ids/);
    });

    it('throws ValidationError when user is missing', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => assign(socket, { ids: ['x'] })).to.throw(/No user/);
    });
  });

  describe('event::details', function () {
    it('throws SocketMsgError when msg is missing', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => details(socket, null)).to.throw(/No message/);
    });

    it('throws ValidationError when id is missing', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => details(socket, {})).to.throw(/No ids/);
    });

    it('throws ValidationError when id is not a valid ObjectId', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      expect(() => details(socket, { id: 'not-an-oid' })).to.throw(/Invalid event id/);
    });
  });

  describe('events::join_raw_stream', function () {
    it('joins the raw_stream room and returns a confirmation', function () {
      sinon.stub(Mongoose, 'event_raw_stream').callsFake(() => {});
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const result = join_raw(socket, {});
      expect(socket.rooms.has('raw_stream')).to.be.true;
      expect(result).to.deep.equal({ message: 'Joined raw_stream' });
    });
  });
});
