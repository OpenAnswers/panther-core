//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const router = require('../../../app/route/settings');

describe('Unit::EventConsole::route::settings', function () {
  it('renders the settings template for /', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/');
    expect(res.body._view).to.equal('settings');
    expect(res.body.title).to.equal('Settings');
  });

  it('renders the settings template for /:action regardless of action', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/email');
    expect(res.body._view).to.equal('settings');
    expect(res.body.title).to.equal('Settings');
  });
});
