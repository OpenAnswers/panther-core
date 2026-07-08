//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const { User } = require('../../../app/model/user');
const email = require('../../../lib/email');
const router = require('../../../app/route/password');

// Route destructures `send_email` at load time, so we can't stub email.send_email
// after the fact. Instead, stub the transport it delegates to.
function stubTransport() {
  return sinon.stub(email.transport, 'sendMailAsync').resolves({
    messageId: 'test-msg-id',
    response: '250 OK',
  });
}

describe('Unit::EventConsole::route::password', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('renders the password form at /', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/');
    expect(res.body._view).to.equal('password');
  });

  it('renders the password form at /request', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/request');
    expect(res.body._view).to.equal('password');
  });

  it('renders password-requested even when no user matches the email (prevents enumeration)', async function () {
    sinon.stub(User, 'findOne').resolves(null);
    const transportStub = stubTransport();
    const app = makeRouteApp(router);
    const res = await request(app).post('/requested').send({ email: 'nobody@example.com' });
    expect(res.body._view).to.equal('password-requested');
    // Enumeration-safety: response is identical to the success case AND no
    // email is actually sent for an unknown address.
    expect(transportStub.called).to.be.false;
  });

  it('generates a token, saves the user, and sends a reset email on the happy path', async function () {
    const token = 'a'.repeat(64);
    const user: any = {
      id: 'u1',
      email: 'alice@example.com',
      reset: {},
      generate_token() {
        this.reset = { token };
      },
      save() {
        return Promise.resolve(this);
      },
    };
    const generateSpy = sinon.spy(user, 'generate_token');
    const saveSpy = sinon.spy(user, 'save');
    sinon.stub(User, 'findOne').resolves(user);
    const transportStub = stubTransport();

    const app = makeRouteApp(router);
    const res = await request(app).post('/requested').send({ email: 'alice@example.com' });

    expect(res.body._view).to.equal('password-requested');
    expect(generateSpy.calledOnce).to.be.true;
    expect(saveSpy.calledOnce).to.be.true;
    expect(transportStub.calledOnce).to.be.true;
    const mailArg = transportStub.firstCall.args[0];
    expect(mailArg.to).to.equal('alice@example.com');
    expect(mailArg.html).to.be.a('string');
    // Reset URL should contain the generated token.
    expect(mailArg.html).to.contain(token);
  });

  it('resets the password, expires the token, and emails confirmation on POST /reset', async function () {
    const token = 'b'.repeat(64);
    const newPassword = 'NewPass123!';
    const user: any = {
      id: 'u2',
      email: 'bob@example.com',
      reset: { token },
      setPassword(p: string) {
        this.password = p;
        return Promise.resolve(this);
      },
      save() {
        return Promise.resolve(this);
      },
    };
    const setSpy = sinon.spy(user, 'setPassword');
    const saveSpy = sinon.spy(user, 'save');
    sinon.stub(User, 'findOne').resolves(user);
    const transportStub = stubTransport();

    const app = makeRouteApp(router);
    const res = await request(app).post('/reset').send({ token, password: newPassword, confirm: newPassword });

    expect(res.body._view).to.equal('password-reset-success');
    expect(setSpy.calledWith(newPassword)).to.be.true;
    expect(saveSpy.calledOnce).to.be.true;
    // Token should be expired — the saved user's reset.token must be gone.
    expect(user.reset.token).to.be.undefined;
    expect(user.reset.expires).to.be.an.instanceof(Date);
    expect(transportStub.calledOnce).to.be.true;
    expect(transportStub.firstCall.args[0].to).to.equal('bob@example.com');
  });

  it('renders password-requested when /reset is posted with an unknown but well-formed token', async function () {
    sinon.stub(User, 'findOne').resolves(null);
    const transportStub = stubTransport();
    const app = makeRouteApp(router);
    const res = await request(app)
      .post('/reset')
      .send({ token: 'c'.repeat(64), password: 'NewPass123!', confirm: 'NewPass123!' });
    expect(res.body._view).to.equal('password-requested');
    expect(transportStub.called).to.be.false;
  });

  it('renders password-reset form when GET /reset/:token finds a user', async function () {
    const token = 'd'.repeat(64);
    sinon.stub(User, 'findOne').resolves({ id: 'u3', reset: { token } });
    const app = makeRouteApp(router);
    const res = await request(app).get(`/reset/${token}`);
    expect(res.body._view).to.equal('password-reset');
    expect(res.body.token).to.equal(token);
  });

  it('renders the password form with an error for an invalid email', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).post('/requested').send({ email: 'not-an-email' });
    expect(res.body._view).to.equal('password');
    expect(res.body.error).to.match(/invalid/i);
  });

  it('rejects a malformed token on /reset/:token', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).get('/reset/short');
    expect(res.body._view).to.equal('password-requested');
    expect(res.body.messages.error).to.match(/Invalid token/i);
  });

  it('rejects a malformed token on POST /reset', async function () {
    const app = makeRouteApp(router);
    const res = await request(app).post('/reset').send({ token: 'short', password: 'Something1!' });
    expect(res.body._view).to.equal('password-requested');
    expect(res.body.messages.error).to.match(/Invalid token/i);
  });
});
