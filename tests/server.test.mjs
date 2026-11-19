import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApp, hashPassword } from '../server/app.mjs';

test('accounts, CSRF, team permissions, delegation, persistence, and private storage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dagitab-api-'));
  const dbPath = join(directory, 'private', 'dagitab.sqlite');
  let app = createApp({ dbPath });
  let base;
  const listen = async () => {
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
  };
  function client() {
    let cookie = '';
    let csrf = '';
    return {
      async request(
        path,
        { method = 'GET', body, origin = base, withCsrf = true } = {},
      ) {
        const response = await fetch(`${base}${path}`, {
          method,
          headers: {
            Cookie: cookie,
            Origin: origin,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(withCsrf ? { 'X-CSRF-Token': csrf } : {}),
          },
          body: body && JSON.stringify(body),
        });
        if (response.headers.has('set-cookie'))
          cookie = response.headers.get('set-cookie').split(';')[0];
        const value = await response.json();
        if (value.csrfToken) csrf = value.csrfToken;
        return { response, value };
      },
      get cookie() {
        return cookie;
      },
    };
  }
  const account = (email, teamId = 'frontend') => ({
    name: 'Test Developer',
    email,
    password: 'A test password 234!',
    school: 'Test University',
    teamId,
    expertise: ['Front-end'],
    intent: 'Build accessible services.',
  });
  const alice = client(),
    bob = client(),
    outsider = client(),
    admin = client();
  try {
    await listen();
    const session = await alice.request('/api/session');
    assert.equal(session.value.user, null);
    assert.match(
      session.response.headers.get('set-cookie'),
      /HttpOnly; SameSite=Strict/,
    );
    let result = await alice.request('/api/register', {
      method: 'POST',
      body: account('alice@example.test'),
      withCsrf: false,
    });
    assert.equal(result.response.status, 403);
    result = await alice.request('/api/register', {
      method: 'POST',
      body: account('alice@example.test'),
      origin: 'https://attacker.invalid',
    });
    assert.equal(result.response.status, 403);
    result = await alice.request('/api/register', {
      method: 'POST',
      body: { ...account('alice@example.test'), password: 'short' },
    });
    assert.equal(result.response.status, 400);
    result = await alice.request('/api/register', {
      method: 'POST',
      body: { ...account('alice@example.test'), role: 'admin' },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.value.user.role, 'member');
    assert.ok(!JSON.stringify(result.value).includes('password'));
    const aliceId = result.value.user.id;
    const oldCookie = alice.cookie;
    result = await alice.request('/api/admin/login', {
      method: 'POST',
      body: account('alice@example.test'),
    });
    assert.equal(result.response.status, 403);
    assert.equal(alice.cookie, oldCookie);
    assert.equal((await alice.request('/api/session')).value.user.id, aliceId);
    for (const [client_, email, teamId] of [
      [bob, 'bob@example.test', 'frontend'],
      [outsider, 'other@example.test', 'backend'],
    ]) {
      await client_.request('/api/session');
      result = await client_.request('/api/register', {
        method: 'POST',
        body: account(email, teamId),
      });
      assert.equal(result.response.status, 201);
    }
    const bobId = app.db
      .prepare('SELECT id FROM users WHERE email=?')
      .get('bob@example.test').id;
    const outsiderId = app.db
      .prepare('SELECT id FROM users WHERE email=?')
      .get('other@example.test').id;
    app.db
      .prepare(
        "INSERT INTO users(name,email,password,role,createdAt) VALUES(?,?,?,'admin',?)",
      )
      .run(
        'Coordinator',
        'admin@example.test',
        await hashPassword('Coordinator password 432!'),
        Date.now(),
      );
    await admin.request('/api/session');
    result = await admin.request('/api/login', {
      method: 'POST',
      body: { email: 'admin@example.test', password: 'wrong password' },
    });
    assert.equal(result.response.status, 401);
    result = await admin.request('/api/admin/login', {
      method: 'POST',
      body: {
        email: 'admin@example.test',
        password: 'Coordinator password 432!',
      },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.value.user.role, 'admin');
    result = await admin.request('/api/workspace');
    assert.equal(result.value.members.length, 3);
    assert.equal(
      result.value.members.find((member) => member.id === aliceId).intent,
      'Build accessible services.',
    );
    assert.deepEqual(
      result.value.members.find((member) => member.id === aliceId).expertise,
      ['Front-end'],
    );
    assert.ok(!JSON.stringify(result.value.members).includes('password'));
    result = await alice.request('/api/projects', {
      method: 'POST',
      body: { title: 'Secret project', teamId: 'frontend' },
    });
    assert.equal(result.response.status, 403);
    result = await admin.request('/api/projects', {
      method: 'POST',
      body: {
        title: 'Accessible city service',
        description: 'Deliver a usable service.',
        teamId: 'frontend',
        status: 'active',
      },
    });
    assert.equal(result.response.status, 201);
    const projectId = result.value.project.id;
    result = await alice.request(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: { status: 'done' },
    });
    assert.equal(result.response.status, 403);
    result = await admin.request(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: { status: 'done' },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.value.project.status, 'done');
    result = await outsider.request('/api/tasks', {
      method: 'POST',
      body: { projectId, title: 'Cross-team task' },
    });
    assert.equal(result.response.status, 403);
    result = await alice.request('/api/tasks', {
      method: 'POST',
      body: {
        projectId,
        title: 'Make form accessible',
        assigneeId: outsiderId,
      },
    });
    assert.equal(result.response.status, 400);
    result = await alice.request('/api/tasks', {
      method: 'POST',
      body: { projectId, title: 'Make form accessible', assigneeId: bobId },
    });
    assert.equal(result.response.status, 201);
    const taskId = result.value.task.id;
    result = await bob.request(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { status: 'in_progress', assigneeId: aliceId },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.value.task.assigneeId, aliceId);
    result = await outsider.request(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { status: 'done' },
    });
    assert.equal(result.response.status, 403);
    result = await outsider.request('/api/workspace');
    assert.deepEqual(result.value.projects, []);
    assert.deepEqual(result.value.tasks, []);
    assert.ok(
      result.value.members.every((member) => member.teamId === 'backend'),
    );
    assert.ok(!JSON.stringify(result.value).includes('alice@example.test'));
    result = await alice.request('/api/teams/frontend', {
      method: 'PATCH',
      body: { open: false },
    });
    assert.equal(result.response.status, 403);
    result = await admin.request('/api/teams/frontend', {
      method: 'PATCH',
      body: { capacity: 1 },
    });
    assert.equal(result.response.status, 400);
    result = await admin.request('/api/teams/frontend', {
      method: 'PATCH',
      body: { open: false, capacity: 2 },
    });
    assert.equal(result.response.status, 200);
    const late = client();
    await late.request('/api/session');
    result = await late.request('/api/register', {
      method: 'POST',
      body: account('late@example.test'),
    });
    assert.equal(result.response.status, 409);
    const row = app.db.prepare('SELECT * FROM users WHERE id=?').get(aliceId);
    assert.notEqual(row.password, account('x').password);
    assert.ok(
      !JSON.stringify(app.db.prepare('SELECT * FROM sessions').all()).includes(
        oldCookie.split('=')[1],
      ),
    );
    assert.equal((await stat(dbPath)).mode & 0o777, 0o600);
    assert.equal((await stat(join(directory, 'private'))).mode & 0o777, 0o700);
    for (const path of [
      '/.data/dagitab.sqlite',
      '/server/app.mjs',
      '/%2e%2e%2fserver%2fapp.mjs',
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.ok(!(await response.text()).includes('CREATE TABLE'));
    }
    assert.equal((await fetch(base + '/broken%ZZ')).status, 400);
    const staticDirectory = join(directory, 'web');
    await mkdir(staticDirectory);
    assert.throws(
      () =>
        createApp({
          dbPath: join(staticDirectory, 'private.sqlite'),
          distPath: staticDirectory,
        }),
      /outside public and dist/,
    );
    const symlinkPath = join(directory, 'database-link');
    await symlink(join(staticDirectory, 'not-created.sqlite'), symlinkPath);
    assert.throws(
      () => createApp({ dbPath: symlinkPath, distPath: staticDirectory }),
      /outside public and dist/,
    );
    await app.close();
    app = createApp({ dbPath });
    await listen();
    result = await alice.request('/api/session');
    assert.equal(result.value.user.id, aliceId);
    result = await alice.request('/api/workspace');
    assert.equal(result.value.tasks[0].status, 'in_progress');
    result = await alice.request('/api/logout', { method: 'POST', body: {} });
    assert.equal(result.response.status, 200);
    assert.equal((await alice.request('/api/workspace')).response.status, 401);
    assert.throws(
      () => createApp({ dbPath: ':memory:', production: true }),
      /HTTPS/,
    );
    const secure = createApp({
      dbPath: ':memory:',
      production: true,
      origin: 'https://dagitab.example',
    });
    await new Promise((resolve) =>
      secure.server.listen(0, '127.0.0.1', resolve),
    );
    const secureSession = await fetch(
      `http://127.0.0.1:${secure.server.address().port}/api/session`,
    );
    assert.match(secureSession.headers.get('set-cookie'), /; Secure/);
    await secure.close();
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('explicit local admin demo preserves accounts and is rejected on hosted origins and production', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dagitab-demo-'));
  const dbPath = join(directory, 'demo.sqlite');
  const demoEnvironment = {
    ...process.env,
    NODE_ENV: 'development',
    DAGITAB_DB_PATH: dbPath,
  };
  const runDemo = (environment = {}) =>
    spawnSync(process.execPath, ['server/admin-demo.mjs'], {
      cwd: new URL('../', import.meta.url),
      env: { ...demoEnvironment, ...environment },
      encoding: 'utf8',
    });
  let app;
  try {
    assert.equal(runDemo().status, 0);
    app = createApp({ dbPath });
    const original = app.db
      .prepare('SELECT * FROM users WHERE username=?')
      .get('admin');
    assert.equal(original.localDemo, 1);
    assert.equal(original.role, 'admin');
    assert.notEqual(original.password, 'admin');
    assert.equal(runDemo().status, 1);
    assert.equal(
      app.db.prepare('SELECT password FROM users WHERE username=?').get('admin')
        .password,
      original.password,
    );
    assert.equal(runDemo({ NODE_ENV: 'production' }).status, 1);
    assert.equal(runDemo({ VERCEL: '1' }).status, 1);
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${app.server.address().port}`;
    let session = await fetch(`${base}/api/session`);
    let cookie = session.headers.get('set-cookie').split(';')[0];
    let { csrfToken } = await session.json();
    const login = async (host, origin) =>
      fetch(`${base}/api/login`, {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: origin || base,
          Host: host || new URL(base).host,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ identifier: 'admin', password: 'admin' }),
      });
    assert.ok(
      [401, 403].includes(
        (await login('events.example.test', 'http://events.example.test'))
          .status,
      ),
    );
    let response = await login();
    assert.equal(response.status, 200);
    cookie = response.headers.get('set-cookie').split(';')[0];
    csrfToken = (await response.json()).csrfToken;
    assert.equal(
      (await fetch(`${base}/api/workspace`, { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    response = await fetch(`${base}/api/register`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: base,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        name: 'Weak account',
        email: 'weak@example.test',
        password: 'admin',
        school: 'Test school',
        teamId: 'frontend',
        expertise: ['Data'],
        localDemo: 1,
        role: 'admin',
      }),
    });
    assert.equal(response.status, 400);
    await app.close();
    app = createApp({
      dbPath,
      production: true,
      origin: 'https://www.dagitab.xyz',
    });
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const productionBase = `http://127.0.0.1:${app.server.address().port}`;
    response = await fetch(`${productionBase}/api/workspace`, {
      headers: { Cookie: cookie },
    });
    assert.equal(
      response.status,
      401,
      'Existing demo sessions cannot access production resources.',
    );
    session = await fetch(`${productionBase}/api/session`);
    cookie = session.headers.get('set-cookie').split(';')[0];
    csrfToken = (await session.json()).csrfToken;
    response = await fetch(`${productionBase}/api/login`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: 'https://www.dagitab.xyz',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ identifier: 'admin', password: 'admin' }),
    });
    assert.equal(
      response.status,
      401,
      'Production rejects demo username and password.',
    );
  } finally {
    if (app) await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
