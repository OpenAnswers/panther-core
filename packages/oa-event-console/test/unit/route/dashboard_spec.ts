//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const router = require('../../../app/route/dashboard');

describe('Unit::EventConsole::route::dashboard', function () {
  it('renders the dashboard with the authed user', async function () {
    const app = makeRouteApp(router, { user: { username: 'alice' } });
    const res = await request(app).get('/');
    expect(res.body._view).to.equal('dashboard');
    expect(res.body.user.username).to.equal('alice');
  });

  it('redirects to / with a redirectUrl when unauthenticated', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/').redirects(0);
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/?redirectUrl=/');
  });
});
