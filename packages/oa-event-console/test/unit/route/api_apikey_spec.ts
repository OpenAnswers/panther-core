//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const { ApiKey } = require('../../../app/model/apikey');
const router = require('../../../app/route/api/apikey');

describe('Unit::EventConsole::route::api::apikey', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('GET /exists/:apikey (public pre-auth)', function () {
    it('returns { found: true } when the key exists', async function () {
      sinon.stub(ApiKey, 'findOne').resolves({ apikey: 'k' });
      const app = makeRouteApp(router);
      const res = await request(app).get('/exists/abcdef');
      expect(res.body).to.deep.equal({ found: true });
    });

    it('returns { found: false } when the key does not exist', async function () {
      sinon.stub(ApiKey, 'findOne').resolves(null);
      const app = makeRouteApp(router);
      const res = await request(app).get('/exists/nope');
      expect(res.body).to.deep.equal({ found: false });
    });
  });

  describe('admin-gated endpoints', function () {
    it('rejects non-admin users with 401', async function () {
      const app = makeRouteApp(router, { user: { username: 'alice', group: 'user' } });
      const res = await request(app).get('/read');
      expect(res.status).to.equal(401);
      expect(res.body.message).to.equal('Not Permitted');
    });

    it('GET /read returns { results, data } for admin users', async function () {
      sinon.stub(ApiKey, 'find').resolves([{ apikey: 'a' }, { apikey: 'b' }]);
      const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
      const res = await request(app).get('/read');
      expect(res.body.results).to.equal(2);
      expect(res.body.data).to.have.lengthOf(2);
    });

    it('GET /read/:apikey returns 404 when the key is not found', async function () {
      sinon.stub(ApiKey, 'findOne').resolves(null);
      const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
      const res = await request(app).get('/read/nope');
      expect(res.status).to.equal(404);
    });

    it('GET /read/:apikey returns the document when the key is found', async function () {
      sinon.stub(ApiKey, 'findOne').resolves({ apikey: 'k', username: 'alice' });
      const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
      const res = await request(app).get('/read/k');
      expect(res.body.results).to.equal(1);
      expect(res.body.data[0].apikey).to.equal('k');
    });

    it('DELETE /delete/:apikey returns 404 when nothing was removed', async function () {
      sinon.stub(ApiKey, 'deleteOne').resolves({ deletedCount: 0 });
      const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
      const res = await request(app).delete('/delete/k');
      expect(res.status).to.equal(404);
    });

    it('DELETE /delete/:apikey returns a deletion message on success', async function () {
      sinon.stub(ApiKey, 'deleteOne').resolves({ deletedCount: 1 });
      const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
      const res = await request(app).delete('/delete/k');
      expect(res.body.message).to.equal('deleted');
    });
  });
});
