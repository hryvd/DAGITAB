import { createApp } from './app.mjs';

// Database, WAL, and backup artifacts created by this process are owner-only.
process.umask(0o077);
const app = createApp({
  dbPath: process.env.DAGITAB_DB_PATH,
  production: process.env.NODE_ENV === 'production',
  origin: process.env.APP_ORIGIN,
});
const port = Number(process.env.PORT || 3001);
const localDemo = app.db
  .prepare('SELECT id FROM users WHERE localDemo=1 LIMIT 1')
  .get();
const host =
  localDemo && process.env.NODE_ENV !== 'production'
    ? '127.0.0.1'
    : process.env.HOST || '127.0.0.1';
app.server.listen(port, host, () => {
  console.log(`DAGITAB server listening on port ${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
