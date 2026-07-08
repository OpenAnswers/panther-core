//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:func:api:events');

const { expect, supertest } = require('../mocha_helpers');
const { random_string } = require('oa-helpers');

// Test setup
let app: any = null;
const path = '/api/event/';

xdescribe('Event API', function () {
  // Deferred: requiring ../mocha_app at module load calls lib/config.load_file
  // which replaces the default Config singleton. That breaks other int specs
  // that booted the app via test/int/_helpers/console_app (their cached
  // socketio reference is left pointing at the orphaned instance). Since this
  // suite is xdescribe'd and never actually runs, keep the require inside the
  // before hook so the module's side effects stay dormant.
  let app_up: any;

  before(function (done) {
    this.timeout(20000);
    app_up = require('../mocha_app');
    app_up(function (err: any, result: any) {
      if (err) {
        return done(err);
      }
      app = result;
      done();
    });
  });

  let id: any = null;

  xit('creates an object for an /event', function (done) {
    const str = random_string(8);

    const event = {
      node: 'node',
      severity: 3,
      summary: `test ${str}`,
    };

    supertest(app)
      .post(`${path}/create`)
      .send(event)
      .end(function (err: any, res: any) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.eql(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.contain.all.keys(['event', 'message']);
        expect(res.body.message).to.match(/^Saved new alert: /);
        expect(res.body.event.id).to.be.a('string');
        id = res.body.event.id;
        done();
      });
  });

  it('recieves the created object for an /events/read', function (done) {
    supertest(app)
      .get(`${path}s/read`)
      .end(function (err: any, res: any) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.eql(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.contain.keys(['results', 'events']);
        expect(res.body.events).to.be.an('array');
        expect(res.body.results).to.be.gt(0);
        done();
      });
  });

  it('recieves the created object for an /event/read/:id', function (done) {
    supertest(app)
      .get(`${path}/read/${id}`)
      .end(function (err: any, res: any) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.eql(200);
        expect(res.body).to.be.an('object');
        expect(res.body.event).to.be.an('object');
        expect(res.body.event).to.contain.all.keys(['id', 'node', 'severity', 'summary', 'identifier']);
        done();
      });
  });

  it('deletes the created object /event/delete/:id', function (done) {
    supertest(app)
      .delete(`${path}/delete/${id}`)
      .end(function (err: any, res: any) {
        expect(err).to.equal(null);
        expect(res.statusCode).to.eql(200);
        expect(res.body).to.be.an('object');
        expect(res.body.result).to.be.an('object');
        expect(res.body.result).to.contain.all.keys(['ok', 'n']);
        expect(res.body.result.ok).to.eql(1);
        expect(res.body.result.n).to.eql(1);
        done();
      });
  });
});

xdescribe('errors', function () {
  it('400 a bad event id /event', function (done) {
    supertest(app)
      .get(`${path}/read/4-13543543151`)
      .end(function (err: any, res: any) {
        expect(res.statusCode).to.eql(400);
        expect(res.type).to.eql('application/json');
        expect(res.body).to.be.an('object');
        expect(res.body).to.contain.all.keys(['message']);
        expect(res.body.message).to.match(/Invalid event id/);
        done();
      });
  });

  it('404 a missing event id /event', function (done) {
    supertest(app)
      .get(`${path}/read/462b75e75c53ecb0164b66d3`)
      .end(function (err: any, res: any) {
        expect(res.statusCode).to.eql(404);
        expect(res.type).to.eql('application/json');
        expect(res.body).to.be.an('object');
        expect(res.body).to.contain.all.keys(['message']);
        expect(res.body.message).to.match(/Not Found/);
        done();
      });
  });
});
