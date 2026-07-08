import type { FullConfig } from '@playwright/test';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';

const { seedFixtures } = require('../helpers/mongo_fixture');

const DB_NAME = 'functest';
const RULES_DIR = path.resolve('test/fixture/rules');
const RUNTIME_DIR = path.resolve('test/e2e/.runtime');
const CONFIG_SRC = path.resolve('test/fixture/config.test.yml');

function copyRules() {
  for (const file of fs.readdirSync(RULES_DIR)) {
    if (file.endsWith('.fixture')) {
      fs.copyFileSync(path.join(RULES_DIR, file), path.join(RULES_DIR, file.replace('.fixture', '')));
    }
  }
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  // Start in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  (global as any).__e2e_mongod = mongod;

  const mongoUri = `${mongod.getUri()}${DB_NAME}`;

  // Seed collections (users, alerts, etc.)
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    await seedFixtures(client.db(DB_NAME));
  } finally {
    await client.close();
  }

  // Copy fixture rules files
  copyRules();

  // Write temp config pointing at the in-memory MongoDB
  const yaml = require('js-yaml');
  const configDoc = yaml.load(fs.readFileSync(CONFIG_SRC, 'utf8')) as any;
  configDoc.mongodb.uri = mongoUri;
  const tmpConfig = path.join(RUNTIME_DIR, 'config.e2e.yml');
  fs.writeFileSync(tmpConfig, yaml.dump(configDoc));

  // Set env var — inherited by the webServer subprocess
  process.env.OA_CONFIG_FILE = tmpConfig;
  process.env.NODE_ENV = 'test';
}
