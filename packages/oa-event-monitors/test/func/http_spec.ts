//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Needs environment variables set to talk to an instance.
//
//     PANTHER_API_SERVICE=http://localhost:3001
//     PANTHER_API_TOKEN=example-http-api-token
//     PANTHER_TEST_TOKEN=example-test-token

const debug = require('debug')('oa:test:unit:http');
const { expect, supertest, sinon, nock } = require('../mocha_helpers');

// Disable logger for tests
process.env.NODE_ENV = 'test';

// Include the agent
const agent = require('../../lib/http');

// Set our url, this is a real system for the functional tests
const token_server = process.env.PANTHER_API_SERVICE || 'http://localhost:3001';
let token_key = process.env.PANTHER_API_TOKEN || '';
token_key = process.env.PANTHER_TEST_TOKEN || '';

// Create a spy to watch the event callbacks
const our_spy = sinon.spy();

// Create a function to emulate the event callbacks,
// and call our spy
const event_cb = function (obj: any, cb: Function, qcb: Function, lcb: Function) {
  debug('event cb was called with', obj, !!cb, !!qcb, !!lcb);
  our_spy();
  if (cb) {
    cb(null, { message: 'created', event: obj });
  }
  if (qcb) {
    qcb(null, { message: 'queued' });
  }
  if (lcb) {
    lcb(null, { message: 'queued' });
  }
};

// Now create our http agent instance
const httpAgent = new agent.Agent({
  props: { apikeyserver: token_server },
  eventCB: event_cb,
});

// But only setup the express app for supertest to use
httpAgent.setup();
const app = httpAgent.getApp();

describe('http', function () {
  beforeEach(function () {
    our_spy.resetHistory();
  });

  it('accepts a good api-token and event', function (done: Function) {
    supertest(app)
      .post('/api/event/create')
      .set('X-Api-Token', token_key)
      .set('Accept', 'application/json')
      .send({ event: { summary: 'test', node: 'what' } })
      .end(function (err: any, res: any) {
        expect(err).to.equal(null);
        expect(res).to.be.an('object');
        expect(res.statusCode).to.eql(200);
        expect(our_spy.called).to.be.ok;
        done();
      });
  });

  it('rejects a bad api-token', function (done: Function) {
    supertest(app)
      .post('/api/event/create')
      .set('X-Api-Token', 'what')
      .set('Accept', 'application/json')
      .send({ event: { summary: 'test', node: 'what' } })
      .end(function (err: any, res: any) {
        expect(err).to.equal(null);
        expect(res).to.be.an('object');
        expect(res.statusCode).to.eql(401);
        expect(our_spy.called).to.equal(false);
        done();
      });
  });

  describe('api', function () {
    it('boots', function () {
      expect(true).to.be.ok;
    });
  });
});
