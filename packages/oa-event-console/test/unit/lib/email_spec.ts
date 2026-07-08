//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const Errors = require('../../../lib/errors');
const email  = require('../../../lib/email');

describe('Unit::EventConsole::lib::email', function() {

  let sendStub: any;

  beforeEach(function() {
    sendStub = sinon.stub(email.transport, 'sendMailAsync').resolves({ messageId: 'm1', response: '250 OK' });
  });

  afterEach(function() { sinon.restore(); });

  describe('validation (before the SMTP transport is touched)', function() {
    it('rejects when email_options is missing', async function() {
      let threw: any;
      try { await email.send_email(null); } catch (e) { threw = e; }
      expect(threw).to.match(/Requires an email_options/);
      expect(sendStub.called).to.be.false;
    });

    it('rejects when subject is missing', async function() {
      let threw: any;
      try {
        await email.send_email({ to: 'a@b.co', text: 'hello' });
      } catch (e) { threw = e; }
      expect(threw).to.be.instanceof(Errors.ValidationError);
      expect(threw.message).to.match(/without \[subject:\]/);
      expect(sendStub.called).to.be.false;
    });

    it('rejects when to: is missing', async function() {
      let threw: any;
      try {
        await email.send_email({ subject: 'hi', text: 'hello' });
      } catch (e) { threw = e; }
      expect(threw).to.be.instanceof(Errors.ValidationError);
      expect(threw.message).to.match(/without \[to:\]/);
    });

    it('rejects when neither text nor html content is present', async function() {
      let threw: any;
      try {
        await email.send_email({ to: 'a@b.co', subject: 'hi' });
      } catch (e) { threw = e; }
      expect(threw).to.be.instanceof(Errors.ValidationError);
      expect(threw.message).to.match(/text or html content/);
    });
  });

  describe('delivery', function() {
    it('delegates to transport.sendMailAsync and resolves with the info object', async function() {
      const info = await email.send_email({ to: 'a@b.co', subject: 'hi', text: 'body' });
      expect(sendStub.calledOnce).to.be.true;
      expect(info.messageId).to.equal('m1');
    });

    it('renders the template.name.pug into the html field before sending', async function() {
      await email.send_email({
        to: 'a@b.co',
        subject: 'hi',
        template: {
          name: 'password-reset',
          values: {}
        }
      });
      const sentArg = sendStub.firstCall.args[0];
      expect(sentArg.html).to.be.a('string').and.have.length.greaterThan(0);
    });

    it('surfaces a rejected transport as the promise rejection', async function() {
      sendStub.rejects(new Error('smtp unreachable'));
      let threw: any;
      try {
        await email.send_email({ to: 'a@b.co', subject: 'hi', text: 'body' });
      } catch (e) { threw = e; }
      expect(threw).to.be.an('error');
      expect(threw.message).to.match(/smtp unreachable/);
    });
  });
});
