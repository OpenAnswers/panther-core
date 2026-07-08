//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { useMongo } = require('../../helpers/mongo');
const { Activity } = require('../../../app/model/activity');
const { SocketIO } = require('../../../lib/socketio');

describe('Unit::EventConsole::model::Activity', function () {
  useMongo(this);

  afterEach(function () {
    sinon.restore();
  });

  it('pre-save sets time when missing and rejects when required fields are absent', async function () {
    let err: any = null;
    try {
      await Activity.create({});
    } catch (e) {
      err = e;
    }
    expect(err).to.not.equal(null);
    expect(err.errors).to.include.all.keys('username', 'category', 'type');
  });

  it('persists with an auto-set time', async function () {
    const before = Date.now();
    const doc = await Activity.create({
      username: 'alice',
      category: 'user',
      type: 'login',
    });
    expect(doc.time).to.be.instanceof(Date);
    expect(doc.time.getTime()).to.be.at.least(before);
  });

  it('post-save emits the document on the "activities" room when io is wired', async function () {
    const emit = sinon.stub();
    const to = sinon.stub().returns({ emit });
    sinon.stub(SocketIO, 'io').value({ to });

    const doc = await Activity.create({
      username: 'alice',
      category: 'user',
      type: 'login',
    });

    // Find the emit for this specific doc. We don't assert on call ordering
    // because mongoose post-save hooks from prior tests can fire between the
    // stub install and our create() when those hooks were delayed past the
    // save's await boundary.
    const our_call = emit
      .getCalls()
      .find(c => c.args[0] === 'activity' && c.args[1]?._id?.toString() === doc._id.toString());
    expect(our_call, 'no emit observed for the created doc').to.exist;
    expect(to.calledWith('activities')).to.be.true;
  });

  it('post-save is a no-op when SocketIO.io is not available', async function () {
    sinon.stub(SocketIO, 'io').value(undefined);
    const doc = await Activity.create({
      username: 'alice',
      category: 'user',
      type: 'login',
    });
    expect(doc).to.have.property('_id');
  });
});
