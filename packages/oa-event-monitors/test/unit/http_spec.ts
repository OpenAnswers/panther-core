//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:unit:http');
const { expect, supertest, sinon, nock } = require('../mocha_helpers');

// Disable logger for tests
process.env.NODE_ENV = 'test';

// Include the agent
const agent = require('../../lib/http');

// Set our mock url
const nock_server = 'http://localhost:41232';

// Create a spy to watch the event callbacks
const our_spy = sinon.spy();

// Controls which callback the spy fires, matching production behaviour:
// - 'create': calls cb (normal create path via sendAlert)
// - 'queue':  calls qcb (queue path via sendAlert)
// - 'discard': calls lcb (event discarded before sendAlert)
let event_cb_mode = 'create';

const event_cb = function (obj: any, cb: Function, qcb: Function, lcb: Function) {
  debug('event cb was called with', obj, !!cb, !!qcb, !!lcb);
  our_spy();
  if (event_cb_mode === 'create' && cb) {
    cb(null, { message: 'created', event: obj });
  } else if (event_cb_mode === 'queue' && qcb) {
    qcb(null, { message: 'queued' });
  } else if (event_cb_mode === 'discard' && lcb) {
    lcb(null, { status: 'discarded', message: 'Event discarded' });
  }
};

// Now create our http agent instance
const httpAgent = new agent.Agent({
  props: { apikeyserver: nock_server },
  eventCB: event_cb,
});

// But only setup the express app for supertest to use
httpAgent.setup();
const app = httpAgent.getApp();

// Setup the mock api-token service and responses
// persist() so mocks survive across multiple tests
nock(nock_server)
  .persist()

  .get('/api/apikey/read/uuid-blag-uuid')
  .reply(200, {
    results: 1,
    data: {
      _id: 'something',
      apikey: 'uuid-blag-uuid',
    },
  })

  .get('/api/apikey/read/uuid-bad-uuid')
  .reply(404, { message: 'Not found' })

  .get('/api/apikey/exists/uuid-blag-uuid')
  .reply(200, { found: true })

  .get('/api/apikey/exists/uuid-bad-uuid')
  .reply(200, { found: false });

describe('http', function () {
  beforeEach(function () {
    our_spy.resetHistory();
    event_cb_mode = 'create';
  });

  after(function () {
    nock.cleanAll();
  });

  describe('create', function () {
    it('accepts a good api-token and event', function (done: Function) {
      supertest(app)
        .post('/api/event/create')
        .set('X-Api-Token', 'uuid-blag-uuid')
        .set('Accept', 'application/json')
        .send({ event: { summary: 'test', node: 'what' } })
        .end(function (err: any, res: any) {
          expect(err).to.equal(null);
          expect(res).to.be.an('object');
          expect(res.statusCode).to.eql(200);
          expect(our_spy.calledOnce).to.equal(true);
          expect(res.body.status).to.equal('Created');
          done();
        });
    });

    it('rejects a bad api-token', function (done: Function) {
      supertest(app)
        .post('/api/event/create')
        .set('X-Api-Token', 'uuid-bad-uuid')
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

    it('responds with discard status when event is discarded', function (done: Function) {
      event_cb_mode = 'discard';
      supertest(app)
        .post('/api/event/create')
        .set('X-Api-Token', 'uuid-blag-uuid')
        .set('Accept', 'application/json')
        .send({ event: { summary: 'test', node: 'what' } })
        .end(function (err: any, res: any) {
          expect(err).to.equal(null);
          expect(res).to.be.an('object');
          expect(res.statusCode).to.eql(200);
          expect(our_spy.calledOnce).to.equal(true);
          expect(res.body.status).to.equal('discarded');
          done();
        });
    });
  });

  describe('queue', function () {
    it('queues an event with a good api-token', function (done: Function) {
      event_cb_mode = 'queue';
      supertest(app)
        .post('/api/event/queue')
        .set('X-Api-Token', 'uuid-blag-uuid')
        .set('Accept', 'application/json')
        .send({ event: { summary: 'test', node: 'what' } })
        .end(function (err: any, res: any) {
          expect(err).to.equal(null);
          expect(res).to.be.an('object');
          expect(res.statusCode).to.eql(200);
          expect(our_spy.calledOnce).to.equal(true);
          expect(res.body.status).to.equal('Queued');
          done();
        });
    });

    it('rejects a bad api-token', function (done: Function) {
      event_cb_mode = 'queue';
      supertest(app)
        .post('/api/event/queue')
        .set('X-Api-Token', 'uuid-bad-uuid')
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
  });
});
