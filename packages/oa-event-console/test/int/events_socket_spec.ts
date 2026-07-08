//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Happy-path round-trips for event::details and events::assign. The unit
// socket spec only asserts the validation throws; these exercise the real
// handler against the BSON fixture (alerts._id = 56d19fd8fd087bda5b3f877a).
// Ported from test/func/events_spec.ts.

/* eslint-disable @typescript-eslint/no-var-requires */
const { expect } = require('../mocha_helpers');
const { getConsoleApp } = require('./_helpers/console_app');
const { ConsoleClient } = require('./_helpers/console_client');

const FIXTURE_EVENT_ID = '56d19fd8fd087bda5b3f877a';

describe('Integration::Socket::events', function () {
  this.timeout(30_000);

  let app: any;
  let client: any;
  let sessionId: string;
  let socket: any;

  before(async function () {
    app = await getConsoleApp();
    client = new ConsoleClient({ baseUrl: app.baseUrl, secret: app.secret });
    const login = await client.login('test', 'test');
    expect(login.status).to.equal(302);
    sessionId = await client.sessionId();
  });

  beforeEach(function (done) {
    socket = client.openSocket({ sessionId });
    socket.once('connect', () => done());
    socket.once('connect_error', (err: any) => done(err));
  });

  afterEach(function () {
    if (socket && socket.connected) socket.disconnect();
    socket = null;
  });

  it('event::details returns the alert identified by the BSON fixture _id', function (done) {
    socket.emit('event::details', { id: FIXTURE_EVENT_ID }, function (err: any, res: any) {
      if (err) return done(err);
      expect(res).to.contain.keys('_id', 'summary', 'node', 'severity');
      done();
    });
  });

  it('events::assign reassigns the fixture alert to test1 and returns status+data', function (done) {
    socket.emit('events::assign', { user: 'test1', ids: [FIXTURE_EVENT_ID] }, function (err: any, res: any) {
      if (err) return done(err);
      expect(res).to.have.keys('data', 'status');
      expect(res.data).to.have.keys('owner', 'ids');
      done();
    });
  });
});
