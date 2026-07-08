//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Shared mongodb-memory-server for integration tests that touch real mongoose
// models. Ported from packages/oa-event-console/test/helpers/mongo.ts to keep
// the same pattern across the monorepo.
//
// Usage in a spec:
//
//   const { useMongo } = require('../helpers/mongo');
//
//   describe('...', function() {
//     this.timeout(30000);
//     useMongo(this);
//     // mongoose is connected for the duration of this describe block
//   });
//
// The server is booted lazily on first use and reused for the rest of the
// process. Each describe that calls useMongo clears all collections in its
// own beforeEach so specs don't leak documents into each other.

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod: any = null;
let connecting: Promise<void> | null = null;

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (connecting) return connecting;

  connecting = (async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  })();

  try {
    await connecting;
  } finally {
    connecting = null;
  }
}

async function clearCollections() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
}

function useMongo(suite: any) {
  suite.beforeAll?.(() => ensureConnected());
  // mocha: before/beforeEach on the suite context
  if (typeof suite.timeout === 'function') suite.timeout(30000);

  // Attach hooks on the current describe
  before(async function () {
    this.timeout(30000);
    await ensureConnected();
  });

  beforeEach(async function () {
    await clearCollections();
  });
}

// Tear the server down when the mocha process exits. `exit: true` in .mocharc
// means process exit follows the run, so an async `after` hook at the root
// would be skipped — process.on('exit') is sync-only but sufficient to stop
// the in-memory server's child process.
process.on('exit', () => {
  if (mongod) {
    try {
      mongod.stop({ doCleanup: true, force: true });
    } catch (_) {
      /* best effort */
    }
  }
});

function getMongoUri() {
  return mongod ? mongod.getUri() : null;
}

module.exports = { useMongo, ensureConnected, clearCollections, getMongoUri };
