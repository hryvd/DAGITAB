import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  mkdirSync,
  chmodSync,
  realpathSync,
  lstatSync,
  readlinkSync,
} from 'node:fs';
import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { teams } from './teams.mjs';

const derive = promisify(scrypt);
const token = () => randomBytes(32).toString('base64url');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const HOUR = 3_600_000;
const SESSION_AGE = 12 * HOUR;
const teamIds = new Set(teams.map((team) => team.id));
const projectStatuses = new Set(['planned', 'active', 'done']);
const taskStatuses = new Set(['todo', 'in_progress', 'done']);
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

function canonicalPath(path, depth = 0) {
  if (depth > 40) throw new Error('Too many symbolic links in storage path.');
  let parent = resolve(path);
  const remainder = [];
  while (true) {
    try {
      if (lstatSync(parent).isSymbolicLink())
        return canonicalPath(
          resolve(dirname(parent), readlinkSync(parent), ...remainder),
          depth + 1,
        );
      return resolve(realpathSync(parent), ...remainder);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      remainder.unshift(basename(parent));
      parent = dirname(parent);
    }
  }
}

function requirePrivateStorage(dbPath, staticRoots) {
  if (dbPath === ':memory:') return;
  const candidate = canonicalPath(dbPath);
  for (const root of staticRoots) {
    const directory = canonicalPath(root);
    if (candidate === directory || candidate.startsWith(directory + sep))
      throw new Error(
        'Database storage must be outside public and dist directories.',
      );
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function text(value, label, min = 1, max = 160) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new HttpError(400, `${label} must be ${min}–${max} characters.`);
  return value.trim();
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128)
    throw new HttpError(400, 'Use a password between 12 and 128 characters.');
  return value;
}

export function isHostedEnvironment(environment = process.env) {
  return (
    environment.NODE_ENV === 'production' ||
    [
      'VERCEL',
      'RENDER',
      'FLY_APP_NAME',
      'RAILWAY_ENVIRONMENT_NAME',
      'DYNO',
      'AWS_LAMBDA_FUNCTION_NAME',
      'K_SERVICE',
    ].some((name) => Boolean(environment[name]))
  );
}

async function derivePassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt:32768:${salt}:${key.toString('hex')}`;
}

export const hashPassword = (password) =>
  derivePassword(validatePassword(password));

// Deliberately isolated from regular account validation and disabled on hosts.
export function hashLocalDemoPassword() {
  if (isHostedEnvironment())
    throw new Error(
      'Local demo accounts are disabled on deployed environments.',
    );
  return derivePassword('admin');
}

async function matchesPassword(password, stored) {
  const parts = stored.split(':');
  const [salt, hash] = parts.length === 4 ? parts.slice(2) : parts;
  const candidate = await derive(
    password,
    salt,
    64,
    parts.length === 4 ? SCRYPT_OPTIONS : undefined,
  );
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

export function openDatabase(dbPath) {
  requirePrivateStorage(dbPath, [
    resolve(repositoryRoot, 'public'),
    resolve(repositoryRoot, 'dist'),
  ]);
  if (dbPath !== ':memory:')
    mkdirSync(dirname(resolve(dbPath)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, open INTEGER NOT NULL DEFAULT 1,
      capacity INTEGER CHECK(capacity IS NULL OR capacity >= 0)
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL, school TEXT NOT NULL DEFAULT '',
      teamId TEXT REFERENCES teams(id), expertise TEXT NOT NULL DEFAULT '[]',
      intent TEXT NOT NULL DEFAULT '', role TEXT NOT NULL CHECK(role IN ('member','admin')),
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      tokenHash TEXT PRIMARY KEY, csrf TEXT NOT NULL,
      userId INTEGER REFERENCES users(id) ON DELETE CASCADE, expiresAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expiresAt);
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
      teamId TEXT NOT NULL REFERENCES teams(id),
      status TEXT NOT NULL CHECK(status IN ('planned','active','done'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY, projectId INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      teamId TEXT NOT NULL REFERENCES teams(id), assigneeId INTEGER REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('todo','in_progress','done')),
      createdBy INTEGER NOT NULL REFERENCES users(id)
    );
  `);
  const columns = new Set(
    db
      .prepare('PRAGMA table_info(users)')
      .all()
      .map((column) => column.name),
  );
  if (!columns.has('username'))
    db.exec('ALTER TABLE users ADD COLUMN username TEXT');
  if (!columns.has('localDemo'))
    db.exec(
      'ALTER TABLE users ADD COLUMN localDemo INTEGER NOT NULL DEFAULT 0',
    );
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(lower(username)) WHERE username IS NOT NULL',
  );
  const insert = db.prepare('INSERT OR IGNORE INTO teams (id) VALUES (?)');
  for (const team of teams) insert.run(team.id);
  if (dbPath !== ':memory:') {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        chmodSync(dbPath + suffix, 0o600);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  return db;
}

const publicUser = (row) =>
  row && {
    id: row.id,
    name: row.name,
    email: row.email,
    school: row.school,
    teamId: row.teamId,
    expertise: JSON.parse(row.expertise),
    role: row.role,
  };

async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw new HttpError(415, 'Send JSON with Content-Type: application/json.');
  const limit = 16_384;
  if (Number(req.headers['content-length']) > limit)
    throw new HttpError(413, 'Request is too large.');
  let payload;
  try {
    payload = req.body;
  } catch {
    throw new HttpError(400, 'Send a valid JSON object.');
  }
  if (payload === undefined) {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > limit) throw new HttpError(413, 'Request is too large.');
      chunks.push(buffer);
    }
    payload = Buffer.concat(chunks);
  }
  const serialized =
    Buffer.isBuffer(payload) || typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);
  if (Buffer.byteLength(serialized) > limit)
    throw new HttpError(413, 'Request is too large.');
  try {
    const data = JSON.parse(serialized);
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new HttpError(400, 'Send a valid JSON object.');
  }
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

export function createApp({
  database,
  dbPath = resolve('.data/dagitab.sqlite'),
  production = false,
  origin,
  useRequestHost = false,
  distPath = fileURLToPath(new URL('../dist', import.meta.url)),
} = {}) {
  if (
    production &&
    (origin ? new URL(origin).protocol !== 'https:' : !useRequestHost)
  )
    throw new Error(
      'Production requires APP_ORIGIN set to the public HTTPS origin.',
    );
  if (origin && new URL(origin).origin !== origin)
    throw new Error(
      'APP_ORIGIN must be an origin without a trailing slash or path.',
    );
  if (!database)
    requirePrivateStorage(dbPath, [
      distPath,
      resolve(repositoryRoot, 'public'),
    ]);
  const db = database || openDatabase(dbPath);
  const limits = new Map();
  const dummyPassword = `scrypt:32768:${'0'.repeat(32)}:${'0'.repeat(128)}`;

  function localDemoAllowed(req) {
    if (
      production ||
      isHostedEnvironment() ||
      req.headers['x-dagitab-proxy-hop']
    )
      return false;
    if (
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
        req.socket.remoteAddress,
      )
    )
      return false;
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    try {
      if (!localHosts.has(new URL(`http://${req.headers.host}`).hostname))
        return false;
      return (
        !req.headers.origin ||
        localHosts.has(new URL(req.headers.origin).hostname)
      );
    } catch {
      return false;
    }
  }

  async function rateLimit(
    req,
    kind,
    maximum,
    duration,
    subject = database
      ? req.headers['x-vercel-forwarded-for']?.split(',')[0].trim() ||
        req.socket.remoteAddress
      : req.socket.remoteAddress,
  ) {
    const key = `${kind}:${digest(subject || 'unknown')}`;
    if (database) {
      if ((await database.rateLimit(key, duration)) > maximum)
        throw new HttpError(429, 'Too many attempts. Please try again later.');
      return;
    }
    const now = Date.now();
    for (const [key, limit] of limits)
      if (limit.until <= now) limits.delete(key);
    const entry = limits.get(key) || { count: 0, until: now + duration };
    entry.count += 1;
    limits.set(key, entry);
    if (entry.count > maximum)
      throw new HttpError(429, 'Too many attempts. Please try again later.');
  }

  async function allTeams() {
    const rows = await db
      .prepare(
        `
      SELECT teams.id, open, capacity, CAST(COUNT(users.id) AS INTEGER) AS count
      FROM teams LEFT JOIN users ON users.teamId = teams.id AND users.role = 'member'
      GROUP BY teams.id, open, capacity
    `,
      )
      .all();
    const settings = new Map(rows.map((row) => [row.id, row]));
    return teams.map((team) => {
      const { open, capacity, count } = settings.get(team.id);
      return { ...team, open: Boolean(open), capacity, memberCount: count };
    });
  }

  async function session(req, res, create = false) {
    const raw = /(?:^|;\s*)dagitab_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(
      req.headers.cookie || '',
    )?.[1];
    let current =
      raw &&
      (await db
        .prepare('SELECT * FROM sessions WHERE tokenHash = ? AND expiresAt > ?')
        .get(digest(raw), Date.now()));
    if (current?.userId && !localDemoAllowed(req)) {
      const account = await db
        .prepare('SELECT localDemo FROM users WHERE id=?')
        .get(current.userId);
      if (account?.localDemo) {
        await db
          .prepare('DELETE FROM sessions WHERE tokenHash=?')
          .run(current.tokenHash);
        current = null;
      }
    }
    if (!current && create) {
      await rateLimit(req, 'session', 200, HOUR);
      current = await newSession(res, null);
    }
    return current || null;
  }

  function setCookie(res, value, maxAge) {
    res.setHeader(
      'Set-Cookie',
      `dagitab_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production ? '; Secure' : ''}`,
    );
  }

  async function newSession(res, userId, previousTokenHash) {
    const raw = token();
    const value = {
      tokenHash: digest(raw),
      csrf: token(),
      userId,
      expiresAt: Date.now() + SESSION_AGE,
    };
    await db
      .prepare('DELETE FROM sessions WHERE expiresAt <= ?')
      .run(Date.now());
    await db
      .prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)')
      .run(value.tokenHash, value.csrf, value.userId, value.expiresAt);
    if (previousTokenHash)
      await db
        .prepare('DELETE FROM sessions WHERE tokenHash = ?')
        .run(previousTokenHash);
    setCookie(res, raw, SESSION_AGE / 1000);
    return value;
  }

  async function requireUser(current, req) {
    const user =
      current?.userId &&
      (await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(current.userId));
    if (!user || (user.localDemo && !localDemoAllowed(req)))
      throw new HttpError(401, 'Please sign in to continue.');
    return user;
  }

  function requireAdmin(user) {
    if (user.role !== 'admin')
      throw new HttpError(403, 'Administrator access required.');
  }

  function requireTeam(user, teamId) {
    if (user.role !== 'admin' && user.teamId !== teamId)
      throw new HttpError(403, 'This resource belongs to another team.');
  }

  async function assignee(value, teamId) {
    if (value === null || value === undefined || value === '') return null;
    if (
      !Number.isSafeInteger(value) ||
      !(await db
        .prepare(
          "SELECT id FROM users WHERE id = ? AND teamId = ? AND role = 'member'",
        )
        .get(value, teamId))
    )
      throw new HttpError(400, 'Choose a member of this team.');
    return value;
  }

  function send(res, status, value) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify(value));
  }

  async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    if (production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      );
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const mutation = !['GET', 'HEAD'].includes(req.method);
      let current = await session(req, res);
      if (path.startsWith('/api/')) {
        if (mutation) {
          const expected =
            origin || `${production ? 'https' : 'http'}://${req.headers.host}`;
          if (
            req.headers.origin !== expected ||
            req.headers['sec-fetch-site'] === 'cross-site'
          )
            throw new HttpError(403, 'Request origin is not allowed.');
          if (
            !current ||
            typeof req.headers['x-csrf-token'] !== 'string' ||
            req.headers['x-csrf-token'] !== current.csrf
          )
            throw new HttpError(
              403,
              'Your session expired. Refresh the page and try again.',
            );
        }
        if (req.method === 'GET' && path === '/api/session') {
          current ||= await session(req, res, true);
          const user =
            current.userId &&
            (await db
              .prepare('SELECT * FROM users WHERE id = ?')
              .get(current.userId));
          return send(res, 200, {
            user: publicUser(user) || null,
            csrfToken: current.csrf,
          });
        }
        if (req.method === 'GET' && path === '/api/teams')
          return send(res, 200, { teams: await allTeams() });
        if (req.method === 'POST' && path === '/api/register') {
          await rateLimit(req, 'register', 10, HOUR);
          const body = await readJson(req);
          const name = text(body.name, 'Name', 2, 100);
          const email = text(body.email, 'Email', 3, 254).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            throw new HttpError(400, 'Enter a valid email address.');
          const school = text(body.school, 'School or organization', 2, 160);
          if (!teamIds.has(body.teamId))
            throw new HttpError(400, 'Choose a team.');
          if (
            !Array.isArray(body.expertise) ||
            !body.expertise.length ||
            body.expertise.length > 10
          )
            throw new HttpError(
              400,
              'Choose at least one area of expertise (up to 10).',
            );
          const expertise = [
            ...new Set(
              body.expertise.map((item) => text(item, 'Expertise', 1, 60)),
            ),
          ];
          const intent = text(body.intent || '', 'Your contribution', 0, 1000);
          const password = await hashPassword(body.password);
          let registered;
          try {
            registered = await db
              .prepare(
                `
              INSERT INTO users (name,email,password,school,teamId,expertise,intent,role,createdAt)
              SELECT ?,?,?,?,?,?,?,'member',?
              FROM teams WHERE id = ? AND open = 1 AND (
                capacity IS NULL OR capacity > (
                  SELECT COUNT(*) FROM users WHERE teamId = teams.id AND role = 'member'
                )
              )
              RETURNING *
            `,
              )
              .get(
                name,
                email,
                password,
                school,
                body.teamId,
                JSON.stringify(expertise),
                intent,
                Date.now(),
                body.teamId,
              );
          } catch (error) {
            if (
              error.code === '23505' ||
              (error.code === 'ERR_SQLITE_ERROR' &&
                error.message.includes('UNIQUE'))
            )
              throw new HttpError(
                409,
                'Unable to register with these details. Try signing in or use another email.',
              );
            if (
              error.code !== 'P0001' ||
              error.message !== 'dagitab_team_closed'
            )
              throw error;
          }
          if (!registered)
            throw new HttpError(
              409,
              'This team is not accepting registrations right now.',
            );
          current = await newSession(res, registered.id, current.tokenHash);
          return send(res, 201, {
            user: publicUser(registered),
            csrfToken: current.csrf,
          });
        }
        if (req.method === 'POST' && path === '/api/login') {
          await rateLimit(req, 'login', 30, 15 * 60_000);
          const body = await readJson(req);
          const identifier = text(
            body.identifier ?? body.email,
            'Email or username',
            3,
            254,
          ).toLowerCase();
          const password =
            typeof body.password === 'string' && body.password.length <= 128
              ? body.password
              : '';
          await rateLimit(req, 'login-account', 10, 15 * 60_000, identifier);
          const user = await db
            .prepare(
              'SELECT * FROM users WHERE email = ? OR lower(username) = ?',
            )
            .get(identifier, identifier);
          const valid = await matchesPassword(
            password,
            user?.password || dummyPassword,
          );
          if (!user || !valid || (user.localDemo && !localDemoAllowed(req)))
            throw new HttpError(
              401,
              'Email, username, or password is incorrect.',
            );
          current = await newSession(res, user.id, current.tokenHash);
          return send(res, 200, {
            user: publicUser(user),
            csrfToken: current.csrf,
          });
        }
        if (req.method === 'POST' && path === '/api/logout') {
          await db
            .prepare('DELETE FROM sessions WHERE tokenHash = ?')
            .run(current.tokenHash);
          setCookie(res, '', 0);
          return send(res, 200, { user: null });
        }
        const user = await requireUser(current, req);
        if (req.method === 'GET' && path === '/api/workspace') {
          const params = user.role === 'admin' ? [] : [user.teamId];
          const where = user.role === 'admin' ? '' : ' WHERE teamId = ?';
          const members =
            user.role === 'admin'
              ? (
                  await db
                    .prepare(
                      "SELECT id,name,email,school,teamId,expertise,intent FROM users WHERE role='member' ORDER BY name",
                    )
                    .all()
                ).map((member) => ({
                  ...member,
                  expertise: JSON.parse(member.expertise),
                }))
              : await db
                  .prepare(
                    "SELECT id,name,teamId FROM users WHERE teamId=? AND role='member' ORDER BY name",
                  )
                  .all(user.teamId);
          return send(res, 200, {
            projects: await db
              .prepare(`SELECT * FROM projects${where} ORDER BY id DESC`)
              .all(...params),
            tasks: await db
              .prepare(`SELECT * FROM tasks${where} ORDER BY id DESC`)
              .all(...params),
            members,
            teams: await allTeams(),
          });
        }
        if (req.method === 'POST' && path === '/api/projects') {
          requireAdmin(user);
          const body = await readJson(req);
          const title = text(body.title, 'Project title', 2, 160);
          const description = text(
            body.description || '',
            'Description',
            0,
            2000,
          );
          if (!teamIds.has(body.teamId))
            throw new HttpError(400, 'Choose a team.');
          const status = body.status || 'planned';
          if (!projectStatuses.has(status))
            throw new HttpError(400, 'Choose a valid project status.');
          const result = await db
            .prepare(
              'INSERT INTO projects (title,description,teamId,status) VALUES (?,?,?,?) RETURNING *',
            )
            .get(title, description, body.teamId, status);
          return send(res, 201, {
            project: result,
          });
        }
        if (req.method === 'POST' && path === '/api/tasks') {
          const body = await readJson(req);
          const project =
            Number.isSafeInteger(body.projectId) &&
            (await db
              .prepare('SELECT * FROM projects WHERE id = ?')
              .get(body.projectId));
          if (!project) throw new HttpError(404, 'Project not found.');
          requireTeam(user, project.teamId);
          const title = text(body.title, 'Task title', 2, 160);
          const description = text(
            body.description || '',
            'Description',
            0,
            2000,
          );
          const status = body.status || 'todo';
          if (!taskStatuses.has(status))
            throw new HttpError(400, 'Choose a valid task status.');
          const assigned = await assignee(body.assigneeId, project.teamId);
          const result = await db
            .prepare(
              'INSERT INTO tasks (projectId,title,description,teamId,assigneeId,status,createdBy) VALUES (?,?,?,?,?,?,?) RETURNING *',
            )
            .get(
              project.id,
              title,
              description,
              project.teamId,
              assigned,
              status,
              user.id,
            );
          return send(res, 201, {
            task: result,
          });
        }
        const projectMatch = /^\/api\/projects\/(\d+)$/.exec(path);
        if (req.method === 'PATCH' && projectMatch) {
          requireAdmin(user);
          const project = await db
            .prepare('SELECT * FROM projects WHERE id = ?')
            .get(Number(projectMatch[1]));
          if (!project) throw new HttpError(404, 'Project not found.');
          const body = await readJson(req);
          const title =
            body.title === undefined
              ? project.title
              : text(body.title, 'Project title', 2, 160);
          const description =
            body.description === undefined
              ? project.description
              : text(body.description, 'Description', 0, 2000);
          const status =
            body.status === undefined ? project.status : body.status;
          if (!projectStatuses.has(status))
            throw new HttpError(400, 'Choose a valid project status.');
          await db
            .prepare(
              'UPDATE projects SET title=?, description=?, status=? WHERE id=?',
            )
            .run(title, description, status, project.id);
          return send(res, 200, {
            project: await db
              .prepare('SELECT * FROM projects WHERE id = ?')
              .get(project.id),
          });
        }
        const taskMatch = /^\/api\/tasks\/(\d+)$/.exec(path);
        if (req.method === 'PATCH' && taskMatch) {
          const task = await db
            .prepare('SELECT * FROM tasks WHERE id = ?')
            .get(Number(taskMatch[1]));
          if (!task) throw new HttpError(404, 'Task not found.');
          requireTeam(user, task.teamId);
          const body = await readJson(req);
          const title =
            body.title === undefined
              ? task.title
              : text(body.title, 'Task title', 2, 160);
          const description =
            body.description === undefined
              ? task.description
              : text(body.description, 'Description', 0, 2000);
          const status = body.status === undefined ? task.status : body.status;
          if (!taskStatuses.has(status))
            throw new HttpError(400, 'Choose a valid task status.');
          const assigned =
            body.assigneeId === undefined
              ? task.assigneeId
              : await assignee(body.assigneeId, task.teamId);
          await db
            .prepare(
              'UPDATE tasks SET title=?,description=?,status=?,assigneeId=? WHERE id=?',
            )
            .run(title, description, status, assigned, task.id);
          return send(res, 200, {
            task: await db
              .prepare('SELECT * FROM tasks WHERE id=?')
              .get(task.id),
          });
        }
        const teamMatch = /^\/api\/teams\/([a-z]+)$/.exec(path);
        if (req.method === 'PATCH' && teamMatch) {
          requireAdmin(user);
          if (!teamIds.has(teamMatch[1]))
            throw new HttpError(404, 'Team not found.');
          const body = await readJson(req);
          const team = (await allTeams()).find(
            (item) => item.id === teamMatch[1],
          );
          const open = body.open === undefined ? team.open : body.open;
          const capacity =
            body.capacity === undefined ? team.capacity : body.capacity;
          if (
            typeof open !== 'boolean' ||
            (capacity !== null &&
              (!Number.isSafeInteger(capacity) ||
                capacity < team.memberCount ||
                capacity > 10000))
          )
            throw new HttpError(
              400,
              'Capacity must be unlimited or a whole number at least as large as current membership (maximum 10000).',
            );
          let updated;
          try {
            updated = await db
              .prepare(
                `
              UPDATE teams SET open=?, capacity=? WHERE id=? AND (
                CAST(? AS INTEGER) IS NULL OR CAST(? AS INTEGER) >= (SELECT COUNT(*) FROM users WHERE teamId = teams.id AND role = 'member')
              ) RETURNING id
            `,
              )
              .get(Number(open), capacity, team.id, capacity, capacity);
          } catch (error) {
            if (
              error.code !== 'P0001' ||
              error.message !== 'dagitab_team_capacity'
            )
              throw error;
          }
          if (!updated)
            throw new HttpError(
              409,
              'Team membership changed. Refresh and try again.',
            );
          return send(res, 200, { teams: await allTeams() });
        }
        throw new HttpError(404, 'API route not found.');
      }
      if (!['GET', 'HEAD'].includes(req.method))
        throw new HttpError(405, 'Method not allowed.');
      let decoded;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        throw new HttpError(400, 'Invalid URL.');
      }
      if (
        decoded.includes('\0') ||
        decoded.split('/').some((part) => part.startsWith('.')) ||
        /\.(?:sqlite|db)(?:[-.]|$)/i.test(decoded)
      )
        throw new HttpError(404, 'File not found.');
      let candidate = resolve(distPath, `.${decoded}`);
      const dist = await realpath(distPath);
      try {
        candidate = await realpath(candidate);
      } catch {
        if (extname(path)) throw new HttpError(404, 'File not found.');
        candidate = resolve(dist, 'index.html');
      }
      if (candidate === dist) candidate = resolve(dist, 'index.html');
      if (!candidate.startsWith(dist + sep))
        throw new HttpError(404, 'File not found.');
      const body = await readFile(candidate);
      res.writeHead(200, {
        'Content-Type':
          contentTypes[extname(candidate)] || 'application/octet-stream',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (!(error instanceof HttpError))
        console.error(
          'Request failed:',
          database ? error.code || error.name : error.message,
        );
      if (!res.headersSent)
        send(res, error instanceof HttpError ? error.status : 500, {
          error:
            error instanceof HttpError
              ? error.message
              : 'Something went wrong. Please try again.',
        });
      else res.end();
    }
  }
  const server = createServer(handler);
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return {
    server,
    handler,
    db,
    close: () =>
      new Promise((resolveClose, reject) =>
        server.close((error) => {
          Promise.resolve()
            .then(() => db.close())
            .then(() => (error ? reject(error) : resolveClose()), reject);
        }),
      ),
  };
}
