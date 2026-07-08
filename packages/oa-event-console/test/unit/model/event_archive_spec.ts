//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { EventArchive } = require('../../../app/model/event_archive');

describe('Unit::EventConsole::model::EventArchive', function () {
  useMongo(this);

  it('stores an archived event with an expire ~24h in the future', async function () {
    const before = Date.now();
    const doc = await EventArchive.create({
      event: { summary: 'was here', severity: 3 },
      operation: 'clear',
    });
    expect(doc.event.summary).to.equal('was here');
    const delta = doc.expire.getTime() - before;
    // 24h = 86_400_000 ms. Allow a generous window.
    expect(delta).to.be.within(23 * 3600 * 1000, 25 * 3600 * 1000);
  });

  it('rejects a save missing event or operation', async function () {
    let err: any = null;
    try {
      await EventArchive.create({});
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.include.all.keys('event', 'operation');
  });
});
