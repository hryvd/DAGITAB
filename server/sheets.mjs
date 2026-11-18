import { createHmac } from 'node:crypto';
import { openDatabase } from './app.mjs';

const protocol = 'dagitab-sheets-v1';
const revisionPattern = /^[\w-]{1,128}$/;
const entryLimit = 5_000;
const payloadLimit = 4_000_000;

export const sheetTables = {
  teams: ['id', 'open', 'capacity'],
  users: [
    'id',
    'name',
    'email',
    'password',
    'school',
    'teamId',
    'expertise',
    'intent',
    'role',
    'createdAt',
    'username',
    'localDemo',
  ],
  sessions: ['tokenHash', 'csrf', 'userId', 'expiresAt'],
  projects: ['id', 'title', 'description', 'teamId', 'status'],
  tasks: [
    'id',
    'projectId',
    'title',
    'description',
    'teamId',
    'assigneeId',
    'status',
    'createdBy',
  ],
  rate_limits: ['key', 'attempts', 'expiresAt'],
};

export function openSheets({
  deploymentId = process.env.GOOGLE_SHEETS_DEPLOYMENT_ID,
  secret = process.env.DAGITAB_SHEETS_SECRET,
  fetchImpl = fetch,
} = {}) {
  if (
    !/^[\w-]{30,150}$/.test(deploymentId ?? '') ||
    !secret ||
    secret.length < 32
  )
    throw new Error(
      'Google Sheets requires a deployment ID and a shared secret.',
    );

  const endpoint = `https://script.google.com/macros/s/${deploymentId}/exec`;

  async function call(action, fields, signal) {
    const payload = JSON.stringify({ action, issuedAt: Date.now(), ...fields });
    if (payload.length > payloadLimit)
      throw new Error(
        'Google Sheets database exceeded the supported snapshot size.',
      );
    const body = JSON.stringify({
      payload,
      signature: createHmac('sha256', secret).update(payload).digest('hex'),
    });
    if (body.length > 8_000_000)
      throw new Error(
        'Google Sheets database exceeded the supported snapshot size.',
      );

    let response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'manual',
      signal,
    });
    if ([302, 303].includes(response.status)) {
      const location = new URL(response.headers.get('location'), endpoint);
      if (location.origin !== 'https://script.googleusercontent.com')
        throw new Error(
          'Google Apps Script is not accessible to the Vercel function.',
          { cause: 'SHEETS_SCRIPT_ACCESS' },
        );
      response = await fetchImpl(location, { redirect: 'error', signal });
    }
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('application/json')
    )
      throw new Error('Google Apps Script returned an unexpected response.');

    const result = await response.json();
    if (result?.protocol !== protocol)
      throw new Error(
        'Deploy the DAGITAB Apps Script receiver at the configured deployment.',
        { cause: 'SHEETS_SCRIPT_VERSION' },
      );
    if (
      action === 'commit' &&
      result.ok === false &&
      result.error === 'conflict'
    )
      return false;
    if (result.ok !== true) {
      const causes = {
        unauthorized: 'SHEETS_SCRIPT_SECRET',
        invalid_request: 'SHEETS_SCRIPT_REQUEST',
        storage_unavailable: 'SHEETS_STORAGE',
      };
      throw new Error('Google Apps Script rejected the database operation.', {
        cause: Object.hasOwn(causes, result.error)
          ? causes[result.error]
          : 'SHEETS_SCRIPT_ERROR',
      });
    }
    if (
      (result.revision !== null &&
        (typeof result.revision !== 'string' ||
          !revisionPattern.test(result.revision))) ||
      (action === 'commit' && result.revision === null) ||
      (action === 'load' &&
        (!Array.isArray(result.entries) ||
          result.entries.length > entryLimit ||
          (result.revision === null && result.entries.length > 0)))
    )
      throw new Error(
        'Google Apps Script returned an invalid database snapshot.',
      );
    return result;
  }

  return {
    load(signal = AbortSignal.timeout(20_000)) {
      return call('load', {}, signal);
    },
    async commit(revision, entries, signal = AbortSignal.timeout(20_000)) {
      if (entries.length > entryLimit)
        throw new Error(
          'Google Sheets database exceeded the supported row count.',
        );
      if (entries.some(([, row]) => row.length > 48_000))
        throw new Error(
          'Google Sheets database contains a record that is too large.',
        );
      return Boolean(await call('commit', { revision, entries }, signal));
    },
  };
}

function hydrateDatabase(db, snapshot) {
  db.exec(`
    CREATE TABLE rate_limits (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL
    )
  `);
  if (snapshot.revision === null) return;

  const rows = Object.fromEntries(
    Object.keys(sheetTables).map((table) => [table, []]),
  );
  for (const entry of snapshot.entries) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !Object.hasOwn(sheetTables, entry[0]) ||
      typeof entry[1] !== 'string'
    )
      throw new Error('Google Sheets contains an invalid database record.');
    const [table, encoded] = entry;
    rows[table].push(JSON.parse(encoded));
  }

  db.exec('BEGIN');
  db.exec('DELETE FROM teams');
  for (const [table, columns] of Object.entries(sheetTables)) {
    const insert = db.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    );
    for (const row of rows[table])
      insert.run(...columns.map((column) => row[column]));
  }
  db.exec('COMMIT');
}

function readEntries(db) {
  return Object.keys(sheetTables).flatMap((table) =>
    db
      .prepare(`SELECT * FROM ${table}`)
      .all()
      .map((row) => [table, JSON.stringify(row)]),
  );
}

// ponytail: one versioned snapshot serializes writes for a small event.
// Larger events need row-level storage and should use a relational database.
export async function withSheetsDatabase(
  store,
  run,
  { commit = () => true } = {},
) {
  const signal = AbortSignal.timeout(22_000);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const snapshot = await store.load(signal);
    const db = openDatabase(':memory:');
    try {
      hydrateDatabase(db, snapshot);
      const changes = db.prepare('SELECT total_changes() AS count');
      const before = changes.get().count;
      const database = {
        prepare: db.prepare.bind(db),
        rateLimit(key, duration) {
          const now = Date.now();
          db.prepare('DELETE FROM rate_limits WHERE expiresAt <= ?').run(now);
          const { attempts } = db
            .prepare(
              `
            INSERT INTO rate_limits (key, attempts, expiresAt) VALUES (?, 1, ?)
            ON CONFLICT (key) DO UPDATE SET attempts = attempts + 1
            RETURNING attempts
          `,
            )
            .get(key, now + duration);
          return attempts;
        },
      };
      const result = await run(database);
      if (changes.get().count === before || !commit(result)) return result;
      if (await store.commit(snapshot.revision, readEntries(db), signal))
        return result;
    } finally {
      db.close();
    }
  }
  throw new Error(
    'Google Sheets database changed concurrently. Retry the request.',
  );
}
