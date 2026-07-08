//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const config = require('../../../lib/config').get_instance();
const router = require('../../../app/route/rules');

describe('Unit::EventConsole::route::rules', function () {
  let prevRules: any;

  beforeEach(function () {
    prevRules = config.rules;
    config.rules = { git: false, types: ['server', 'syslogd'], server: { groups: { names: () => ['web'] } } };
  });

  afterEach(function () {
    config.rules = prevRules;
  });

  function mkApp() {
    const app = makeRouteApp(router, { user: { username: 'alice', group: 'admin' } });
    app.locals.rules = {};
    return app;
  }

  it('redirects unauthenticated requests back to /', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/').redirects(0);
    expect(res.status).to.equal(302);
  });

  it('renders the rules page at /', async function () {
    const res = await request(mkApp()).get('/');
    expect(res.status).to.equal(200);
    expect(res.body._view).to.equal('rules');
    expect(res.body.title).to.equal('Rules');
  });

  it('renders rules-management for /globals', async function () {
    const res = await request(mkApp()).get('/globals');
    expect(res.body._view).to.equal('rules-management');
    expect(res.body.rules_name).to.equal('Global Rules');
    expect(res.body.type).to.equal('server');
    expect(res.body.sub_type).to.equal('globals');
  });

  it('renders rules-management for /groups', async function () {
    const res = await request(mkApp()).get('/groups');
    expect(res.body._view).to.equal('rules-management');
    expect(res.body.sub_type).to.equal('groups');
  });

  it('renders rules-management for /agents', async function () {
    const res = await request(mkApp()).get('/agents');
    expect(res.body._view).to.equal('rules-management');
    expect(res.body.type).to.equal('agent');
  });

  it('renders the schedules page at /schedules', async function () {
    const res = await request(mkApp()).get('/schedules');
    expect(res.body._view).to.equal('schedules');
    expect(res.body.type).to.equal('schedule');
  });

  it('renders the agent page for a known non-server agent', async function () {
    config.rules.syslogd = { agent: {} };
    const res = await request(mkApp()).get('/agent/syslogd');
    expect(res.body._view).to.equal('rules-management');
    expect(res.body.sub_type).to.equal('syslogd');
  });

  it('falls through (404) for an unknown agent', async function () {
    const res = await request(mkApp()).get('/agent/nonesuch');
    expect(res.status).to.equal(404);
  });

  it('renders the new rule page at /new', async function () {
    const res = await request(mkApp()).get('/new');
    expect(res.body._view).to.equal('rules-new');
  });

  it('renders rules-info at /info', async function () {
    const res = await request(mkApp()).get('/info');
    expect(res.body._view).to.equal('rules-info');
  });

  it('renders data-export at /data/export', async function () {
    const res = await request(mkApp()).get('/data/export');
    expect(res.body._view).to.equal('data-export');
  });
});
