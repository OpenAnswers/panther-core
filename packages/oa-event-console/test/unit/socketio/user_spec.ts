//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
const { User } = require('../../../app/model/user');
const { Filters } = require('../../../app/model/filters');
const { ApiKey } = require('../../../app/model/apikey');
const Errors = require('../../../lib/errors');
const email = require('../../../lib/email');
require('../../../app/socketio/user');

describe('Unit::EventConsole::socketio::user', function () {
  const users_read = getHandler('users::read', 'route_return');
  const user_create = getHandler('user::create', 'route_return');
  const user_update = getHandler('user::update', 'route_return');
  const user_read = getHandler('user::read');
  const user_delete = getHandler('user::delete');
  const user_reset = getHandler('user::reset_password');

  let prevIo: any;

  beforeEach(function () {
    prevIo = SocketIO.io;
    SocketIO.io = { emit: sinon.stub() };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('users::read', function () {
    it('returns the output of User.read_all_minus_admin', async function () {
      const users = [{ username: 'a' }, { username: 'b' }];
      sinon.stub(User, 'read_all_minus_admin').resolves(users);

      const socket = makeSocket({ userId: 'admin', withEv: true });
      const result = await users_read(socket, {});
      expect(result).to.deep.equal(users);
    });
  });

  describe('user::create', function () {
    it('rejects with ValidationError for missing user', async function () {
      const socket = makeSocket({ userId: 'admin', withEv: true });
      let threw: any;
      try {
        await user_create(socket, {});
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });

    it('rejects with ValidationError when email is malformed', async function () {
      const socket = makeSocket({ userId: 'admin', withEv: true });
      let threw: any;
      try {
        await user_create(socket, { user: { username: 'alice', group: 'admin', email: 'not-an-email' } });
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
      expect(threw.message).to.match(/email/i);
    });
  });

  describe('user::update', function () {
    it('rejects with ValidationError when _id is missing', async function () {
      const socket = makeSocket({ userId: 'admin', withEv: true });
      let threw: any;
      try {
        await user_update(socket, { email: 'a@b.co', group: 'admin', username: 'alice' });
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });

    it('emits users::updated after User.update_data resolves', async function () {
      sinon.stub(User, 'update_data').resolves({ ok: 1 });

      const socket = makeSocket({ userId: 'admin', withEv: true });
      const result = await user_update(socket, {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        email: 'a@b.co',
        group: 'admin',
        username: 'alice',
      });

      expect(result).to.deep.equal({ ok: 1 });
      expect(SocketIO.io.emit.calledWith('users::updated')).to.be.true;
    });
  });

  describe('user::read', function () {
    it('throws ValidationError when the username is too short', function () {
      const socket = makeSocket({ userId: 'admin', withEv: true });
      expect(() => user_read(socket, { user: 'ab' }, () => {})).to.throw(Errors.ValidationError);
    });

    it('calls back with the result of User.read_one', function (done) {
      sinon.stub(User, 'read_one').resolves({ username: 'alice' });

      const socket = makeSocket({ userId: 'admin', withEv: true });
      user_read(socket, { user: 'alice' }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({ username: 'alice' });
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('user::delete', function () {
    it('throws ValidationError when user is missing', function () {
      const socket = makeSocket({ userId: 'admin', withEv: true });
      expect(() => user_delete(socket, {}, () => {})).to.throw(Errors.ValidationError);
    });

    it('deletes across User/Filters/ApiKey and emits users::updated', function (done) {
      sinon.stub(User, 'delete_user').resolves({ deleted: true });
      sinon.stub(Filters, 'delete_user').resolves({});
      sinon.stub(ApiKey, 'delete_user').resolves({});

      const socket = makeSocket({ userId: 'admin', withEv: true });
      user_delete(socket, { user: 'alice' }, function (err: any, payload: any) {
        try {
          expect(err).to.equal(null);
          expect(payload).to.deep.equal({ deleted: true });
          // Wait one tick for the emit (it runs after cb in the .then)
          setImmediate(() => {
            try {
              expect(SocketIO.io.emit.calledWith('users::updated')).to.be.true;
              done();
            } catch (e) {
              done(e);
            }
          });
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('user::reset_password', function () {
    it('throws ValidationError when the username is missing', function () {
      const socket = makeSocket({ userId: 'admin', withEv: true });
      expect(() => user_reset(socket, {}, () => {})).to.throw(Errors.ValidationError);
    });

    it('generates a token, saves the user, sends reset email and calls back on success', function (done) {
      const user: any = {
        email: 'alice@example.com',
        reset: {},
        generate_token(mins: number) {
          this.reset = { token: 'z'.repeat(64), expires: new Date(Date.now() + mins * 60_000) };
        },
        save() {
          return Promise.resolve(this);
        },
      };
      const generateSpy = sinon.spy(user, 'generate_token');
      const saveSpy = sinon.spy(user, 'save');
      sinon.stub(User, 'findOne').resolves(user);
      // Handler pipes through send_email_Async → transport.sendMailAsync.
      const transportStub = sinon.stub(email.transport, 'sendMailAsync').resolves({
        messageId: 'm1',
        response: '250 OK',
      });

      const socket = makeSocket({ userId: 'admin', withEv: true });
      const infoSpy = sinon.spy(socket.ev, 'info');

      user_reset(socket, { user: 'alice' }, function (err: any, ok: any) {
        try {
          expect(err).to.equal(null);
          expect(ok).to.equal(true);
          expect(generateSpy.calledWith(1440)).to.be.true;
          expect(saveSpy.calledOnce).to.be.true;
          expect(transportStub.calledOnce).to.be.true;
          const mailArg = transportStub.firstCall.args[0];
          expect(mailArg.to).to.equal('alice@example.com');
          expect(mailArg.html).to.be.a('string');
          expect(mailArg.html).to.contain('z'.repeat(64));
          expect(infoSpy.calledWithMatch(/alice.*password reset/)).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('routes ValidationError from the pipeline via socket.ev.exception', function (done) {
      const err = new Errors.ValidationError('boom');
      sinon.stub(User, 'findOne').rejects(err);

      const socket = makeSocket({ userId: 'admin', withEv: true });
      const exSpy = sinon.spy(socket.ev, 'exception');

      // Handler catches ValidationError internally — callback is never called,
      // so we wait a tick then assert on the exception side-effect.
      user_reset(socket, { user: 'alice' }, function () {
        // Not expected in this path — if invoked, we'll fail below.
      });

      setImmediate(() => {
        try {
          expect(exSpy.calledWith('ValidationError', 'boom')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
