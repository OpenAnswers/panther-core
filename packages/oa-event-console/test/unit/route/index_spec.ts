//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// These tests cover the bits of app/route/index.ts that don't touch sub-routers
// or passport strategies — the root `/`, `/login` GET, `/logout`, and `/ping`
// handlers. The sub-router mounts (`/status`, `/api`, …) bring in a large chunk
// of the app and are already covered by their own specs.

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const express = require('express');
const request = require('supertest');

// Load the module under test. It triggers passport.use() at import, which needs
// the mongoose connection to exist so we rely on useMongo below.
require('../../../app/model/user');
const routeIndex = require('../../../app/route/index');

const { Activities } = require('../../../lib/activities');

function makeApp(opts: { user?: any; skipMongoGate?: boolean } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(function (req: any, _res: any, next: any) {
    if (opts.user !== undefined) req.user = opts.user;
    req.session = { destroy: (cb: Function) => cb?.() };
    req.logout = (cb: Function) => cb?.();
    next();
  });

  // Echo render as JSON so we can introspect view + locals without pug.
  app.use(function (_req: any, res: any, next: any) {
    res.render = function (view: string, locals: any) {
      res.json({ _view: view, ...(locals ?? {}) });
    };
    next();
  });

  // We call the same route() export that app bootstraps with. It attaches all
  // the handlers (including sub-routers). If `skipMongoGate`, we wrap to stop
  // the mongoose-ready gate from firing on non-gated paths.
  routeIndex.route(app);

  app.use(function (err: any, _req: any, _res: any, next: any) {
    next(err);
  });
  return app;
}

describe('Unit::EventConsole::route::index', function () {
  useMongo(this);

  afterEach(function () {
    sinon.restore();
  });

  describe('GET /', function () {
    it('renders the dashboard when a user is attached to the request', async function () {
      const app = makeApp({ user: { username: 'alice' } });
      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.body._view).to.equal('dashboard');
      expect(res.body.title).to.equal('Dashboard');
      expect(res.body.user.username).to.equal('alice');
    });

    it('renders the index (login) page when the user is anonymous', async function () {
      const app = makeApp();
      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.body._view).to.equal('index');
      expect(res.body.title).to.equal('Login');
    });

    it('passes a redirectUrl through to the index template', async function () {
      const app = makeApp();
      const res = await request(app).get('/?redirectUrl=/views/foo');
      expect(res.body.redirectUrl).to.equal('/views/foo');
    });
  });

  describe('GET /login', function () {
    it('always renders the index template', async function () {
      const app = makeApp();
      const res = await request(app).get('/login');
      expect(res.status).to.equal(200);
      expect(res.body._view).to.equal('index');
      expect(res.body.title).to.equal('Login');
    });
  });

  describe('ALL /logout', function () {
    it('redirects to / and clears the session', async function () {
      const activitySpy = sinon.stub(Activities, 'store');
      const app = makeApp({ user: { id: 'u1', username: 'alice' } });
      const res = await request(app).get('/logout').redirects(0);
      expect(res.status).to.equal(302);
      expect(res.headers.location).to.equal('/');
      expect(activitySpy.calledWith('user', 'logout', 'alice')).to.be.true;
    });

    it('does not call Activities.store when no user is attached', async function () {
      const activitySpy = sinon.stub(Activities, 'store');
      const app = makeApp();
      const res = await request(app).get('/logout').redirects(0);
      expect(res.status).to.equal(302);
      expect(activitySpy.called).to.be.false;
    });
  });

  describe('GET /ping', function () {
    it('returns 200 pong!', async function () {
      const app = makeApp({ user: { username: 'alice' } });
      const res = await request(app).get('/ping');
      expect(res.status).to.equal(200);
      expect(res.text).to.equal('pong!');
    });
  });
});
