//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const { router } = require('../../../app/route/status');

describe('Unit::EventConsole::route::status', function () {
  function mkApp() {
    const app = makeRouteApp(router);
    app.locals.start_time = 1_000_000;
    app.locals.update_time = 2_000_000;
    return app;
  }

  it('GET / returns status.time with now/start/update', async function () {
    const res = await request(mkApp()).get('/');
    expect(res.status).to.equal(200);
    expect(res.body.status.time.start).to.equal(1_000_000);
    expect(res.body.status.time.update).to.equal(2_000_000);
    expect(res.body.status.time.now).to.be.a('number');
  });

  it('GET /zmq returns a dummy zmq status payload', async function () {
    const res = await request(mkApp()).get('/zmq');
    expect(res.body.zmq.socket.dummy.connections).to.equal(-1);
    expect(res.body.time.now).to.be.a('number');
  });

  it('GET /mongodb returns a dummy mongodb status payload', async function () {
    const res = await request(mkApp()).get('/mongodb');
    expect(res.body.mongodb.uri.dummy.connections).to.equal(-1);
  });

  it('GET /time returns start/now/update', async function () {
    const res = await request(mkApp()).get('/time');
    expect(res.body.time.start).to.equal(1_000_000);
    expect(res.body.time.update).to.equal(2_000_000);
  });

  it('GET /time/now returns only now', async function () {
    const res = await request(mkApp()).get('/time/now');
    expect(res.body.now).to.be.a('number');
    expect(res.body).to.not.have.property('start');
  });

  it('GET /time/start returns only start', async function () {
    const res = await request(mkApp()).get('/time/start');
    expect(res.body).to.deep.equal({ start: 1_000_000 });
  });

  it('GET /time/update returns only update', async function () {
    const res = await request(mkApp()).get('/time/update');
    expect(res.body).to.deep.equal({ update: 2_000_000 });
  });
});
