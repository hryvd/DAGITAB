import { resolve } from 'node:path';
import {
  hashLocalDemoPassword,
  isHostedEnvironment,
  openDatabase,
} from './app.mjs';

process.umask(0o077);
if (isHostedEnvironment()) {
  console.error(
    'Local demo accounts are disabled in production and hosted environments.',
  );
  process.exit(1);
}
const db = openDatabase(
  process.env.DAGITAB_DB_PATH || resolve('.data/dagitab.sqlite'),
);
try {
  if (
    db
      .prepare('SELECT id FROM users WHERE lower(username)=? OR email=?')
      .get('admin', 'local-admin@dagitab.invalid')
  )
    throw new Error(
      'The demo username or email already exists; no account was changed.',
    );
  const password = await hashLocalDemoPassword();
  db.prepare(
    "INSERT INTO users(name,email,username,password,role,localDemo,createdAt) VALUES(?,?,?,?, 'admin',1,?)",
  ).run(
    'Local demo administrator',
    'local-admin@dagitab.invalid',
    'admin',
    password,
    Date.now(),
  );
  console.log(
    'Local demo administrator created. Restart the loopback-only development server, then sign in with username admin and password admin. This account cannot be used in production.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
