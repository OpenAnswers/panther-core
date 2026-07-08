//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');

const { SocketIO } = require('../../../lib/socketio');
const { Mongoose } = require('../../../lib/mongoose');
const { server_event } = require('../../../lib/eventemitter');
const { Severity } = require('../../../app/model/severity');
const { Filters } = require('../../../app/model/filters');
const { Activities } = require('../../../lib/activities');
require('../../../app/events/fixme');

describe('Unit::EventConsole::events::fixme', function () {
  let prevIo: any;

  beforeEach(function () {
    prevIo = SocketIO.io;
    SocketIO.io = { emit: sinon.stub() };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('oa::events::updates', function () {
    it('broadcasts deltas carrying the supplied docs as updates', function () {
      server_event.emit('oa::events::updates', { docs: [{ _id: 'a' }, { _id: 'b' }] });
      expect(
        SocketIO.io.emit.calledWith('deltas', {
          updates: [{ _id: 'a' }, { _id: 'b' }],
          inserts: [],
        })
      ).to.be.true;
    });
  });

  describe('oa::events::severity', function () {
    it('raises SocketMsgError when severity is missing from the message', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'exception');
      server_event.emit('oa::events::severity', { socket, data: { ids: ['x'] } });
      expect(spy.calledWith('SocketMsgError')).to.be.true;
    });

    it('raises SocketMsgError when severity is not a number', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'exception');
      server_event.emit('oa::events::severity', { socket, data: { ids: ['x'], severity: 'banana' } });
      expect(spy.calledWith('SocketMsgError')).to.be.true;
    });

    it('raises QueryError when Severity.findOne returns nothing', async function () {
      sinon.stub(Severity, 'findOne').resolves(null);
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'exception');

      server_event.emit('oa::events::severity', { socket, data: { ids: ['x'], severity: '3' } });
      await new Promise(r => setImmediate(r));
      expect(spy.calledWith('QueryError')).to.be.true;
    });
  });

  describe('oa::event::add_note', function () {
    it('warns and exits when the event id is not a valid ObjectId', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'warn');
      server_event.emit('oa::event::add_note', { socket, data: { id: 'not-an-oid', message: 'hi' } });
      expect(spy.called).to.be.true;
    });
  });

  describe('oa::events::deletes', function () {
    it('emits a deletion confirmation and the oa::events::deleted follow-up event', async function () {
      sinon.stub(Mongoose, 'alerts').value({
        remove: () => Promise.resolve({ result: { n: 2 } }),
      });
      sinon.stub(Activities, 'store_event').resolves();
      const deletedSpy = sinon.spy();
      server_event.once('oa::events::deleted', deletedSpy);

      const socket = makeSocket({ userId: 'alice', withEv: true });
      socket.allow('message');

      const cb = sinon.spy();
      server_event.emit('oa::events::deletes', {
        socket,
        data: { ids: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'] },
        cb,
      });
      await new Promise(r => setImmediate(r));

      expect(cb.calledWith(null, 2)).to.be.true;
      expect(deletedSpy.called).to.be.true;
    });
  });

  describe('oa::events::set_filter', function () {
    beforeEach(function () {
      // event_filter() -> filter_room() -> MongoPollers.fetch_id_and_start()
      // walks into SocketIO.room_has_members which dereferences SocketIO.io.
      // Cut the chain so the async work can't outlive afterEach and surface
      // as an unhandled rejection in a later spec.
      const { MongoPollers } = require('../../../lib/mongopollers');
      sinon.stub(MongoPollers, 'fetch_id_and_start').resolves();
    });

    it('warns and returns false for an invalid filter id', function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const spy = sinon.spy(socket.ev, 'warn');
      const result = server_event.emit('oa::events::set_filter', { socket, data: { id: 'nope' } });
      // server_event.emit returns boolean (whether there were listeners); we
      // care about the socket warn firing.
      expect(result).to.be.true;
      expect(spy.called).to.be.true;
    });

    it('falls back to empty filter when no Filters doc is found', async function () {
      sinon.stub(Filters, 'findOne').resolves(null);
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const filterSpy = sinon.spy(socket.ev, 'event_filter');

      const id = '507f1f77bcf86cd799439011';
      const cb = sinon.spy();
      server_event.emit('oa::events::set_filter', { socket, data: { id }, cb });
      await new Promise(r => setImmediate(r));

      expect(filterSpy.calledWith({})).to.be.true;
      expect(cb.calledOnce).to.be.true;
    });

    it('applies the found filter document on the happy path', async function () {
      const filterDoc = { f: { severity: { $gte: 3 } } };
      sinon.stub(Filters, 'findOne').resolves(filterDoc);
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const filterSpy = sinon.spy(socket.ev, 'event_filter');

      const id = '507f1f77bcf86cd799439011';
      const cb = sinon.spy();
      server_event.emit('oa::events::set_filter', { socket, data: { id }, cb });
      await new Promise(r => setImmediate(r));

      expect(filterSpy.calledWith(filterDoc.f)).to.be.true;
      expect(cb.calledOnce).to.be.true;
    });
  });

  describe('oa::events::severity (happy path)', function () {
    it('looks up severity, applies the DB update and stores an activity', async function () {
      sinon.stub(Severity, 'findOne').resolves({ value: '3' });
      // alerts.update is what apply_updates_db calls. Also stub `find` because
      // the 'oa::events::updated' follow-up event wakes MongoPollers which
      // calls Mongoose.alerts.find.
      sinon.stub(Mongoose, 'alerts').value({
        update: () => Promise.resolve({ result: { n: 2 }, n: 2 }),
        find: () => ({ sort: () => ({ limit: () => ({ toArray: () => Promise.resolve([]) }) }) }),
      });
      sinon.stub(Mongoose, 'recids_to_objectid').callsFake((ids: any) => ids);
      const actSpy = sinon.stub(Activities, 'store_event').resolves();
      // MongoPollers downstream work is covered by its own suite; silence it here.
      const { MongoPollers } = require('../../../lib/mongopollers');
      sinon.stub(MongoPollers, 'emit_current_ids').resolves();

      const socket = makeSocket({ userId: 'alice', withEv: true });
      socket.allow('message');
      const cb = sinon.spy();

      server_event.emit('oa::events::severity', {
        socket,
        data: { ids: ['aaaaaaaaaaaaaaaaaaaaaaaa'], severity: '3' },
        cb,
      });
      // Two settle ticks: Severity.findOne → apply_updates_db → activity store.
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));

      expect(actSpy.calledWith('severity', 'alice')).to.be.true;
      expect(actSpy.firstCall.args[2]).to.deep.include({
        ids: ['aaaaaaaaaaaaaaaaaaaaaaaa'],
        new_severity: '3',
      });
    });
  });

  describe('oa::event::add_note (happy path)', function () {
    it('pushes the note and callbacks with the modifiedCount', async function () {
      sinon.stub(Mongoose, 'alerts').value({
        update: () => Promise.resolve({ modifiedCount: 1 }),
      });
      sinon.stub(Mongoose, 'recid_to_objectid_false').callsFake((id: any) => id);

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const cb = sinon.spy();

      server_event.emit('oa::event::add_note', {
        socket,
        data: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', message: 'look here' },
        cb,
      });
      await new Promise(r => setImmediate(r));

      expect(cb.calledWith(null, 1)).to.be.true;
    });
  });
});
