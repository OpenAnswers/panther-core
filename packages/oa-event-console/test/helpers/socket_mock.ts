//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Strict mock for a socket.io `socket` used by SocketIO.route / route_return
// handlers. Every emit and every call to the broadcast helpers is captured by
// a sinon spy. In strict mode (the default), any emit with an event name not
// on the allow-list raises synchronously so stray events surface as a test
// failure rather than being silently ignored.
//
// Usage:
//
//   const socket = makeSocket({ id: 's-1', allow: ['activities::populate'] });
//   handler(socket, data);
//   expect(socket.emit.calledWith('activities::populate')).to.be.true;
//   expect(socket.lastEmit('activities::populate')).to.deep.equal([...docs]);

const sinon = require('sinon');

type SocketOptions = {
  id?: string;
  rooms?: Set<string>;
  allow?: string[];
  userId?: string;
  username?: string;
  email?: string;
  strict?: boolean;
  withEv?: boolean;
};

function makeSocket(opts: SocketOptions = {}) {
  const id = opts.id ?? 'sock-test';
  const rooms = opts.rooms ?? new Set<string>();
  const allow = new Set(opts.allow ?? []);
  const strict = opts.strict !== false;

  const emitSpy = sinon.spy();
  const broadcastSpy = sinon.spy();
  const joinSpy = sinon.spy((r: string) => {
    rooms.add(r);
  });
  const leaveSpy = sinon.spy((r: string) => {
    rooms.delete(r);
  });

  function guardEvent(ev: string) {
    if (!strict) return;
    if (!allow.has(ev)) {
      throw new Error(
        `socket_mock(${id}): unexpected emit '${ev}'. ` + `Add it to the allow-list or disable strict mode.`
      );
    }
  }

  const emit = function (ev: string, ...args: any[]) {
    guardEvent(ev);
    emitSpy(ev, ...args);
    return true;
  };
  // Preserve spy-like API on emit itself so tests can inspect it directly.
  (emit as any).spy = emitSpy;
  Object.defineProperty(emit, 'callCount', { get: () => emitSpy.callCount });
  Object.defineProperty(emit, 'calledWith', { value: (...a: any[]) => emitSpy.calledWith(...a) });
  Object.defineProperty(emit, 'firstCall', { get: () => emitSpy.firstCall });
  Object.defineProperty(emit, 'lastCall', { get: () => emitSpy.lastCall });
  Object.defineProperty(emit, 'args', { get: () => emitSpy.args });
  Object.defineProperty(emit, 'called', { get: () => emitSpy.called });

  const username = opts.username ?? opts.userId;
  const user = username
    ? { id: opts.userId ?? username, username, email: opts.email ?? `${username}@test` }
    : undefined;

  const socket: any = {
    id,
    rooms,
    request: { user },
    join: joinSpy,
    leave: leaveSpy,
    emit,
    broadcast: {
      emit: (ev: string, ...args: any[]) => {
        broadcastSpy(ev, ...args);
        return true;
      },
      to: (_room: string) => ({
        emit: (ev: string, ...args: any[]) => {
          broadcastSpy(ev, ...args);
          return true;
        },
      }),
    },
    to: (_room: string) => ({
      emit: (ev: string, ...args: any[]) => {
        broadcastSpy(ev, ...args);
        return true;
      },
    }),
    in: (_room: string) => ({
      emit: (ev: string, ...args: any[]) => {
        broadcastSpy(ev, ...args);
        return true;
      },
    }),
    _broadcastSpy: broadcastSpy,
    allow(...evs: string[]) {
      for (const e of evs) allow.add(e);
      return this;
    },
    lastEmit(ev?: string) {
      if (!ev) return emitSpy.lastCall?.args;
      for (let i = emitSpy.callCount - 1; i >= 0; i--) {
        if (emitSpy.getCall(i).args[0] === ev) return emitSpy.getCall(i).args.slice(1);
      }
      return undefined;
    },
    emitsFor(ev: string) {
      return emitSpy
        .getCalls()
        .filter((c: any) => c.args[0] === ev)
        .map((c: any) => c.args.slice(1));
    },
  };

  if (opts.withEv) {
    // Strict mode expects an allow-list; EvSocket emits 'message' for
    // info/warn/error/exception/success, so include it by default.
    if (strict && !allow.has('message')) allow.add('message');
    const { EvSocket } = require('../../lib/evsocket');
    socket.ev = new EvSocket(socket, {});
    // Do not call init() — that starts a ping setInterval we don't want in tests.
  }

  return socket;
}

module.exports = { makeSocket };
