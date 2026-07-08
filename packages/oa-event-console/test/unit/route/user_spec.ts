//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const router = require('../../../app/route/user');

describe('Unit::EventConsole::route::user', function () {
  it('renders the index template with greeting locals', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/');
    expect(res.status).to.equal(200);
    expect(res.body._view).to.equal('index');
    expect(res.body.title).to.equal('User');
    expect(res.body.message).to.equal('Hello there!');
  });
});
