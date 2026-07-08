//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Lazy-boot the full oa-event-console against an in-memory MongoDB on an
// ephemeral HTTP port, with the functest BSON fixtures restored and the
// rules fixture files materialised. Used by integration specs that need a
// real listening server (socket.io) or the full middleware chain.
//
// One boot per process; repeat callers get the cached instance. The harness
// stops the mongo child process on `process.exit` — `exit: true` in mocharc
// means mocha exits the process after the run, so a root `after` would be
// skipped.
//
// Config singleton handling:
//   Several lib modules (lib/socketio, app/socketio/event_rules, etc.) cache
//   the default Config instance at their own module-load time via
//   `get_instance()`. If another integration spec file has already pulled
//   those modules in before this helper runs, the stock `load_file` would
//   replace `instances['default']` with a new object and leave those cached
//   references stale — in particular ExpressApp attaches the MongoStore onto
//   the config object it holds, which passport-socketio then can't see.
//
//   Fix: patch `load_file` to MUTATE the existing singleton in place and
//   return it, so every cached reference sees the same populated object
//   including runtime additions like `session.store`.

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

const { seedFixtures, resetUserFailureCount } = require('../../helpers/mongo_fixture');

const DB_NAME = 'functest';
const RULES_DIR = path.resolve('test/fixture/rules');
const CONFIG_SRC = path.resolve('test/fixture/config.test.yml');
const RUNTIME_DIR = path.resolve('test/int/.runtime');
const TMP_CONFIG = path.join(RUNTIME_DIR, 'config.int.yml');

export type ConsoleAppHandle = {
  app: any;
  server: any;
  baseUrl: string;
  secret: string;
  sessionKey: string;
  mongoUri: string;
  close: () => Promise<void>;
};

let bootPromise: Promise<ConsoleAppHandle> | null = null;
let mongod: any = null;
let handle: ConsoleAppHandle | null = null;

function copyRuleFixtures() {
  for (const file of fs.readdirSync(RULES_DIR)) {
    if (file.endsWith('.fixture')) {
      fs.copyFileSync(path.join(RULES_DIR, file), path.join(RULES_DIR, file.replace('.fixture', '')));
    }
  }
}

function patchLoadFileToMutate(): void {
  const configModule = require('../../../lib/config');
  configModule.load_file = function (configPath: string, name?: string) {
    const yaml = require('js-yaml');
    const doc: any = yaml.load(fs.readFileSync(path.resolve(configPath), 'utf8'));
    doc.config_file = configPath;
    const fresh: any = new configModule.Config(name ?? 'default', doc);
    const existing: any = configModule.get_instance(name ?? 'default');
    for (const key of Object.keys(fresh)) {
      existing[key] = fresh[key];
    }
    return existing;
  };
}

async function boot(): Promise<ConsoleAppHandle> {
  const yaml = require('js-yaml');

  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  // 1. Mongo memory + seed data
  mongod = await MongoMemoryServer.create();
  const mongoUri = `${mongod.getUri()}${DB_NAME}`;

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    await seedFixtures(db);
    await resetUserFailureCount(db);
  } finally {
    await client.close();
  }

  // 2. Rules fixtures materialised beside the config file
  copyRuleFixtures();

  // 3. Runtime config with memory mongo + ephemeral http port
  const doc: any = yaml.load(fs.readFileSync(CONFIG_SRC, 'utf8'));
  doc.mongodb = { ...(doc.mongodb ?? {}), uri: mongoUri };
  doc.http = { ...(doc.http ?? {}), port: 0 };
  fs.writeFileSync(TMP_CONFIG, yaml.dump(doc));

  // 4. Patch load_file BEFORE requiring app/index so its module-level
  //    `load_file(OA_CONFIG_FILE, 'default')` mutates the singleton instead
  //    of replacing it.
  patchLoadFileToMutate();

  process.env.OA_CONFIG_FILE = TMP_CONFIG;
  process.env.NODE_ENV = 'test';

  // 5. Boot Express + socket.io — returns once `express.serve()` finishes binding
  const appModule = require('../../../app/index');
  const { server, app, port } = await new Promise<any>((resolve, reject) => {
    appModule.start((err: any, expressApp: any) => {
      if (err) return reject(err);
      const { SocketIO } = require('../../../lib/socketio');
      const httpServer = SocketIO.app?.http;
      if (!httpServer) return reject(new Error('Could not locate booted http.Server via SocketIO.app.http'));
      resolve({ server: httpServer, app: expressApp, port: httpServer.address().port });
    });
  });

  const configModule = require('../../../lib/config');
  const secret = configModule.get_instance('default').session.secret;
  const sessionKey = 'panther.sid';
  const baseUrl = `http://127.0.0.1:${port}`;

  const close = async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    if (mongod) {
      try {
        await mongod.stop();
      } catch (_) {
        /* best effort */
      }
    }
  };

  handle = { app, server, baseUrl, secret, sessionKey, mongoUri, close };
  return handle;
}

export function getConsoleApp(): Promise<ConsoleAppHandle> {
  if (!bootPromise) bootPromise = boot();
  return bootPromise;
}

// Best-effort sync cleanup on process exit. Mocha's `exit: true` terminates
// the process after the run; the mongod child needs to be asked to stop so it
// doesn't linger beyond the mocha process.
process.on('exit', () => {
  if (mongod) {
    try {
      mongod.stop({ doCleanup: true, force: true });
    } catch (_) {
      /* best effort */
    }
  }
});

module.exports = { getConsoleApp };
