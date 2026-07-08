//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const router = require('../../../app/route/api');

describe('Unit::EventConsole::route::api', function () {
  function authed() {
    const app = makeRouteApp(router, { user: { username: 'alice', group: 'admin' } });
    app.locals.name = 'panther';
    return app;
  }

  it('returns 401 for unauthenticated access to gated endpoints', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/');
    expect(res.status).to.equal(401);
    expect(res.body.message).to.equal('Not Permitted');
  });

  it('GET / returns the api greeting for authed users', async function () {
    const res = await request(authed()).get('/');
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('api');
    expect(res.body.version).to.equal(1);
  });

  it('GET /filters returns a name marker', async function () {
    const res = await request(authed()).get('/filters');
    expect(res.body).to.deep.equal({ name: 'filters' });
  });

  it('GET /severities returns a name marker', async function () {
    const res = await request(authed()).get('/severities');
    expect(res.body).to.deep.equal({ name: 'api/severities' });
  });

  it('GET /rules/global returns a name marker', async function () {
    const res = await request(authed()).get('/rules/global');
    expect(res.body).to.deep.equal({ name: 'rules/global' });
  });

  it('GET /rules/groups returns a name marker', async function () {
    const res = await request(authed()).get('/rules/groups');
    expect(res.body).to.deep.equal({ name: 'rules/groups' });
  });

  it('GET /rules/group/:id returns 405 with a name marker', async function () {
    const res = await request(authed()).get('/rules/group/web');
    expect(res.status).to.equal(405);
    expect(res.body).to.deep.equal({ name: 'rules/group' });
  });

  it('unknown endpoints fall through to a 404 JSON response', async function () {
    const res = await request(authed()).get('/nonesuch');
    expect(res.status).to.equal(404);
    expect(res.body).to.deep.equal({ name: 'error', message: 'Not found' });
  });

  it('mounts the /apikey sub-router so /exists bypasses the top-level auth gate', async function () {
    const sinon = require('sinon');
    const { ApiKey } = require('../../../app/model/apikey');
    const stub = sinon.stub(ApiKey, 'findOne').resolves(null);
    try {
      const app = makeRouteApp(router);
      const res = await request(app).get('/apikey/exists/whatever');
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ found: false });
      expect(stub.calledOnce).to.be.true;
    } finally {
      stub.restore();
    }
  });
});
