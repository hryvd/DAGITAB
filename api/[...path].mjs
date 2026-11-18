import { createApp } from '../server/app.mjs';
import { openPostgres } from '../server/postgres.mjs';
const METHODS = [
  ['GET', /^\/api\/(?:session|teams|workspace)$/],
  ['POST', /^\/api\/(?:register|login|logout|projects|tasks)$/],
  ['PATCH', /^\/api\/(?:projects|tasks)\/\d+$/],
  ['PATCH', /^\/api\/teams\/(?:frontend|backend|ml|data|research|design)$/],
];
const BODY_LIMIT = 16_384;
const unavailable =
  'The account service is not configured yet. Please try again once the event operator has connected it.';

function upstreamOrigin(value, requestHost) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.origin !== value ||
      url.username ||
      url.password
    )
      return null;
    if (url.hostname === new URL(`https://${requestHost}`).hostname)
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function requestBody(req) {
  if (Number(req.headers['content-length']) > BODY_LIMIT)
    throw Object.assign(new Error('Request is too large.'), { status: 413 });
  if (req.body !== undefined) {
    const data = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
        );
    if (data.length > BODY_LIMIT)
      throw Object.assign(new Error('Request is too large.'), { status: 413 });
    return data;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > BODY_LIMIT)
      throw Object.assign(new Error('Request is too large.'), { status: 413 });
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sessionCookies(headers) {
  const values =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie')].filter(Boolean);
  return values.flatMap((cookie) => {
    const value = /^dagitab_session=([A-Za-z0-9_-]{43}|)(?:;|$)/.exec(
      cookie,
    )?.[1];
    const maxAge = /;\s*Max-Age=(\d+)(?:;|$)/i.exec(cookie)?.[1];
    if (value === undefined || maxAge === undefined || Number(maxAge) > 43200)
      return [];
    // Always host-only for the public frontend, even if an upstream adds Domain.
    return [
      `dagitab_session=${value}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAge}`,
    ];
  });
}

export function createProxy({
  origin = process.env.DAGITAB_API_ORIGIN,
  fetchImpl = fetch,
  timeoutMs = 10_000,
} = {}) {
  return async function proxy(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const reply = (status, error) => {
      res.statusCode = status;
      res.end(JSON.stringify({ error }));
    };
    try {
      if (req.headers['x-dagitab-proxy-hop'])
        return reply(
          502,
          'The account service configuration creates a proxy loop.',
        );
      if (!req.url?.startsWith('/api/'))
        return reply(404, 'API route not found.');
      const url = new URL(req.url, 'https://proxy.invalid');
      if (
        !METHODS.some(
          ([method, pattern]) =>
            method === req.method && pattern.test(url.pathname),
        )
      )
        return reply(405, 'API route or method not allowed.');
      const target = upstreamOrigin(origin, req.headers.host);
      if (!target) return reply(503, unavailable);
      const headers = { 'x-dagitab-proxy-hop': '1' };
      for (const name of [
        'origin',
        'cookie',
        'x-csrf-token',
        'content-type',
        'accept',
      ]) {
        const value = req.headers[name];
        if (typeof value === 'string') headers[name] = value;
      }
      const body = req.method === 'GET' ? undefined : await requestBody(req);
      const response = await fetchImpl(
        `${target}${url.pathname}${url.search}`,
        {
          method: req.method,
          headers,
          body,
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      if (response.status >= 300 && response.status < 400)
        return reply(
          502,
          'The account service returned an unexpected redirect.',
        );
      if (
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('application/json')
      )
        return reply(
          502,
          'The account service returned an unexpected response.',
        );
      const result = await response.text();
      try {
        JSON.parse(result);
      } catch {
        return reply(
          502,
          'The account service returned an unexpected response.',
        );
      }
      const cookies = sessionCookies(response.headers);
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.statusCode = response.status;
      res.end(result);
    } catch (error) {
      reply(
        error.status === 413 ? 413 : 502,
        error.status === 413
          ? error.message
          : 'The account service is unavailable. Please try again later.',
      );
    }
  };
}

const proxy = createProxy();
let accountService;
const untrustedCertificateErrors = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

function setupUnavailable(res, code, error) {
  // Driver messages may include connection details. Emit only the error code.
  console.error('Account service startup:', code, error?.code || '');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 503;
  return res.end(JSON.stringify({ error: unavailable, code }));
}

export default async function handler(req, res) {
  if (!req.url?.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'API route not found.' }));
  }

  if (!accountService) {
    const connectionString =
      process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
    if (!connectionString) {
      if (process.env.DAGITAB_API_ORIGIN) return proxy(req, res);
      return setupUnavailable(res, 'ACCOUNT_DATABASE_URL_MISSING');
    }

    let origin;
    const configuredOrigin = process.env.APP_ORIGIN?.trim();
    try {
      if (configuredOrigin) {
        const url = new URL(configuredOrigin);
        if (url.protocol !== 'https:' || url.username || url.password)
          return setupUnavailable(res, 'ACCOUNT_APP_ORIGIN_INVALID');
        origin = url.origin;
      } else if (!process.env.VERCEL) {
        return setupUnavailable(res, 'ACCOUNT_APP_ORIGIN_MISSING');
      }
    } catch {
      return setupUnavailable(res, 'ACCOUNT_APP_ORIGIN_INVALID');
    }

    try {
      const database = openPostgres(connectionString);
      const app = createApp({
        production: true,
        origin,
        useRequestHost: Boolean(process.env.VERCEL),
        database,
      });
      accountService = { app, database };
    } catch (error) {
      return setupUnavailable(
        res,
        error.code === 'DATABASE_CA_CERT_INVALID'
          ? 'ACCOUNT_DATABASE_CA_CERT_INVALID'
          : 'ACCOUNT_DATABASE_URL_INVALID',
        error,
      );
    }
  }

  try {
    await accountService.database.initialize();
  } catch (error) {
    return setupUnavailable(
      res,
      untrustedCertificateErrors.has(error.code)
        ? 'ACCOUNT_DATABASE_TLS_UNTRUSTED'
        : 'ACCOUNT_DATABASE_UNAVAILABLE',
      error,
    );
  }
  return accountService.app.handler(req, res);
}
