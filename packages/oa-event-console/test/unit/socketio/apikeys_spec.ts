//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { ApiKey } = require('../../../app/model/apikey');
const { SocketIO } = require('../../../lib/socketio');
const config = require('../../../lib/config').get_instance();
const Errors = require('../../../lib/errors');
require('../../../app/socketio/apikeys');

describe('Unit::EventConsole::socketio::apikeys', function () {
  useMongo(this);

  const apikeys_read = getHandler('apikeys::read');
  const apikey_create = getHandler('apikey::create', 'route_return');
  const apikey_read = getHandler('apikey::read', 'route_return');
  const apikey_delete = getHandler('apikey::delete', 'route_return');

  let ioEmitStub: any;
  let prevIo: any;

  beforeEach(function () {
    ioEmitStub = sinon.stub();
    prevIo = SocketIO.io;
    // ApiKeySchema post('save') hook calls SocketIO.io?.to('apikeys').emit(...),
    // so the stub needs `to` returning an emitter too.
    SocketIO.io = {
      emit: ioEmitStub,
      to: sinon.stub().returns({ emit: sinon.stub() }),
    };
  });

  afterEach(function () {
    SocketIO.io = prevIo;
    sinon.restore();
  });

  describe('apikeys::read', function () {
    it('returns { apikeys, max, data } with max=false when under the limit', function (done) {
      config.app.apikey_limit = 5;

      ApiKey.create([{ username: 'a' }, { username: 'b' }])
        .then(() => {
          const socket = makeSocket();
          apikeys_read(socket, {}, function (err: any, payload: any) {
            try {
              expect(err).to.equal(null);
              expect(payload.apikeys).to.have.lengthOf(2);
              expect(payload.max).to.equal(false);
              expect(payload.data).to.deep.equal({ amount: 2, limit: 5 });
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });

    it('returns max=true when the count hits the limit', function (done) {
      config.app.apikey_limit = 2;

      ApiKey.create([{ username: 'a' }, { username: 'b' }])
        .then(() => {
          const socket = makeSocket();
          apikeys_read(socket, {}, function (_err: any, payload: any) {
            try {
              expect(payload.max).to.equal(true);
              done();
            } catch (e) {
              done(e);
            }
          });
        })
        .catch(done);
    });
  });

  describe('apikey::create', function () {
    it('creates an apikey for the authed user and emits apikey::updated', async function () {
      config.app.apikey_limit = 10;

      const socket = makeSocket({ userId: 'alice', withEv: true });
      const result = await apikey_create(socket, { apikey: {} });

      expect(result).to.equal('apikey setup');
      expect(ioEmitStub.calledWith('apikey::updated')).to.be.true;

      const docs = await ApiKey.find({}).lean();
      expect(docs).to.have.lengthOf(1);
      expect(docs[0].username).to.equal('alice');
      expect(docs[0].apikey).to.be.a('string').with.length.above(0);
    });

    it('rejects when the usage limit has already been reached', async function () {
      config.app.apikey_limit = 1;
      await ApiKey.create({ username: 'existing' });

      const socket = makeSocket({ userId: 'alice', withEv: true });
      let threw: any;
      try {
        await apikey_create(socket, { apikey: {} });
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
      expect(threw.message).to.match(/exceeded/i);
    });
  });

  describe('apikey::read', function () {
    it('passes validation with a 32-char alphanum key and delegates to ApiKey.findById', async function () {
      // Note: apikey_read_schema requires a 32-char alphanum string, but the
      // handler then calls ApiKey.findById which expects an ObjectId — not
      // the apikey field. That is a pre-existing handler quirk; this test
      // covers only the validation boundary by stubbing findById.
      const findStub = sinon.stub(ApiKey, 'findById').resolves({ username: 'alice' });

      const socket = makeSocket();
      const key = 'a'.repeat(32);
      const result = await apikey_read(socket, { apikey: key });
      expect(findStub.calledWith(key)).to.be.true;
      expect(result.username).to.equal('alice');
    });

    it('rejects with ValidationError when apikey id is missing', async function () {
      const socket = makeSocket();
      let threw: any;
      try {
        await apikey_read(socket, {});
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });
  });

  describe('apikey::delete', function () {
    it('deletes the apikey identified by its 32-char string key and emits apikey::updated', async function () {
      const doc = await ApiKey.create({ username: 'alice' });
      const key = doc.apikey;
      expect(key).to.have.lengthOf(32);

      const socket = makeSocket({ userId: 'alice', withEv: true });
      await apikey_delete(socket, { apikey: key });

      expect(ioEmitStub.calledWith('apikey::updated')).to.be.true;

      const remaining = await ApiKey.find({}).lean();
      expect(remaining).to.have.lengthOf(0);
    });

    it('rejects with ValidationError when apikey is missing', async function () {
      const socket = makeSocket({ userId: 'alice', withEv: true });
      let threw: any;
      try {
        await apikey_delete(socket, {});
      } catch (e) {
        threw = e;
      }
      expect(threw).to.be.instanceof(Errors.ValidationError);
    });
  });
});
