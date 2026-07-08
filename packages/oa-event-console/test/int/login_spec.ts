//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Raw HTTP login behaviour: POST /login with valid credentials returns a 302
// and sets a signed `panther.sid` cookie that decodes to a session_id.
// Ports the 'should succesfully authenticate' assertion from
// test/func/client_spec.ts.

/* eslint-disable @typescript-eslint/no-var-requires */
const { expect } = require('../mocha_helpers');
const { getConsoleApp } = require('./_helpers/console_app');
const { ConsoleClient } = require('./_helpers/console_client');

describe('Integration::Login', function () {
  this.timeout(30_000);

  let app: any;

  before(async function () {
    app = await getConsoleApp();
  });

  it('POST /login with valid credentials returns 302 and sets a signed session cookie', async function () {
    const client = new ConsoleClient({ baseUrl: app.baseUrl, secret: app.secret });
    const res = await client.login('test', 'test');

    expect(res.status).to.equal(302);

    // Signed cookie is now in the jar; decoding it yields a non-empty session id
    const sessionId = await client.sessionId();
    expect(sessionId).to.be.a('string');
    expect(sessionId).to.have.length.greaterThan(0);
    expect(sessionId).to.not.match(/^s:/); // prefix stripped by signedCookie()
  });
});
