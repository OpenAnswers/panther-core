//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const debug = require('debug')('oa:test:int:api');

const { expect, supertest } = require('../mocha_helpers');

const express = require('express');

// Test setup
let agent: any = null;

before(function () {
  const app = express();

  // Inject a fake authenticated user to bypass the API auth middleware
  app.use(function (req: any, _res: any, next: any) {
    req.user = { username: 'testuser', group: 'user' };
    next();
  });

  // The welcome route uses req.app.locals.name
  app.locals.name = 'Panther';

  // Mount the real API router — all tested endpoints return static data,
  // no database connection required
  app.use('/api', require('../../app/route/api'));

  agent = supertest(app);
});

describe('API response', function () {
  it('is an array for /actions', function (done) {
    agent
      .get('/api/actions')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data).to.be.an('array').and.to.eql(['discard', 'replace', 'set', 'stop', 'stop_rule_set']);
        done();
      });
  });

  it('recieves an object for an /actions_obj', function (done) {
    agent
      .get('/api/actions_obj')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data)
          .and.to.be.a('object')
          .and.to.have.keys('discard', 'replace', 'set', 'stop', 'stop_rule_set');
        done();
      });
  });

  it('is an object for /action', function (done) {
    agent
      .get('/api/action/set')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data)
          .to.be.a('object')
          .and.to.eql({
            description: 'Sets the value of a field to a specified value.',
            name: 'set',
            input: [
              {
                label: 'field',
                name: 'field',
                type: 'string',
              },
              {
                beforetext: 'to',
                name: 'value',
                label: 'value',
                type: 'string',
              },
            ],
          });
        done();
      });
  });

  it('errors for a missing /action', function (done) {
    agent
      .get('/api/action/blarg')
      .expect(404)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.message)
          .to.match(/Not found/)
          .and.to.match(/blarg/);
        done();
      });
  });

  it('is an array for /selects', function (done) {
    agent
      .get('/api/selects')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data)
          .and.to.be.a('array')
          .and.to.contain(
            'all',
            'none',
            'match',
            'equals',
            'field_exists',
            'field_missing',
            'starts_with',
            'ends_with',
            'less_than',
            'greater_than'
          );
        done();
      });
  });

  it('recieves an object for an /selects_obj', function (done) {
    agent
      .get('/api/selects_obj')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data)
          .and.to.be.a('object')
          .and.to.have.keys(
            'all',
            'ends_with',
            'equals',
            'field_exists',
            'field_missing',
            'greater_than',
            'less_than',
            'match',
            'none',
            'starts_with',
            'schedule'
          );
        done();
      });
  });

  it('recieve an array for /select/match', function (done) {
    agent
      .get('/api/select/match')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data).and.to.be.an('object').and.to.contain.keys(['name', 'friendly_name', 'help', 'input']);
        expect(res.body.data.name).to.eql('match');
        done();
      });
  });

  it('get and array of /options', function (done) {
    agent
      .get('/api/options')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data).and.to.be.an('array').and.to.contain('skip', 'debug');
        done();
      });
  });

  it('recieves an object for an /options_obj', function (done) {
    agent
      .get('/api/options_obj')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data).and.to.be.a('object').and.to.contain.keys('skip', 'debug');
        done();
      });
  });

  it('recieves an object for an /option', function (done) {
    agent
      .get('/api/option/unless')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data).and.to.be.a('object').and.to.eql({
          name: 'unless',
          input: [],
        });
        done();
      });
  });

  it('get and array of /fields', function (done) {
    agent
      .get('/api/fields')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data)
          .and.to.be.an('array')
          .and.to.eql([
            'identifier',
            'node',
            'severity',
            'summary',
            'tag',
            'group',
            'agent',
            'first_occurrence',
            'owner',
            'tally',
            'acknowledged',
            'last_occurrence',
            'state_change',
            'external_id',
          ]);
        done();
      });
  });

  it('recieves an object for an /field', function (done) {
    agent
      .get('/api/field/summary')
      .expect(200)
      .end(function (err: any, res: any) {
        if (err) return done(err);
        expect(res.body.data)
          .and.to.be.a('object')
          .and.to.contain.keys(['alias', 'help', 'label', 'name', 'priority', 'type', 'size', 'view']);
        expect(res.body.data.alias).to.eql('msg');
        done();
      });
  });
});
