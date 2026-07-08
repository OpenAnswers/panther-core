import type { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig) {
  const mongod = (global as any).__e2e_mongod;
  if (mongod) await mongod.stop();
}
