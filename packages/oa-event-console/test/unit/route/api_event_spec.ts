//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const mongoose = require('mongoose');
const { Mongoose } = require('../../../lib/mongoose');
const router = require('../../../app/route/api/event');

describe('Unit::EventConsole::route::api::event', function () {
  useMongo(this);

  afterEach(function () {
    sinon.restore();
  });

  it('returns 400 for a non-ObjectId param', async function () {
    const app = makeRouteApp(router, { user: { username: 'svc', group: 'admin' } });
    const res = await request(app).get('/read/not-an-id');
    expect(res.status).to.equal(400);
    expect(res.body.message).to.match(/Invalid event id/i);
  });

  it('returns 404 when the event does not exist', async function () {
    sinon.stub(Mongoose, 'alerts').value({
      findOne: () => Promise.resolve(null),
      deleteOne: () => Promise.resolve({ acknowledged: true, deletedCount: 0 }),
    });
    const id = new mongoose.Types.ObjectId().toString();
    const app = makeRouteApp(router, { user: { username: 'svc', group: 'admin' } });
    const res = await request(app).get(`/read/${id}`);
    expect(res.status).to.equal(404);
  });

  it('returns the document remapped with id on a successful read', async function () {
    const oid = new mongoose.Types.ObjectId();
    sinon.stub(Mongoose, 'alerts').value({
      findOne: () => Promise.resolve({ _id: oid, summary: 'hit' }),
    });
    const app = makeRouteApp(router, { user: { username: 'svc', group: 'admin' } });
    const res = await request(app).get(`/read/${oid.toString()}`);
    expect(res.status).to.equal(200);
    expect(res.body.event.id).to.equal(oid.toString());
    expect(res.body.event.summary).to.equal('hit');
  });

  it('deletes and returns the mongo result', async function () {
    const oid = new mongoose.Types.ObjectId();
    sinon.stub(Mongoose, 'alerts').value({
      deleteOne: () => Promise.resolve({ acknowledged: true, deletedCount: 1 }),
    });
    const app = makeRouteApp(router, { user: { username: 'svc', group: 'admin' } });
    const res = await request(app).delete(`/delete/${oid.toString()}`);
    expect(res.status).to.equal(200);
    expect(res.body.result.deletedCount).to.equal(1);
    expect(res.body.result.acknowledged).to.equal(true);
  });

  it('returns a QueryError when the delete is not acknowledged', async function () {
    const oid = new mongoose.Types.ObjectId();
    sinon.stub(Mongoose, 'alerts').value({
      deleteOne: () => Promise.resolve({ acknowledged: false, deletedCount: 0 }),
    });
    const app = makeRouteApp(router, { user: { username: 'svc', group: 'admin' } });
    const res = await request(app).delete(`/delete/${oid.toString()}`);
    expect(res.status).to.be.oneOf([400, 500]);
  });
});
