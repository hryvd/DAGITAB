import { X509Certificate } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getCACertificates } from 'node:tls';
import postgres from 'postgres';
import { supabaseProductionCa } from './supabase-ca.mjs';

const columns = {
  teamid: 'teamId',
  localdemo: 'localDemo',
  createdat: 'createdAt',
  tokenhash: 'tokenHash',
  userid: 'userId',
  expiresat: 'expiresAt',
  projectid: 'projectId',
  assigneeid: 'assigneeId',
  createdby: 'createdBy',
};

export function openPostgres(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL must be a Postgres connection string.');
  // Require certificate verification even when the pooler URI says sslmode=require.
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');
  const ssl = { rejectUnauthorized: true };
  const ca = process.env.DATABASE_CA_CERT?.replaceAll('\\n', '\n').trim();
  if (ca) {
    try {
      if (!new X509Certificate(ca).ca)
        throw new Error('Expected a CA certificate.');
    } catch {
      throw Object.assign(
        new Error('DATABASE_CA_CERT must contain a PEM CA certificate.'),
        {
          code: 'DATABASE_CA_CERT_INVALID',
        },
      );
    }
    ssl.ca = ca;
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !url.searchParams.has('host') &&
    (/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(hostname) ||
      /^db\.[a-z0-9]+\.supabase\.co$/.test(hostname))
  ) {
    ssl.ca = [
      ...(ca ? [ca] : getCACertificates('default')),
      supabaseProductionCa,
    ];
  }
  const sql = postgres(url.href, {
    ssl,
    prepare: false,
    max: 2,
    connect_timeout: 5,
    idle_timeout: 20,
    transform: { column: { from: (name) => columns[name] ?? name } },
  });

  let initialization;

  async function schemaReady(connection) {
    const [row] = await connection`
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS relation
        JOIN pg_catalog.pg_namespace AS schema ON schema.oid = relation.relnamespace
        WHERE schema.nspname = 'dagitab' AND relation.relname = 'rate_limits'
      ) AS ready
    `;
    return row.ready;
  }

  async function initializeSchema() {
    if (await schemaReady(sql)) return;
    const migration = await readFile(
      new URL(
        '../supabase/migrations/20261118000000_dagitab.sql',
        import.meta.url,
      ),
      'utf8',
    );
    // The file also runs in the SQL Editor. The driver owns the transaction here.
    const statements = migration
      .replace(/^BEGIN;\s*/, '')
      .replace(/\s*COMMIT;\s*$/, '');
    await sql.begin(async (transaction) => {
      await transaction`SET LOCAL lock_timeout = '8s'`;
      await transaction`SELECT pg_advisory_xact_lock(20261118, 1)`;
      if (!(await schemaReady(transaction)))
        await transaction.unsafe(statements);
    });
  }

  return {
    initialize() {
      initialization ??= initializeSchema().catch((error) => {
        initialization = undefined;
        throw error;
      });
      return initialization;
    },
    prepare(statement) {
      let index = 0;
      const query = statement
        .replace(
          /\b(FROM|JOIN|INTO|UPDATE) (teams|users|sessions|projects|tasks)\b/g,
          '$1 dagitab.$2',
        )
        .replaceAll('?', () => '$' + ++index);
      const execute = (params) => sql.unsafe(query, params, { prepare: false });
      return {
        get: async (...params) => (await execute(params))[0],
        all: (...params) => execute(params),
        run: (...params) => execute(params),
      };
    },
    async rateLimit(key, duration) {
      if (Math.random() < 0.01)
        await sql`DELETE FROM dagitab.rate_limits WHERE expiresat <= now()`;
      const [row] = await sql`
        INSERT INTO dagitab.rate_limits AS limits (key, attempts, expiresat)
        VALUES (${key}, 1, now() + ${duration} * interval '1 millisecond')
        ON CONFLICT (key) DO UPDATE SET
          attempts = CASE WHEN limits.expiresat <= now() THEN 1 ELSE limits.attempts + 1 END,
          expiresat = CASE WHEN limits.expiresat <= now() THEN EXCLUDED.expiresat ELSE limits.expiresat END
        RETURNING attempts
      `;
      return row.attempts;
    },
    close: () => sql.end(),
  };
}
