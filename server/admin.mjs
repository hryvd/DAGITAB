import { resolve } from 'node:path';
import { hashPassword, openDatabase } from './app.mjs';
import { openPostgres } from './postgres.mjs';

process.umask(0o077);
const [emailArg, ...nameParts] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const name = nameParts.join(' ').trim();
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !name ||
  name.length > 100
) {
  console.error(
    'Usage: node server/admin.mjs admin@example.org "Admin name"\nProvide a 12–128 character password through standard input or DAGITAB_ADMIN_PASSWORD.',
  );
  process.exit(1);
}
let password = process.env.DAGITAB_ADMIN_PASSWORD;
delete process.env.DAGITAB_ADMIN_PASSWORD;
if (!password) {
  if (process.stdin.isTTY) {
    console.error(
      'Read a password securely in your shell, then pipe it on standard input. Do not put it in command arguments.',
    );
    process.exit(1);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 1024) throw new Error('Password input is too large.');
    chunks.push(chunk);
  }
  password = Buffer.concat(chunks)
    .toString()
    .replace(/\r?\n$/, '');
}
const connectionString = process.env.DATABASE_URL;
const db = connectionString
  ? openPostgres(connectionString)
  : openDatabase(
      process.env.DAGITAB_DB_PATH || resolve('.data/dagitab.sqlite'),
    );
try {
  if (await db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    throw new Error(
      'An account already uses this email; no account was changed.',
    );
  const hash = await hashPassword(password);
  password = undefined;
  await db
    .prepare(
      "INSERT INTO users (name,email,password,role,createdAt) VALUES (?,?,?,'admin',?)",
    )
    .run(name, email, hash, Date.now());
  console.log('Administrator created. Sign in through the app.');
} catch (error) {
  if (error.code === '23505')
    console.error(
      'An account already uses this email; no account was changed.',
    );
  else if (connectionString && error.code)
    console.error(
      'Could not create the administrator in Postgres:',
      error.code,
    );
  else console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
