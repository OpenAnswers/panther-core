//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const { ApiKey } = require('../../../app/model/apikey');
const config = require('../../../lib/config').get_instance();
const router = require('../../../app/route/apiconsole');

describe('Unit::EventConsole::route::apiconsole', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('renders the API console with tokens and the https url', async function () {
    config.app.url = 'https://api.example.test';
    sinon.stub(ApiKey, 'user_tokens_Async').resolves([{ apikey: 'k1' }, { apikey: 'k2' }]);

    const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
    const res = await request(app).get('/');

    expect(res.body._view).to.equal('apiconsole');
    expect(res.body.api.tokens).to.deep.equal(['k1', 'k2']);
    expect(res.body.api.url).to.equal('https://api.example.test');
  });

  it('falls back to the http event_monitors URL when app.url is not https', async function () {
    config.app.url = 'http://plain.example.test';
    (config as any).event_monitors = { http: { host: 'events.local', port: 8080 } };
    sinon.stub(ApiKey, 'user_tokens_Async').resolves([]);

    const app = makeRouteApp(router, { user: { username: 'root', group: 'admin' } });
    const res = await request(app).get('/');

    expect(res.body.api.url).to.equal('http://events.local:8080');
    expect(res.body.api.tokens).to.deep.equal([]);
  });

  it('redirects non-admin users to /dashboard', async function () {
    const app = makeRouteApp(router, { user: { username: 'alice', group: 'user' } });
    const res = await request(app).get('/').redirects(0);
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/dashboard?error=not-an-admin');
  });
});
