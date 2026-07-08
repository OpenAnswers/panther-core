//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { ApiKey, APIKEY_LENGTH } = require('../../../app/model/apikey');
const { SocketIO } = require('../../../lib/socketio');

describe('Unit::EventConsole::model::ApiKey', function () {
  useMongo(this);

  afterEach(function () {
    sinon.restore();
  });

  it('generates a 32-char apikey by default', async function () {
    const doc = await ApiKey.create({ username: 'alice', integration: 'console' });
    expect(doc.apikey).to.be.a('string');
    expect(doc.apikey).to.have.lengthOf(APIKEY_LENGTH);
  });

  it('enforces the unique apikey index', async function () {
    const shared = 'A'.repeat(APIKEY_LENGTH);
    await ApiKey.create({ apikey: shared, username: 'alice', integration: 'console' });
    let err: any = null;
    try {
      await ApiKey.create({ apikey: shared, username: 'bob', integration: 'http' });
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.code ?? err.name).to.satisfy((v: any) => v === 11000 || /Duplicate|Mongo/.test(String(v)));
  });

  it('rejects an integration outside the allowed enum', async function () {
    let err: any = null;
    try {
      await ApiKey.create({ username: 'alice', integration: 'nope' });
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.have.property('integration');
  });

  it('post-save emits apikeys::updated to the apikeys room', async function () {
    const emit = sinon.stub();
    const to = sinon.stub().returns({ emit });
    sinon.stub(SocketIO, 'io').value({ to });

    await ApiKey.create({ username: 'alice', integration: 'console' });

    expect(to.calledWith('apikeys')).to.be.true;
    expect(emit.calledWith('apikeys::updated')).to.be.true;
  });

  describe('user_tokens_Async', function () {
    it('throws ValidationError when username is missing', async function () {
      let err: any = null;
      try {
        await ApiKey.user_tokens_Async(undefined);
      } catch (e) {
        err = e;
      }
      expect(err).to.not.equal(null);
      expect(err.name).to.equal('ValidationError');
    });

    it('returns the matching documents', async function () {
      await ApiKey.create({ username: 'alice', integration: 'console' });
      await ApiKey.create({ username: 'alice', integration: 'http' });
      const docs = await ApiKey.user_tokens_Async('alice');
      expect(docs).to.have.lengthOf(2);
    });
  });

  describe('delete_user', function () {
    it('removes one entry for the user', async function () {
      await ApiKey.create({ username: 'alice', integration: 'console' });
      const res = await ApiKey.delete_user('alice');
      expect(res.deletedCount).to.equal(1);
    });
  });
});
