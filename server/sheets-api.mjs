import { createApp, HttpError, readJson } from './app.mjs';
import { withSheetsDatabase } from './sheets.mjs';

export function createSheetsHandler(store, options) {
  return async (req, res) => {
    // Buffer the body once so a conflicting write can retry without replaying a stream.
    const path = new URL(req.url, 'http://localhost').pathname;
    let body;
    if (['POST', 'PATCH'].includes(req.method) && path !== '/api/logout') {
      try {
        body = await readJson(req);
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        res.writeHead(error.status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        return res.end(JSON.stringify({ error: error.message }));
      }
    }
    const request = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      socket: req.socket,
      body,
    };
    const result = await withSheetsDatabase(
      store,
      async (database) => {
        const response = {
          headers: {},
          setHeader(name, value) {
            this.headers[name.toLowerCase()] = value;
          },
          writeHead(status, headers) {
            this.status = status;
            for (const [name, value] of Object.entries(headers))
              this.setHeader(name, value);
          },
          end(value) {
            this.body = value;
          },
        };
        const app = createApp({ ...options, database });
        await app.handler(request, response);
        return response;
      },
      { commit: (response) => response.status < 500 },
    );
    res.writeHead(result.status, result.headers);
    return res.end(result.body);
  };
}
