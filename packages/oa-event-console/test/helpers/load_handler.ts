//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Pulls a registered socketio handler out of the SocketIO class.
//
// Handlers register themselves at require-time via SocketIO.route(name, fn) or
// SocketIO.route_return(name, fn). The spec should require its handler module
// itself (so path resolution is scoped to the spec file), then call
// getHandler(name) to get the raw function for direct invocation.

const { SocketIO } = require('../../lib/socketio');

type HandlerKind = 'route' | 'route_return';

function getHandler(name: string, kind: HandlerKind = 'route') {
  if (kind === 'route') {
    const fn = SocketIO.client_routes[name];
    if (!fn) throw new Error(`getHandler: no route '${name}' registered on SocketIO`);
    return fn;
  }
  const entry = SocketIO.client_return_routes[name];
  if (!entry) throw new Error(`getHandler: no route_return '${name}' registered on SocketIO`);
  return entry.function;
}

module.exports = { getHandler };
