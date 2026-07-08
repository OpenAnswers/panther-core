//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Journey 10 — ExpressServer REST endpoints.
//
// Drives the real ExpressServer class through its production start() path
// (setup + setup_socket_io, without binding a port) and hits the mounted
// /api/v1 routes with supertest.
//
// Settings endpoints are the only ones currently exposed by the API router:
//   GET  /api/v1/               — welcome message
//   GET  /api/v1/settings/      — list of { [key]: value } pairs
//   GET  /api/v1/settings/:key  — single { key: value } (or {} when missing)
//   POST /api/v1/settings/:key  — upsert; also bus-emits '/<key>'
//
// The POST body is urlencoded because setup() installs bodyParser.urlencoded
// but NOT bodyParser.json — mirroring production configuration exactly.

const { expect } = require('../mocha_helpers');
const { useMongo } = require('../helpers/mongo');

const request = require('supertest');

const { ExpressServer } = require('../../lib/express_server');
const bus = require('../../lib/ipcbus').internal_bus;

describe('[integration] ExpressServer /api/v1 journey', function () {
  this.timeout(30_000);
  useMongo(this);

  let es: any;
  let app: any;

  before(function () {
    es = new ExpressServer();
    // start() runs setup() + setup_socket_io() but does not call listen().
    // The express app is available on es.app for supertest.
    es.start();
    app = es.app;
  });

  afterEach(function () {
    bus.removeAllListeners();
  });

  describe('GET /api/v1/', function () {
    it('returns the welcome message and version', async function () {
      const res = await request(app).get('/api/v1/').expect(200);
      expect(res.body).to.eql({ message: 'welcome to the API', version: 'v1' });
    });
  });

  describe('GET /api/v1/settings/', function () {
    it('returns [] when no system settings are stored', async function () {
      const res = await request(app).get('/api/v1/settings/').expect(200);
      expect(res.body).to.eql([]);
    });

    it('returns an array of { [key]: value } objects once settings exist', async function () {
      await request(app).post('/api/v1/settings/alpha').type('form').send({ value: 'A' }).expect(200);
      await request(app).post('/api/v1/settings/bravo').type('form').send({ value: 'B' }).expect(200);

      const res = await request(app).get('/api/v1/settings/').expect(200);
      expect(res.body).to.be.an('array').with.lengthOf(2);
      expect(res.body).to.deep.include({ alpha: 'A' });
      expect(res.body).to.deep.include({ bravo: 'B' });
    });
  });

  describe('GET /api/v1/settings/:key', function () {
    it('returns { key: value } when the setting exists', async function () {
      await request(app).post('/api/v1/settings/delta').type('form').send({ value: 'D' }).expect(200);
      const res = await request(app).get('/api/v1/settings/delta').expect(200);
      expect(res.body).to.eql({ delta: 'D' });
    });

    it('returns {} when the setting is missing', async function () {
      const res = await request(app).get('/api/v1/settings/never-set').expect(200);
      expect(res.body).to.eql({});
    });
  });

  describe('POST /api/v1/settings/:key', function () {
    it('creates a new setting and echoes { key: value }', async function () {
      const res = await request(app)
        .post('/api/v1/settings/new_key')
        .type('form')
        .send({ value: 'created' })
        .expect(200);
      expect(res.body).to.eql({ new_key: 'created' });
    });

    it('updates an existing setting (upsert is idempotent on key)', async function () {
      await request(app).post('/api/v1/settings/update_key').type('form').send({ value: 'first' }).expect(200);
      const res = await request(app)
        .post('/api/v1/settings/update_key')
        .type('form')
        .send({ value: 'second' })
        .expect(200);
      expect(res.body).to.eql({ update_key: 'second' });

      // Verify read-through
      const read = await request(app).get('/api/v1/settings/update_key').expect(200);
      expect(read.body).to.eql({ update_key: 'second' });
    });

    it('emits the stored value on the internal bus as "/<key>"', async function () {
      let captured: any = null;
      bus.once('/bus_key', (value: any) => {
        captured = value;
      });

      await request(app).post('/api/v1/settings/bus_key').type('form').send({ value: 'hello' }).expect(200);

      expect(captured).to.equal('hello');
    });
  });
});
