//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const Errors = require('../../../lib/errors');
const { Filters } = require('../../../app/model/filters');
require('../../../app/socketio/view');

describe('Unit::EventConsole::socketio::view', function () {
  useMongo(this);

  const views_read = getHandler('views::read');
  const view_create = getHandler('view::create');
  const view_update = getHandler('view::update');
  const view_delete = getHandler('view::delete');
  const view_set_d = getHandler('view::set_default');

  let prevIo: any;

  beforeEach(function () {
    prevIo = SocketIO.io;
    SocketIO.io = { emit: sinon.stub() };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('views::read', function () {
    it('returns filters belonging to the authed user sorted by name', function (done) {
      Filters.create([
        { user: 'alice', name: 'zeta' },
        { user: 'alice', name: 'alpha' },
        { user: 'bob', name: 'mine' },
      ])
        .then(() => {
          const socket = makeSocket({ userId: 'alice', withEv: true });
          views_read(socket, {}, function (docs: any[]) {
            try {
              expect(docs.map(d => d.name)).to.deep.equal(['alpha', 'zeta']);
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });
  });

  describe('view::create', function () {
    it('routes a missing-view ValidationError through socket.ev.error', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, {}, () => {});
      expect(errSpy.called).to.be.true;
    });

    it('rejects a view name with invalid characters via socket.ev.error', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { name: '@bad', field: '', value: '' } }, () => {});
      expect(errSpy.called).to.be.true;
    });

    it('throws when view.name is missing', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { field: 'severity', value: '5' } }, () => {});
      expect(errSpy.calledWithMatch(/No "name" in view data/)).to.be.true;
    });

    it('throws when view.field is missing', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { name: 'good', value: '5' } }, () => {});
      expect(errSpy.calledWithMatch(/No "field" in view data/)).to.be.true;
    });

    it('throws when view.value is missing', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { name: 'good', field: 'severity' } }, () => {});
      expect(errSpy.calledWithMatch(/No "value" in view data/)).to.be.true;
    });

    it('throws when view.name is the empty string', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { name: '', field: '', value: '' } }, () => {});
      expect(errSpy.calledWithMatch(/Name must have value/)).to.be.true;
    });

    it('throws when view.name exceeds 30 characters', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      const longName = 'a'.repeat(31);
      await view_create(socket, { view: { name: longName, field: '', value: '' } }, () => {});
      expect(errSpy.calledWithMatch(/less than 30 character/)).to.be.true;
    });

    it('throws when view.name contains invalid characters beyond the first', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { name: 'foo@bar', field: '', value: '' } }, () => {});
      expect(errSpy.calledWithMatch(/spaces or simple characters/)).to.be.true;
    });

    it('throws when value is provided without field', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_create(socket, { view: { name: 'good', field: '', value: 'something' } }, () => {});
      expect(errSpy.calledWithMatch(/Value without field/)).to.be.true;
    });

    it('coerces a numeric string value to a number before insert', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      await view_create(socket, { view: { name: 'numtest', field: 'severity', value: '5' } }, () => {});
      const inserted: any = await Filters.collection.findOne({ name: 'numtest' });
      expect(inserted).to.not.equal(null);
      expect(inserted.value).to.equal(5);
      expect(inserted.f).to.eql({ severity: 5 });
    });

    it('coerces a /regex/ string value to a RegExp before insert', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      await view_create(socket, { view: { name: 'rxtest', field: 'summary', value: '/foo/' } }, () => {});
      const inserted: any = await Filters.collection.findOne({ name: 'rxtest' });
      expect(inserted).to.not.equal(null);
      expect(inserted.value).to.be.an.instanceof(RegExp);
      expect(inserted.value.source).to.equal('foo');
    });

    it('coerces a quoted string value to a plain string before insert', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      await view_create(socket, { view: { name: 'qstest', field: 'summary', value: '"hello"' } }, () => {});
      const inserted: any = await Filters.collection.findOne({ name: 'qstest' });
      expect(inserted).to.not.equal(null);
      expect(inserted.value).to.equal('hello');
    });

    it("coerces value to boolean when field is 'acknowledged'", async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      await view_create(socket, { view: { name: 'acktest', field: 'acknowledged', value: 'true' } }, () => {});
      const inserted: any = await Filters.collection.findOne({ name: 'acktest' });
      expect(inserted).to.not.equal(null);
      expect(inserted.value).to.equal(true);
    });
  });

  describe('view::update', function () {
    it('rejects an invalid name via socket.ev.error', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');
      await view_update(socket, { view: { name: '@bad', field: '', value: '' } }, () => {});
      expect(errSpy.calledWithMatch(/Name must start with/)).to.be.true;
    });

    it('updates an existing view and emits views::updated', async function () {
      const doc = await Filters.create({ user: 'alice', name: 'before', field: '', value: '' });
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const cb = sinon.spy();
      await view_update(socket, { view: { _id: doc._id, name: 'after', field: 'severity', value: '5' } }, cb);
      expect(cb.called).to.be.true;
      expect(SocketIO.io.emit.calledWith('views::updated')).to.be.true;
      const updated: any = await Filters.collection.findOne({ _id: doc._id });
      expect(updated.name).to.equal('after');
    });
  });

  describe('view::delete', function () {
    it('rejects deletion of a default view', async function () {
      const doc = await Filters.create({ user: 'alice', name: 'keeper', default: true });
      const socket = makeSocket({ userId: 'alice', withEv: true });

      // Handler throws a bare string from a .then(); capture the rejection
      // explicitly so bluebird does not surface it as unhandled.
      let threw: any;
      try {
        await view_delete(socket, { _id: doc._id }, () => {});
      } catch (e) {
        threw = e;
      }
      expect(threw).to.equal('Cannot delete default view');

      const remaining = await Filters.find({}).lean();
      expect(remaining).to.have.lengthOf(1);
    });

    it('deletes a non-default view and emits views::updated', async function () {
      const doc = await Filters.create({ user: 'alice', name: 'gone', default: false });
      const socket = makeSocket({ userId: 'alice', withEv: true });

      const cb = sinon.spy();
      await view_delete(socket, { _id: doc._id }, cb);

      expect(cb.called).to.be.true;
      expect(SocketIO.io.emit.calledWith('views::updated')).to.be.true;
      const remaining = await Filters.find({}).lean();
      expect(remaining).to.have.lengthOf(0);
    });

    it('catches a ValidationError thrown during deletion', async function () {
      const doc = await Filters.create({ user: 'alice', name: 'delfail', default: false });
      sinon.stub(Filters, 'deleteOne').rejects(new Errors.ValidationError('boom'));
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const exSpy = sinon.spy(socket.ev, 'exception');
      await view_delete(socket, { _id: doc._id }, () => {});
      expect(exSpy.called).to.be.true;
    });

    it('falls back to data._id in the deleted_label when no view document was found', async function () {
      const fakeId = '000000000000000000000000';
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const infoSpy = sinon.spy(socket.ev, 'info');
      await view_delete(socket, { _id: fakeId }, () => {});
      expect(infoSpy.calledWithMatch(new RegExp(fakeId))).to.be.true;
    });
  });

  describe('view::set_default', function () {
    it('emits views::updated after Filters.set_default resolves', async function () {
      sinon.stub(Filters, 'set_default').resolves();

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const cb = sinon.spy();
      await view_set_d(socket, 'some-id', cb);

      expect(cb.calledWith('Default view set')).to.be.true;
      expect(SocketIO.io.emit.calledWith('views::updated')).to.be.true;
    });

    it('routes a ValidationError through socket.ev.exception when id is null', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const exSpy = sinon.spy(socket.ev, 'exception');
      await view_set_d(socket, null, () => {});
      expect(exSpy.called).to.be.true;
    });
  });
});
