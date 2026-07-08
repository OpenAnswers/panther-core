//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Socket.IO transport mount, authenticated handshake, and echo — ported from
// the socketio section of test/func/client_spec.ts. Needs a real listening
// server (socket.io can't be exercised through a bare supertest app).

/* eslint-disable @typescript-eslint/no-var-requires */
const { expect } = require('../mocha_helpers');
const { getConsoleApp } = require('./_helpers/console_app');
const { ConsoleClient } = require('./_helpers/console_client');

describe('Integration::SocketIO', function () {
  this.timeout(30_000);

  let app: any;
  let client: any;
  let sessionId: string;

  before(async function () {
    app = await getConsoleApp();
    client = new ConsoleClient({ baseUrl: app.baseUrl, secret: app.secret });
    const login = await client.login('test', 'test');
    expect(login.status).to.equal(302);
    sessionId = await client.sessionId();
  });

  it('GET /socket.io/ without a valid transport returns 400 Transport unknown', async function () {
    const res = await client.get('/socket.io/');
    expect(res.status).to.equal(400);
    expect(res.body).to.equal('{"code":0,"message":"Transport unknown"}');
  });

  describe('authenticated socket connection', function () {
    let socket: any;

    afterEach(function () {
      if (socket && socket.connected) socket.disconnect();
      socket = null;
    });

    it('connects when session_id query resolves to a live passport session', function (done) {
      socket = client.openSocket({ sessionId });
      socket.once('connect', () => {
        expect(socket.connected).to.equal(true);
        done();
      });
      socket.once('connect_error', (err: any) => done(err));
    });

    it('echoes test_request as test_response', function (done) {
      socket = client.openSocket({ sessionId });
      socket.once('connect', () => {
        socket.once('test_response', (data: any) => {
          expect(data).to.have.property('request', 'gimme');
          done();
        });
        socket.emit('test_request', 'gimme');
      });
      socket.once('connect_error', (err: any) => done(err));
    });
  });
});
