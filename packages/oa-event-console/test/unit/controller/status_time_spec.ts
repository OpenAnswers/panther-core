//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// The status-time controller is a file watcher that emits 'time_update' via
// SocketIO whenever a watched directory changes. In production it early-exits.
// We verify both behaviours without actually watching the filesystem.

const { expect, sinon } = require('../../mocha_helpers');
const fs = require('fs');
const statusTime = require('../../../app/controller/status-time');

describe('Unit::EventConsole::controller::status-time', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('is a no-op in production mode (returns without setting up watchers)', function () {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const watchSpy = sinon.spy(fs, 'watch');
    try {
      const result = statusTime({ locals: {} });
      expect(result).to.be.undefined;
      expect(watchSpy.called).to.be.false;
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('in non-production mode wires fs.watch on the configured directories', function () {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const fakeWatcher = { close: sinon.stub() };
    const watchStub = sinon.stub(fs, 'watch').returns(fakeWatcher as any);
    // walk() uses statSync+readdirSync; short-circuit to no sub-directories.
    sinon.stub(fs, 'readdirSync').returns([]);

    try {
      const result = statusTime({ locals: {} });
      expect(Array.isArray(result)).to.be.true;
      // At least one watcher registered (for Path.views/Path.assets).
      expect(watchStub.callCount).to.be.greaterThan(0);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
