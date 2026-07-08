//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const config = require('../../../lib/config').get_instance();
const router = require('../../../app/route/help');

describe('Unit::EventConsole::route::help', function () {
  it('renders the help page with app config locals', async function () {
    config.app.domain = 'example.test';
    config.app.url = 'https://example.test';
    config.app.syslog_port = 514;

    const app = makeRouteApp(router, { user: { username: 'alice' } });
    const res = await request(app).get('/');

    expect(res.body._view).to.equal('help');
    expect(res.body.domain).to.equal('example.test');
    expect(res.body.url).to.equal('https://example.test');
    expect(res.body.syslog_port).to.equal(514);
    expect(res.body.user.username).to.equal('alice');
  });
});
