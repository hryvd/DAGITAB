import { createServer } from 'vite';
import { createApp } from './app.mjs';

process.umask(0o077);
const app = createApp({
  dbPath: process.env.DAGITAB_DB_PATH,
  origin: process.env.APP_ORIGIN,
});
const vite = await createServer();
try {
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(3001, '127.0.0.1', resolve);
  });
  await vite.listen();
  vite.printUrls();
} catch (error) {
  await vite.close();
  await app.close();
  throw error;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await vite.close();
    await app.close();
    process.exit(0);
  });
}
