//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const request = require('supertest');
const { makeRouteApp } = require('../../helpers/route_app');

const { User } = require('../../../app/model/user');
const { Filters } = require('../../../app/model/filters');
const { Severity } = require('../../../app/model/severity');

describe('Unit::EventConsole::route::console', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('redirects unauthenticated requests back to /', async function () {
    const router = require('../../../app/route/console');
    const app = makeRouteApp(router);
    const res = await request(app).get('/').redirects(0);
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal('/?redirectUrl=/');
  });

  it('aggregates users, filters, default filter and severities for render', async function () {
    sinon.stub(User, 'getUserList').resolves([{ username: 'alice' }]);
    sinon.stub(Severity, 'getSeveritiesWithId').resolves([{ value: 4, label: 'Minor' }]);

    // Filters.find is chainable: .sort().select().exec()
    const chain = {
      sort: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      exec: sinon.stub().resolves([{ _id: 'f1', name: 'main', default: true }]),
    };
    sinon.stub(Filters, 'find').returns(chain);
    sinon.stub(Filters, 'findOne').resolves({ _id: 'f1', name: 'main' });
    // Second bare Severity.find callback form.
    sinon.stub(Severity, 'find').callsFake((_q: any, cb: any) => {
      if (cb) cb(null, []);
      return { exec: () => Promise.resolve([]) };
    });

    const router = require('../../../app/route/console');
    const app = makeRouteApp(router, { user: { username: 'alice' } });
    const res = await request(app).get('/');

    expect(res.status).to.equal(200);
    expect(res.body._view).to.equal('console');
    expect(res.body.users).to.deep.equal([{ username: 'alice' }]);
    expect(res.body.filters).to.deep.equal([{ _id: 'f1', name: 'main', default: true }]);
    expect(res.body.severities).to.deep.equal([{ value: 4, label: 'Minor' }]);
  });
});
