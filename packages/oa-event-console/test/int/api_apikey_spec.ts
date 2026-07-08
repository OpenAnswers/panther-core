//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:int:api:apikey');

const { expect, sinon, supertest } = require('../mocha_helpers');

const express = require('express');
const { ApiKey } = require('../../app/model/apikey');

// Mock API key data
const mockKeys = [
  { _id: 'abc123', apikey: 'testapikey1234567890abcdef12345678', username: 'admin1', created: new Date() },
  { _id: 'def456', apikey: 'testapikey0987654321fedcba87654321', username: 'admin1', created: new Date() },
];

// Test setup
let agent: any = null;
const path = '/api/apikey';
let sandbox: any;

before(function () {
  sandbox = sinon.createSandbox();

  const app = express();

  // Inject a fake authenticated admin user to bypass auth middleware
  app.use(function (req: any, _res: any, next: any) {
    req.user = { username: 'admin1', group: 'admin' };
    next();
  });

  // Mount the apikey router directly — DB calls are stubbed per-test
  app.use('/api/apikey', require('../../app/route/api/apikey'));

  agent = supertest(app);
});

afterEach(function () {
  sandbox.restore();
});

describe('ApiKey API', function () {
  it('reads all keys', function (done) {
    sandbox.stub(ApiKey, 'find').returns(Promise.resolve(mockKeys));

    agent.get(`${path}/read`).end(function (err: any, res: any) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.eql(200);
      expect(res.body).to.be.a('object');
      expect(res.body).to.contain.all.keys(['results', 'data']);
      expect(res.body.results).to.be.gt(0);
      expect(res.body.data).to.be.an('array');
      done();
    });
  });

  it('reads one of the keys', function (done) {
    const key = mockKeys[0];
    sandbox.stub(ApiKey, 'findOne').returns(Promise.resolve(key));

    agent.get(`${path}/read/${key.apikey}`).end(function (err: any, res: any) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.eql(200);
      expect(res.body).to.be.a('object');
      expect(res.body).to.contain.all.keys(['results', 'data']);
      expect(res.body.results).to.eql(1);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data[0].apikey).to.eql(key.apikey);
      done();
    });
  });

  it('returns a 404 for a missing key', function (done) {
    sandbox.stub(ApiKey, 'findOne').returns(Promise.resolve(null));

    agent.get(`${path}/read/nonexistentkey`).end(function (err: any, res: any) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.eql(404);
      expect(res.body).to.be.a('object');
      expect(res.body).to.contain.keys(['message']);
      done();
    });
  });

  it('finds one of the keys', function (done) {
    const key = mockKeys[0];
    sandbox.stub(ApiKey, 'findOne').returns(Promise.resolve(key));

    agent.get(`${path}/exists/${key.apikey}`).end(function (err: any, res: any) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.eql(200);
      expect(res.body).to.be.a('object');
      expect(res.body).to.contain.all.keys(['found']);
      expect(res.body.found).to.eql(true);
      done();
    });
  });

  it('doesnt find a fake key', function (done) {
    sandbox.stub(ApiKey, 'findOne').returns(Promise.resolve(null));

    agent.get(`${path}/exists/nonexistentkey`).end(function (err: any, res: any) {
      expect(err).to.equal(null);
      expect(res.statusCode).to.eql(200);
      expect(res.body).to.be.a('object');
      expect(res.body).to.contain.all.keys(['found']);
      expect(res.body.found).to.eql(false);
      done();
    });
  });
});
