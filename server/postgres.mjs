import postgres from 'postgres';

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
  const sql = postgres(url.href, {
    ssl: { rejectUnauthorized: true },
    prepare: false,
    max: 2,
    connect_timeout: 5,
    idle_timeout: 20,
    transform: { column: { from: (name) => columns[name] ?? name } },
  });

  return {
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
