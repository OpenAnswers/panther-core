//
// Copyright (C) 2026, Open Answers Ltd https://www.openanswers.co.uk/
// All rights reserved.
// This file is subject to the terms and conditions defined in the Software License Agreement.
//

// Programmatic functest seed data.
//
// Used by the e2e harness (test/e2e/start-server.ts, test/e2e/global-setup.ts)
// and the integration harness (test/int/_helpers/console_app.ts). Every run
// starts against a blank in-memory MongoDB (mongodb-memory-server), so this
// builds exactly the collections the int/e2e specs need — no committed BSON
// dump, no real hostnames or credential material on disk.
//
// Inserts via the raw mongodb driver (the same connection the harnesses already
// open) so it runs before the app boots and never touches the config/mongoose
// singleton load ordering that console_app.ts is careful about.
//
// The login user's passport-local-mongoose credential is generated in-memory by
// the real library (setPassword computes salt+hash with no DB access), so it is
// guaranteed to validate against the app's own User model rather than depending
// on hand-copied pbkdf2 parameters. The default views mirror
// Filters.setup_initial_views (app/model/filters.ts); the severities mirror
// bin/setup_severity.ts.

/* eslint-disable @typescript-eslint/no-var-requires */

// Login account the specs authenticate as (test/int/login_spec.ts logs in as
// test/test). Kept deliberately synthetic.
const SEED_USER = { username: 'test', password: 'test', email: 'test@example.com', group: 'admin' };

// Second account that exists only so events::assign has a valid reassignment
// target (test/int/events_socket_spec.ts assigns to 'test1'; the handler rejects
// unknown users). It never logs in.
const ASSIGN_TARGET_USER = { username: 'test1', password: 'test1', email: 'test1@example.com', group: 'user' };

// Deterministic _id for one seeded alert. test/int/events_socket_spec.ts looks
// up this exact id (event::details / events::assign) — keep the two in sync.
const ASSIGNABLE_EVENT_ID = '56d19fd8fd087bda5b3f877a';

// Standard system severities — mirrors bin/setup_severity.ts default_severity_data.
const SEVERITIES = [
  { value: 0, label: 'Clear', background: '#AAFFAA', foreground: '#333333', system: true },
  { value: 1, label: 'Indeterminate', background: '#DBA7D9', foreground: '#333333', system: true },
  { value: 2, label: 'Warning', background: '#8CC2FF', foreground: '#333333', system: true },
  { value: 3, label: 'Minor', background: '#FFF6A5', foreground: '#333333', system: true },
  { value: 4, label: 'Major', background: '#FFB689', foreground: '#333333', system: true },
  { value: 5, label: 'Critical', background: '#FF7A7A', foreground: '#333333', system: true },
];

// Generate a valid passport-local-mongoose salt/hash pair for `password` using
// the real library, entirely in memory (no mongo connection needed). Using the
// library rather than a hand-rolled pbkdf2 means the credential always matches
// whatever hashing options the app's User model is configured with.
async function generateCredential(password: string): Promise<{ salt: string; hash: string }> {
  const mongoose = require('mongoose');
  const PassportLocalMongoose = require('passport-local-mongoose').default;
  let SeedUser = mongoose.models.__SeedUser;
  if (!SeedUser) {
    const schema = new mongoose.Schema({ username: String });
    schema.plugin(PassportLocalMongoose);
    SeedUser = mongoose.model('__SeedUser', schema);
  }
  const doc = new SeedUser({ username: 'seed' });
  await doc.setPassword(password);
  return { salt: doc.salt, hash: doc.hash };
}

// The four default per-user views created for a real user by
// Filters.setup_initial_views (app/model/filters.ts).
function defaultViews(user: string): any[] {
  const now = new Date();
  const base = { user, created_at: now, modified_at: now, system: false };
  return [
    { ...base, name: 'Mine', field: 'owner', value: user, f: { owner: user } },
    { ...base, name: 'All', field: '', value: '', f: {} },
    { ...base, name: 'Unacknowledged', field: 'acknowledged', value: false, default: true, f: { acknowledged: false } },
    { ...base, name: 'Acknowledged', field: 'acknowledged', value: true, f: { acknowledged: true } },
  ];
}

// Synthetic alert set. Fake nodes only — no real hostnames.
//
// The e2e console suite (test/e2e/console.spec.ts) mutates rows as it runs —
// clear, acknowledge, assign and DELETE — and Playwright runs its browser
// projects concurrently against this single shared collection, so several
// browsers mutate the same alerts at once. Seed a generous buffer of
// unacknowledged alerts so concurrent mutations rarely collide and the grid
// always keeps a stable, populated second row. (The old BSON dump masked this
// with 499 rows.) Still trivial, entirely synthetic data.
const ALERT_COUNT = 60;

function seedAlerts(): any[] {
  const { ObjectId } = require('mongodb');
  const now = new Date();
  const nodes = ['node-a', 'node-b', 'node-c'];
  const mk = (n: number, acknowledged: boolean, owner: string, _id?: any) => {
    const node = nodes[n % nodes.length];
    const severity = (n % 5) + 1; // 1..5, never Clear (0) so severity-0 is only set by the 'clear' test
    return {
      ...(_id ? { _id } : {}),
      node,
      severity,
      summary: `Synthetic alert ${n} on ${node}`,
      identifier: `seed:${node}:${n}`,
      alert_key: `seed:${node}:${n}`,
      owner,
      group: '',
      agent: 'seed',
      tag: '',
      acknowledged,
      tally: 1,
      notes: [],
      history: [],
      first_occurrence: now,
      last_occurrence: now,
      state_change: now,
    };
  };

  const alerts: any[] = [
    // First alert carries the fixed _id that events_socket_spec looks up.
    mk(0, false, '', new ObjectId(ASSIGNABLE_EVENT_ID)),
  ];
  // The rest: mostly unacknowledged (so the default Unacknowledged view stays
  // populated through the mutation tests), with a couple owned/acknowledged.
  for (let n = 1; n < ALERT_COUNT; n++) {
    const acknowledged = n % 7 === 0; // ~3 acknowledged
    const owner = n % 5 === 0 ? SEED_USER.username : '';
    alerts.push(mk(n, acknowledged, owner));
  }
  return alerts;
}

// Build every functest collection into `db` (a raw mongodb Db). Returns a map of
// { collectionName: docCount } for logging.
async function buildUser(spec: { username: string; password: string; email: string; group: string }): Promise<any> {
  const { salt, hash } = await generateCredential(spec.password);
  const now = new Date();
  return {
    username: spec.username,
    email: spec.email,
    group: spec.group,
    salt,
    hash,
    verified: false,
    // Cleared login-throttling state so repeated logins across specs don't trip
    // passport-local-mongoose's lock/throttle branches.
    failure_count: 0,
    last_login: null,
    preferences: { columns: ['summary', 'tag', 'node', 'owner', 'last_occurrence', 'first_occurrence', 'tally', 'group'] },
    reset: {},
    created: now,
    updated: now,
  };
}

async function seedFixtures(db: any): Promise<Record<string, number>> {
  const inserted: Record<string, number> = {};
  const now = new Date();

  const users = [await buildUser(SEED_USER), await buildUser(ASSIGN_TARGET_USER)];
  await db.collection('users').insertMany(users);
  inserted.users = users.length;

  const views = defaultViews(SEED_USER.username);
  await db.collection('filters').insertMany(views);
  inserted.filters = views.length;

  await db.collection('severities').insertMany(SEVERITIES.map(s => ({ ...s })));
  inserted.severities = SEVERITIES.length;

  const alerts = seedAlerts();
  await db.collection('alerts').insertMany(alerts);
  inserted.alerts = alerts.length;

  await db.collection('apikeys').insertOne({
    username: SEED_USER.username,
    apikey: 'seedapikey00000000000000000000000',
    created: now,
  });
  inserted.apikeys = 1;

  return inserted;
}

// Reset login-throttling state on the users collection so repeated logins within
// a single test run don't hit passport-local-mongoose's account-lock
// (`TooManyAttemptsError`) or throttle (`AttemptTooSoonError`) branches. The seed
// already bakes these to a clean state; kept for callers that re-run logins.
async function resetUserFailureCount(db: any): Promise<void> {
  await db.collection('users').updateMany({}, { $set: { failure_count: 0, last_login: null } });
}

module.exports = {
  SEED_USER,
  seedFixtures,
  resetUserFailureCount,
};
