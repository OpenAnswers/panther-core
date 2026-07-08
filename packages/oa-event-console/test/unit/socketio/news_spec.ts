//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

const { expect, sinon } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { NewsRequest } = require('../../../app/controller/news');
require('../../../app/socketio/news');

describe('Unit::EventConsole::socketio::news', function () {
  const news_read = getHandler('news::read', 'route_return');

  afterEach(function () {
    sinon.restore();
  });

  it('returns { data: <items> } from NewsRequest.fetch_news', async function () {
    const items = [{ title: 'a' }, { title: 'b' }];
    sinon.stub(NewsRequest, 'fetch_news').resolves(items);

    const socket = makeSocket();
    const result = await news_read(socket, {});

    expect(result).to.deep.equal({ data: items });
  });

  it('propagates errors from fetch_news', async function () {
    const err = new Error('network down');
    sinon.stub(NewsRequest, 'fetch_news').rejects(err);

    const socket = makeSocket();
    try {
      await news_read(socket, {});
      throw new Error('expected rejection');
    } catch (e: any) {
      expect(e).to.equal(err);
    }
  });
});
