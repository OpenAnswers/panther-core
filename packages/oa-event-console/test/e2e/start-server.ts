// Run by Playwright webServer: tsx test/e2e/start-server.ts
// Manages its own MongoDB lifecycle so nothing crosses process boundaries.
// Uses require() throughout — tsx compiles this as CJS matching the app.

/* eslint-disable @typescript-eslint/no-var-requires */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const http = require('http');

const { seedFixtures, resetUserFailureCount } = require('../helpers/mongo_fixture');

const DB_NAME = 'functest';
const RULES_DIR = path.resolve('test/fixture/rules');
const CONFIG_SRC = path.resolve('test/fixture/config.test.yml');
const TMP_CONFIG = path.resolve('test/e2e/.runtime/config.e2e.yml');

async function main() {
  // 1. Start in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const mongoUri = `${mongod.getUri()}${DB_NAME}`;
  console.log('[e2e] MongoDB ready at', mongoUri);

  // 2. Seed collections (users, alerts, etc.)
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(DB_NAME);
  const seeded = await seedFixtures(db);
  for (const [coll, count] of Object.entries(seeded)) {
    console.log(`[e2e] Seeded ${count} docs → ${coll}`);
  }
  // Reset failure_count for all users so repeated UI-mode runs don't lock accounts
  await resetUserFailureCount(db);

  await client.close();

  // 3. Copy fixture rules files
  for (const file of fs.readdirSync(RULES_DIR)) {
    if (file.endsWith('.fixture')) {
      fs.copyFileSync(path.join(RULES_DIR, file), path.join(RULES_DIR, file.replace('.fixture', '')));
    }
  }

  // 4. Write temp config pointing at the in-memory MongoDB
  const yaml = require('js-yaml');
  fs.mkdirSync(path.dirname(TMP_CONFIG), { recursive: true });
  const configDoc = yaml.load(fs.readFileSync(CONFIG_SRC, 'utf8'));
  configDoc.mongodb.uri = mongoUri;
  fs.writeFileSync(TMP_CONFIG, yaml.dump(configDoc));

  // 5. Start a minimal event-server stub on port 4002
  //    The console emits settings::server::read via socket, which does an HTTP GET
  //    to http://localhost:4002/api/v1/settings/tracking. Without this stub the
  //    needle call throws ECONNREFUSED and the socket handler rethrows it.
  const EVENT_SERVER_PORT = 4002;
  const eventServerStub = http.createServer((req: any, res: any) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tracking: 0 }));
  });
  await new Promise<void>(resolve => eventServerStub.listen(EVENT_SERVER_PORT, resolve));
  console.log('[e2e] Event-server stub listening on port', EVENT_SERVER_PORT);

  // 6. Tell app/index.ts which config to use
  process.env.OA_CONFIG_FILE = TMP_CONFIG;
  process.env.NODE_ENV = 'test';

  // 7. Start Express — keeps the process alive until Playwright sends SIGTERM
  const app = require('../../app/index');
  app.start((err: Error | null) => {
    if (err) {
      console.error('[e2e] Server start error:', err);
      process.exit(1);
    }
    console.log('[e2e] Server ready');
  });

  const shutdown = async () => {
    console.log('[e2e] Shutting down...');
    eventServerStub.close();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('[e2e] Fatal error:', err);
  process.exit(1);
});
