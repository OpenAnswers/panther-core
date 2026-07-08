//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const router = require('../../../app/route/debug');

describe('Unit::EventConsole::route::debug', function () {
  it('renders the debug page for an admin user', async function () {
    const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
    const res = await request(app).get('/');
    expect(res.body._view).to.equal('debug');
  });

  it('redirects non-admin users to /dashboard', async function () {
    const app = makeRouteApp(router, { user: { username: 'alice', group: 'user' } });
    const res = await request(app).get('/').redirects(0);
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/dashboard?error=not-an-admin');
  });

  it('redirects unauthenticated requests back to /', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/').redirects(0);
    expect(res.status).to.equal(302);
  });
});
