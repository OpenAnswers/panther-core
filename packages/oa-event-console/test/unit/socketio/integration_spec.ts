//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');

const { SocketIO } = require('../../../lib/socketio');
const Errors = require('../../../lib/errors');
const integrationModel = require('../../../app/model/integration');
require('../../../app/socketio/integration');

describe('Unit::EventConsole::socketio::integration', function () {
  let prevIo: any;

  beforeEach(function () {
    prevIo = SocketIO.io;
    SocketIO.io = { emit: sinon.stub() };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  it('registers the integration CRUD routes', function () {
    for (const name of [
      'integrations::read',
      'integration::create',
      'integration::read',
      'integration::update',
      'integration::delete',
    ]) {
      expect(SocketIO.client_routes[name], `route ${name}`).to.be.a('function');
    }
  });

  describe('integration::update', function () {
    it('delegates to Integration.update and emits integrations::updated on success', async function () {
      const updateStub = sinon.stub(integrationModel.Integration, 'update').resolves({ ok: 1 });

      const handler = SocketIO.client_routes['integration::update'];
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const cb = sinon.spy();
      const data = { _id: 'abc', name: 'slack' };

      await handler(socket, data, cb);

      expect(updateStub.calledWith(data)).to.be.true;
      expect(cb.calledWith({ ok: 1 })).to.be.true;
      expect(SocketIO.io.emit.calledWith('integrations::updated')).to.be.true;
    });

    it('surfaces a ValidationError via socket.ev.error', async function () {
      const err = new Errors.ValidationError('bad payload');
      sinon.stub(integrationModel.Integration, 'update').rejects(err);

      const handler = SocketIO.client_routes['integration::update'];
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const errSpy = sinon.spy(socket.ev, 'error');

      await handler(socket, {}, sinon.spy());

      expect(errSpy.calledWith('bad payload')).to.be.true;
      expect(SocketIO.io.emit.called).to.be.false;
    });
  });

  describe('integration::delete', function () {
    it('delegates to Integration.deleteOne and emits integrations::updated on success', async function () {
      const deleteStub = sinon.stub(integrationModel.Integration, 'deleteOne').resolves({ deletedCount: 1 });

      const handler = SocketIO.client_routes['integration::delete'];
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const cb = sinon.spy();

      await handler(socket, { _id: 'abc' }, cb);

      expect(deleteStub.calledWith({ _id: 'abc' })).to.be.true;
      expect(cb.calledWith({ deletedCount: 1 })).to.be.true;
      expect(SocketIO.io.emit.calledWith('integrations::updated')).to.be.true;
    });

    it('surfaces a ValidationError via socket.ev.exception', async function () {
      const err = new Errors.ValidationError('denied');
      sinon.stub(integrationModel.Integration, 'deleteOne').rejects(err);

      const handler = SocketIO.client_routes['integration::delete'];
      const socket = makeSocket({ userId: 'alice', withEv: true });
      const exSpy = sinon.spy(socket.ev, 'exception');

      await handler(socket, { _id: 'abc' }, sinon.spy());

      expect(exSpy.calledWith('ValidationError', 'denied')).to.be.true;
      expect(SocketIO.io.emit.called).to.be.false;
    });
  });
});
