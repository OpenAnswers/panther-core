//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// The settings handlers proxy HTTP to the event-server; their bodies are
// captured `needle(...)` calls, so unit-testing the HTTP path would require
// either an in-test HTTP server or the handler to delegate through an
// overridable helper. Neither is worth adding just for coverage — those
// paths are better exercised by func/int tests.
//
// This spec covers the non-HTTP branches and route registration.

const { expect } = require('../../mocha_helpers');
const { makeSocket } = require('../../helpers/socket_mock');
const { getHandler } = require('../../helpers/load_handler');

const { SocketIO } = require('../../../lib/socketio');
require('../../../app/socketio/settings');

describe('Unit::EventConsole::socketio::settings', function () {
  const write = getHandler('settings::server::write', 'route_return');

  it('registers the read and write routes', function () {
    expect(SocketIO.client_return_routes['settings::server::read']).to.exist;
    expect(SocketIO.client_return_routes['settings::server::write']).to.exist;
  });

  describe('settings::server::write', function () {
    it('resolves with an empty object when request has no "tracking" key', async function () {
      const socket = makeSocket();
      const result = await write(socket, { other: 1 });
      expect(result).to.deep.equal({});
    });

    it('resolves with an empty object for missing/empty request', async function () {
      const socket = makeSocket();
      expect(await write(socket, {})).to.deep.equal({});
    });
  });
});
