import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createProxy } from '../api/[...path].mjs';

async function invoke(
  handler,
  {
    path = '/api/session',
    method = 'GET',
    headers = {},
    body,
    parsedBody,
  } = {},
) {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  Object.assign(req, {
    url: path,
    method,
    headers: { host: 'www.dagitab.xyz', ...headers },
  });
  if (parsedBody !== undefined) req.body = parsedBody;
  const result = { headers: {}, status: undefined, value: undefined };
  const res = {
    statusCode: 200,
    setHeader(name, value) {
      result.headers[name.toLowerCase()] = value;
    },
    end(value) {
      result.status = this.statusCode;
      result.value = JSON.parse(value);
    },
  };
  await handler(req, res);
  return result;
}

test('Vercel API refuses absent/insecure/self-loop configuration and unknown routes', async () => {
  let calls = 0;
  const fetchImpl = () => {
    calls += 1;
    throw new Error('Must not contact upstream.');
  };
  for (const origin of [
    '',
    'http://backend.example',
    'https://backend.example/path',
    'https://backend.example/',
    'https://user:secret@backend.example',
    'https://www.dagitab.xyz',
  ]) {
    const result = await invoke(createProxy({ origin, fetchImpl }));
    assert.equal(result.status, 503);
    assert.match(result.value.error, /not configured/);
    assert.equal(result.headers['cache-control'], 'no-store');
  }
  for (const request of [
    { path: '/server/app.mjs' },
    { path: '/api/../../server/app.mjs' },
    { path: '/api/private' },
    { path: '/api/session', method: 'DELETE' },
    { path: '/api/tasks/1', method: 'GET' },
  ]) {
    const result = await invoke(
      createProxy({ origin: 'https://backend.example', fetchImpl }),
      request,
    );
    assert.ok([404, 405].includes(result.status));
  }
  const loop = await invoke(
    createProxy({ origin: 'https://backend.example', fetchImpl }),
    { headers: { 'x-dagitab-proxy-hop': '1' } },
  );
  assert.equal(loop.status, 502);
  assert.equal(calls, 0);
});

test('Vercel API preserves auth boundary and returns host-only secure session cookies', async () => {
  let forwarded;
  const fetchImpl = async (url, options) => {
    forwarded = { url, options };
    return new Response(JSON.stringify({ user: null, csrfToken: 'csrf' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `dagitab_session=${'a'.repeat(43)}; Path=/; Domain=backend.example; HttpOnly; SameSite=Strict; Secure; Max-Age=43200`,
      },
    });
  };
  const result = await invoke(
    createProxy({ origin: 'https://backend.example', fetchImpl }),
    {
      path: '/api/login',
      method: 'POST',
      parsedBody: { email: 'member@example.test', password: 'not printed' },
      headers: {
        origin: 'https://www.dagitab.xyz',
        cookie: 'dagitab_session=old',
        'x-csrf-token': 'csrf',
        'content-type': 'application/json',
        authorization: 'ignored',
        'x-forwarded-for': 'ignored',
      },
    },
  );
  assert.equal(result.status, 200);
  assert.equal(forwarded.url, 'https://backend.example/api/login');
  assert.equal(forwarded.options.headers.origin, 'https://www.dagitab.xyz');
  assert.equal(forwarded.options.headers.cookie, 'dagitab_session=old');
  assert.equal(forwarded.options.headers['x-csrf-token'], 'csrf');
  assert.equal(forwarded.options.headers.authorization, undefined);
  assert.equal(forwarded.options.headers['x-forwarded-for'], undefined);
  assert.equal(forwarded.options.headers.host, undefined);
  assert.equal(forwarded.options.redirect, 'manual');
  assert.equal(JSON.parse(forwarded.options.body).email, 'member@example.test');
  assert.match(
    result.headers['set-cookie'][0],
    /HttpOnly; SameSite=Strict; Secure/,
  );
  assert.doesNotMatch(result.headers['set-cookie'][0], /Domain=/);
  const logout = await invoke(
    createProxy({
      origin: 'https://backend.example',
      fetchImpl: async () =>
        new Response('{}', {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'dagitab_session=; Path=/; Max-Age=0',
          },
        }),
    }),
  );
  assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
});

test('Vercel API limits requests, preserves backend rejections, and handles outages safely', async () => {
  let calls = 0;
  const proxy = createProxy({
    origin: 'https://backend.example',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{"error":"Please sign in."}', {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  const oversized = await invoke(proxy, {
    path: '/api/register',
    method: 'POST',
    body: 'x'.repeat(16385),
  });
  assert.equal(oversized.status, 413);
  const declaredOversized = await invoke(proxy, {
    path: '/api/register',
    method: 'POST',
    parsedBody: {},
    headers: { 'content-length': '20000' },
  });
  assert.equal(declaredOversized.status, 413);
  assert.equal(calls, 0);
  assert.equal((await invoke(proxy, { path: '/api/workspace' })).status, 401);
  const redirect = await invoke(
    createProxy({
      origin: 'https://backend.example',
      fetchImpl: async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://elsewhere.example' },
        }),
    }),
  );
  assert.equal(redirect.status, 502);
  const unexpected = await invoke(
    createProxy({
      origin: 'https://backend.example',
      fetchImpl: async () =>
        new Response('<html>Not an API</html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
    }),
  );
  assert.equal(unexpected.status, 502);
  const outage = await invoke(
    createProxy({
      origin: 'https://backend.example',
      fetchImpl: async () => {
        throw new Error('Private backend diagnostic details');
      },
    }),
  );
  assert.equal(outage.status, 502);
  assert.doesNotMatch(JSON.stringify(outage), /Private backend/);
  const timeout = await invoke(
    createProxy({
      origin: 'https://backend.example',
      timeoutMs: 1,
      fetchImpl: (_, options) =>
        new Promise((_, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(options.signal.reason),
            { once: true },
          );
          setTimeout(() => reject(new Error('timeout check failed')), 50);
        }),
    }),
  );
  assert.equal(timeout.status, 502);
});
