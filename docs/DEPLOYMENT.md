# Deploy DAGITAB

## Vercel with Supabase Postgres

Vercel serves the Vite frontend and runs the account and workspace API. The browser sends requests to the same-origin `/api` routes. Only the server-side function connects to Postgres.

1. In the target Supabase project's SQL Editor, run [the DAGITAB migration](../supabase/migrations/20261118000000_dagitab.sql). It creates the private `dagitab` schema and seeds the six team definitions. For an existing SQLite deployment, plan a separate data migration before switching live traffic. The schema migration does not copy registrations, accounts, projects, or tasks.
2. In Vercel's production environment variables, set `DATABASE_URL` to the Supabase **Transaction pooler** URI from **Connect**, using port 6543 and the URL-encoded database password. The function verifies TLS certificates and disables named prepared statements. Keep this variable server-side. Use an isolated database for previews that need working accounts.
3. Set `APP_ORIGIN` to the exact public HTTPS origin, for example `https://www.dagitab.xyz`. Deploy with the Vite preset and Node.js 24. Requests for mutations must originate from the configured site. When `APP_ORIGIN` is absent, the function uses the Vercel deployment hostname.
4. To provision an administrator, run the administrator command below from a trusted terminal with `DATABASE_URL` securely supplied to its process. Omit the `DAGITAB_DB_PATH` override for Postgres.
5. Verify `/api/teams` returns six teams. Register a disposable account, sign out and back in, then confirm the account and workspace still exist after a redeploy.

The standalone Node server and local development continue to use SQLite. The legacy proxy is available for existing Vercel configurations that set only `DAGITAB_API_ORIGIN`. When `DATABASE_URL` is present, the Vercel function uses Postgres.

## Legacy Vercel frontend with a persistent SQLite backend

1. Deploy the Node application on a host with the persistent, encrypted storage and HTTPS configuration described below. Provision the administrator on that host using its persistent database.
2. On the backend, set `NODE_ENV=production` and `APP_ORIGIN=https://www.dagitab.xyz` (or the exact public frontend origin). The proxy preserves this browser Origin for CSRF validation. Keep one canonical frontend origin; redirect alternate domains to it.
3. In Vercel project environment settings, set `DAGITAB_API_ORIGIN` to the backend's **exact HTTPS origin**, for example `https://accounts.example.org`. Do not include a path, trailing slash, credentials, or the frontend's own hostname. This is a service address, not a secret or browser `VITE_` variable.
4. Deploy this repository with the Vite preset, Node.js 24, build command `npm run build`, and output directory `dist`. The `api/[...path].mjs` function forwards only the app's allowed API routes to the configured backend; `vercel.json` supplies the frontend page rewrites.
5. Redeploy after setting the Vercel variable. Check `/api/session`, then register and sign in through the public website. Confirm member/team isolation and that registrations survive a backend restart. A successful frontend build alone does not verify the backend connection.

The function forwards cookies and CSRF headers without exposing the backend address to browser code. Session cookies are host-only, `Secure`, `HttpOnly`, and `SameSite=Strict` on the frontend. Requests are limited to 16 KiB and upstream calls time out after 10 seconds; redirects are rejected. Missing configuration returns a safe JSON 503 and an unavailable backend returns 502. No successful registration is simulated.

The backend hostname must resolve to the separate persistent Node host, not another alias of the Vercel frontend. Protect the backend with TLS and host-level request limits. The browser's frontend Origin must match `APP_ORIGIN`; configuring the backend's own hostname there would reject form submissions.

## Install and validate

From the repository root:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run build
npm test
npm run format:check
```

The cache directory is for the Codex cloud workspace; choose a writable cache on another host. `npm run dev` starts the local API on 3001 and Vite on 5173. `npm run preview` is a static frontend preview, not a full application server.

## Production requirements

- Put a trusted HTTPS reverse proxy in front of the Node server. Forward the entire site, including `/api`, to the same server. Restrict the server port to the proxy/private network.
- Set `APP_ORIGIN` to the exact public HTTPS origin, without a path or trailing slash. The server refuses production startup without an HTTPS origin. This value validates mutation requests; production cookies have the `Secure`, `HttpOnly`, and `SameSite=Strict` attributes.
- Mount an **encrypted persistent volume** for the database. SQLite is **unencrypted at rest in this application**. Encrypt backups, restrict their readers, and test restoration before collecting real registrations. Do not store the database in an ephemeral container filesystem, a public asset directory, or Git.
- Run under a dedicated, unprivileged operating-system user. Ensure only that user can read the database directory. The server sets owner-only permissions for new database files, but host access control and volume encryption remain deployment responsibilities.
- Run a single Node instance against a local database volume. The built-in attempt limiter is process-local; a public deployment should also enforce authentication/request rate limits at the proxy. If multiple replicas are needed, first introduce shared storage and rate limiting designed for that deployment.

Example environment and startup, after provisioning `/var/lib/dagitab` for the application user:

```sh
NODE_ENV=production \
APP_ORIGIN=https://example.org \
HOST=0.0.0.0 \
PORT=3001 \
DAGITAB_DB_PATH=/var/lib/dagitab/dagitab.sqlite \
npm start
```

`HOST=0.0.0.0` is appropriate only within the restricted container/private network behind the proxy. Use a process supervisor to restart the server. The production server serves the existing build; rerun `npm run build` after frontend changes.

## Create the first administrator

There is no default administrator or public role-selection field. Provision one from a trusted Bash terminal on the host, pointing the CLI at the **same database** as the server:

```bash
IFS= read -r -s -p 'Administrator password (12–128 characters): ' dagitab_admin_password
printf '\n'
printf '%s' "$dagitab_admin_password" | DAGITAB_DB_PATH=/var/lib/dagitab/dagitab.sqlite npm run admin:create -- admin@example.org "Administrator name"
unset dagitab_admin_password
```

Use the real administrator's email and name. The CLI reads the password from standard input, hashes it with a random salt using scrypt, and never prints it. It refuses to overwrite or promote an existing account with the same email. Sign in at `/admin/login`, create actual event projects, and configure team capacities or close registration as needed. No real projects or event capacities are seeded.

## Verify the deployed application

1. Check the homepage, starfield, logos, eight example work-area dialogs, roadmap tabs, mobile navigation, and event brief PDF. Confirm there are no missing assets or browser errors.
2. Open `/teams`; confirm Front-end, Back-end, Machine learning, Data, Research, and UI/UX & creative are separate teams with current availability.
3. Create a disposable member account through `/register`, confirm its team dashboard, sign out, and sign in again. No registration action should redirect to Notion.
4. Sign in as an administrator, inspect the member's registration details, create a project for that team, and configure availability. Verify closed/full teams reject new registrations.
5. As a team member, create a task, assign it to a teammate, and update its progress. Verify members of a different team cannot view or change that task, including direct API requests.
6. Restart the server and verify the account, project, and task remain. Check that cookies have the production security attributes and that cross-origin or missing-CSRF mutation requests are rejected. Follow your retention policy when removing disposable test records; no self-service account deletion is supplied.

Administrators can read registration names, emails, schools, expertise, and contribution notes. Team peers see teammates' names and team membership. Passwords and session tokens must never be included in logs or exports. Email verification and self-service password recovery are not implemented; arrange an operational account-support process before public registration.

Back up SQLite using a consistent method that includes committed WAL changes, such as SQLite's online backup facilities or a database stop/checkpoint procedure. Merely copying the main file while the app runs may omit current data. Test recovery on an isolated host and restrict access to the recovered data.

Publishing, domain setup, hosting, and encryption configuration are separate from local build/test verification.
