import { test as setup } from '@playwright/test';
import fs from 'fs';
import yaml from 'js-yaml';
import { MongoClient } from 'mongodb';
import path from 'path';

const AUTH_FILE = 'test/e2e/.auth/user.json';
const RUNTIME_CONFIG = path.resolve('test/e2e/.runtime/config.e2e.yml');

async function resetLoginState() {
  const config = yaml.load(fs.readFileSync(RUNTIME_CONFIG, 'utf8')) as any;
  const client = new MongoClient(config.mongodb.uri);
  try {
    await client.connect();
    await client
      .db(config.mongodb.database)
      .collection('users')
      .updateMany({}, { $set: { failure_count: 0, last_login: null } });
  } finally {
    await client.close();
  }
}

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await resetLoginState();

  await page.goto('/login');
  await page.locator('#form-public-login').waitFor({ timeout: 5000 });
  await page.locator('input[name=username]').fill(process.env.TEST_USER ?? 'test');
  await page.locator('input[name=password]').fill(process.env.TEST_PASSWORD ?? 'test');
  await page.locator('#form-public-login button[type=submit]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
