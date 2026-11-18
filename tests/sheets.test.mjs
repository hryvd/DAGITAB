import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createSheetsHandler } from '../server/sheets-api.mjs';
import { openSheets } from '../server/sheets.mjs';

const deploymentId = 'test-deployment-id-with-enough-characters';
const secret = 'test-only shared secret with 32 characters';
const origin = 'https://www.dagitab.xyz';
const receiverScript = await readFile(
  new URL('../google-apps-script/Code.gs', import.meta.url),
  'utf8',
);

function mockAppsScript() {
  const properties = {
    DAGITAB_SPREADSHEET_ID: 'test-sheet',
    DAGITAB_SHEETS_SECRET: secret,
  };
  const responses = new Map();
  let conflicts = 0;
  let opened = 0;
  let locked = false;
  let rows = [];
  const sheet = {
    getLastRow: () => rows.findLastIndex((row) => row.some(Boolean)) + 1,
    getMaxRows: () => 1_000,
    getRange(start, column, count, width) {
      assert.equal(column, 1);
      assert.equal(width, 2);
      return {
        getValues: () => rows.slice(start - 1, start - 1 + count),
        setValues(values) {
          assert.ok(locked);
          assert.equal(values.length, count);
          rows.splice(start - 1, count, ...values);
        },
      };
    },
  };
  const receiver = {
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (body) => ({ setMimeType: () => body }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock() {
          assert.equal(locked, false);
          return (locked = true);
        },
        releaseLock() {
          assert.ok(locked);
          locked = false;
        },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (name) => properties[name] }),
    },
    SpreadsheetApp: {
      openById(id) {
        assert.ok(locked);
        assert.equal(id, properties.DAGITAB_SPREADSHEET_ID);
        opened++;
        return { getSheetByName: () => sheet };
      },
      flush() {
        assert.ok(locked);
      },
    },
    Utilities: {
      Charset: { UTF_8: 'utf8' },
      computeHmacSha256Signature(payload, key, charset) {
        return Array.from(
          new Int8Array(
            createHmac('sha256', key).update(payload, charset).digest(),
          ),
        );
      },
      getUuid: randomUUID,
    },
  };
  runInNewContext(receiverScript, receiver);
  return {
    get conflicts() {
      return conflicts;
    },
    get opened() {
      return opened;
    },
    health: () => JSON.parse(receiver.doGet()),
    async fetch(url, options) {
      if (
        String(url) ===
        `https://script.google.com/macros/s/${deploymentId}/exec`
      ) {
        assert.equal(options.method, 'POST');
        assert.equal(options.redirect, 'manual');
        const body = receiver.doPost({ postData: { contents: options.body } });
        if (JSON.parse(body).error === 'conflict') conflicts++;
        const location = `https://script.googleusercontent.com/macros/echo?${randomUUID()}`;
        responses.set(location, body);
        return new Response(null, { status: 302, headers: { location } });
      }
      assert.equal(options.body, undefined);
      assert.equal(options.redirect, 'error');
      assert.ok(responses.has(String(url)));
      const body = responses.get(String(url));
      responses.delete(String(url));
      return new Response(body, {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}

function browser() {
  let cookie;
  let csrf;
  return async (
    handler,
    path,
    { body, method = 'GET', requestOrigin = origin } = {},
  ) => {
    const request = Object.assign(
      Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []),
      {
        method,
        url: '/api/' + path,
        headers: {
          host: new URL(origin).host,
          origin: requestOrigin,
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        socket: { remoteAddress: '127.0.0.1' },
      },
    );
    const result = {};
    await handler(request, {
      writeHead(status, headers) {
        Object.assign(result, { status, headers });
      },
      end(body) {
        result.value = JSON.parse(body);
      },
    });
    if (result.headers['set-cookie'])
      cookie = result.headers['set-cookie'].split(';')[0];
    if (result.value.csrfToken) csrf = result.value.csrfToken;
    return result;
  };
}

test('Sheets client uses signed POST and only follows the Apps Script content redirect', async () => {
  const script = mockAppsScript();
  const client = openSheets({ deploymentId, secret, fetchImpl: script.fetch });
  assert.deepEqual(script.health(), {
    ok: true,
    protocol: 'dagitab-sheets-v1',
  });
  assert.equal(script.opened, 0);
  const unauthorized = openSheets({
    deploymentId,
    secret: 'incorrect'.repeat(5),
    fetchImpl: script.fetch,
  });
  await assert.rejects(unauthorized.load(), /rejected/);
  assert.equal(script.opened, 0);
  assert.deepEqual(await client.load(), {
    ok: true,
    protocol: 'dagitab-sheets-v1',
    revision: null,
    entries: [],
  });

  let redirectCalls = 0;
  const outside = openSheets({
    deploymentId,
    secret,
    async fetchImpl() {
      redirectCalls++;
      return new Response(null, {
        status: 302,
        headers: { location: 'https://outside.example.test/' },
      });
    },
  });
  await assert.rejects(outside.load(), /not accessible/);
  assert.equal(redirectCalls, 1);
  const invalid = openSheets({
    deploymentId,
    secret,
    fetchImpl: async () =>
      Response.json({ ok: true, protocol: 'something-else' }),
  });
  await assert.rejects(invalid.load(), /DAGITAB Apps Script receiver/);
});

test('Sheets handler persists secure sessions and serializes duplicate registrations across instances', async () => {
  const script = mockAppsScript();
  const makeStore = () =>
    openSheets({ deploymentId, secret, fetchImpl: script.fetch });
  const first = createSheetsHandler(makeStore(), { production: true, origin });
  const second = createSheetsHandler(makeStore(), { production: true, origin });
  const alice = browser();
  const other = browser();
  const session = await alice(first, 'session');
  assert.equal(session.status, 200);
  assert.match(
    session.headers['set-cookie'],
    /HttpOnly; SameSite=Strict;.*Secure/,
  );
  assert.equal((await other(second, 'session')).status, 200);
  const body = {
    name: 'Tést Developer',
    email: 'member@example.test',
    password: 'A disposable test password!',
    school: 'Test University',
    teamId: 'frontend',
    expertise: ['Front-end'],
  };
  const request = { method: 'POST', body };
  assert.equal(
    (
      await alice(second, 'register', {
        ...request,
        requestOrigin: 'https://outside.example.test',
      })
    ).status,
    403,
  );
  const registrations = await Promise.all([
    alice(first, 'register', request),
    other(second, 'register', request),
  ]);
  assert.deepEqual(
    registrations.map((result) => result.status).sort(),
    [201, 409],
  );
  assert.ok(script.conflicts > 0);
  const member = registrations[0].status === 201 ? alice : other;
  const fresh = createSheetsHandler(makeStore(), { production: true, origin });
  const workspace = await member(fresh, 'workspace');
  assert.equal(workspace.status, 200);
  assert.ok(workspace.value.members.some(({ name }) => name === body.name));
  assert.equal((await browser()(fresh, 'workspace')).status, 401);
  assert.equal((await member(fresh, 'logout', { method: 'POST' })).status, 200);
  assert.equal((await member(first, 'session')).status, 200);
  const login = await member(second, 'login', {
    method: 'POST',
    body: { email: body.email, password: body.password },
  });
  assert.equal(login.status, 200);
  assert.equal(login.value.user.email, body.email);

  const snapshot = await makeStore().load();
  const users = snapshot.entries.filter(([table]) => table === 'users');
  assert.equal(users.length, 1);
  assert.match(JSON.parse(users[0][1]).password, /^scrypt:/);
  assert.ok(!JSON.stringify(snapshot).includes(body.password));
});
