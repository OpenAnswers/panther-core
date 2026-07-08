//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { Integration } = require('../../../app/model/integration');

describe('Unit::EventConsole::model::Integration', function () {
  useMongo(this);

  it('populates created/modified defaults on save', async function () {
    const before = Date.now();
    const doc = await Integration.create({
      type: 'http',
      name: 'test',
      definition: { url: 'http://example' },
    });
    expect(doc.created).to.be.instanceof(Date);
    expect(doc.modified).to.be.instanceof(Date);
    expect(doc.created.getTime()).to.be.at.least(before);
  });

  it('rejects a save missing the required type', async function () {
    let err: any = null;
    try {
      await Integration.create({ name: 'n', definition: {} });
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.have.property('type');
  });

  it('rejects a save missing the required name', async function () {
    let err: any = null;
    try {
      await Integration.create({ type: 'http', definition: {} });
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.have.property('name');
  });

  it('rejects a save missing the required definition', async function () {
    let err: any = null;
    try {
      await Integration.create({ type: 'http', name: 'n' });
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.have.property('definition');
  });
});
