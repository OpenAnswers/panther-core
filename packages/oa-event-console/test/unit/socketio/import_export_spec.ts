//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { ImportExport } = require('../../../lib/import-export');
const { Activities } = require('../../../lib/activities');
const Errors = require('../../../lib/errors');
require('../../../app/socketio/import-export');

describe('Unit::EventConsole::socketio::import-export', function () {
  const activate = getHandler('event_rules::activate', 'route_return');

  afterEach(function () {
    sinon.restore();
  });

  it('rejects with ValidationError when commit_msg contains disallowed characters', async function () {
    // git_commit_msg_schema allows [0-9a-zA-Z space -+$!#@]; colon is rejected.
    const socket = makeSocket({ userId: 'tester', withEv: true });
    let threw: any;
    try {
      await activate(socket, { filename: 'foo.yml', commit_msg: 'chore: bad' });
    } catch (e) {
      threw = e;
    }
    expect(threw).to.be.instanceof(Errors.ValidationError);
    expect(threw.message).to.match(/commit message/i);
  });

  it('rejects with ValidationError when filename sanitises to empty', async function () {
    const socket = makeSocket({ userId: 'tester', withEv: true });
    let threw: any;
    try {
      await activate(socket, { filename: '../../', commit_msg: 'valid commit msg' });
    } catch (e) {
      threw = e;
    }
    expect(threw).to.be.instanceof(Errors.ValidationError);
    expect(threw.message).to.match(/filename/i);
  });

  it('calls ImportExport.switch_to_imported with sanitised filename and records an activity', async function () {
    const switchStub = sinon.stub(ImportExport, 'switch_to_imported').resolves({});
    const activityStub = sinon.stub(Activities, 'store');

    const socket = makeSocket({ userId: 'alice', withEv: true });
    const result = await activate(socket, {
      filename: 'my rules.yml',
      commit_msg: 'add rule to feed',
    });

    expect(switchStub.calledOnce).to.be.true;
    const [filePath, opts] = switchStub.firstCall.args;
    expect(filePath).to.match(/my rules\.yml$/);
    expect(opts.user_name).to.equal('alice');
    expect(opts.commit_msg).to.equal('add rule to feed');

    expect(activityStub.calledOnce).to.be.true;
    expect(activityStub.firstCall.args.slice(0, 3)).to.deep.equal(['rules', 'imported', 'alice']);

    expect(result.filename).to.match(/my rules\.yml/);
  });
});
