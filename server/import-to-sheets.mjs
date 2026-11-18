import postgres from 'postgres';
import { openSheets, sheetTables } from './sheets.mjs';

let sql;
let failure = 'Set DATABASE_URL or POSTGRES_URL to the source Postgres URI.';
try {
  const url = new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Invalid source URI.');
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');

  failure = 'Check GOOGLE_SHEETS_DEPLOYMENT_ID and DAGITAB_SHEETS_SECRET.';
  const sheets = openSheets();
  failure =
    'Could not read the destination. Check the Apps Script deployment and shared secret.';
  if ((await sheets.load()).revision !== null) {
    failure =
      'The destination already has a database. No data was overwritten.';
    throw new Error('Destination is not empty.');
  }

  failure =
    'Could not snapshot Supabase. Check the connection and DAGITAB schema.';
  sql = postgres(url.href, {
    ssl: { rejectUnauthorized: true },
    prepare: false,
    max: 1,
    connect_timeout: 5,
    onnotice: () => {},
  });
  const entries = await sql.begin(
    'ISOLATION LEVEL REPEATABLE READ READ ONLY',
    async (transaction) => {
      const snapshot = [];
      for (const [table, columns] of Object.entries(sheetTables)) {
        if (table === 'rate_limits') continue;
        const fields = columns
          .map((column) => `${column.toLowerCase()} AS "${column}"`)
          .join(', ');
        const filter =
          table === 'sessions'
            ? ` WHERE expiresat > $1 AND NOT EXISTS (
                SELECT 1 FROM dagitab.users
                WHERE id = sessions.userid AND localdemo <> 0
              )`
            : '';
        const params = table === 'sessions' ? [Date.now()] : [];
        const rows = await transaction.unsafe(
          `SELECT ${fields} FROM dagitab.${table}${filter}`,
          params,
        );
        for (const row of rows) {
          for (const column of ['createdAt', 'expiresAt']) {
            if (!Object.hasOwn(row, column)) continue;
            const milliseconds = Number(row[column]);
            if (!Number.isSafeInteger(milliseconds))
              throw new Error('Unsupported timestamp.');
            row[column] = milliseconds;
          }
          snapshot.push([table, JSON.stringify(row)]);
        }
      }
      return snapshot;
    },
  );

  failure =
    'Could not confirm the Sheets import. Check the destination and Apps Script executions before retrying.';
  if (!(await sheets.commit(null, entries))) {
    failure = 'The destination changed during import. No data was overwritten.';
    throw new Error('Destination changed.');
  }
  console.log(`Imported ${entries.length} rows into Google Sheets.`);
} catch {
  console.error(failure);
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 5 });
}
