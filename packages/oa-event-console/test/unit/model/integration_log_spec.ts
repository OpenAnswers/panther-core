//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { IntegrationLog } = require('../../../app/model/integration_log');

describe('Unit::EventConsole::model::IntegrationLog', function () {
  useMongo(this);

  it('defaults time and expire dates on save', async function () {
    const doc = await IntegrationLog.create({
      initiatior: 'alice',
      type: 'http',
      request: 'GET /',
      response: '200 OK',
    });
    expect(doc.time).to.be.instanceof(Date);
    expect(doc.expire).to.be.instanceof(Date);
    expect(doc.expire.getTime()).to.be.greaterThan(doc.time.getTime());
  });

  it('rejects missing required fields', async function () {
    let err: any = null;
    try {
      await IntegrationLog.create({});
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.include.all.keys('initiatior', 'type', 'request', 'response');
  });
});
