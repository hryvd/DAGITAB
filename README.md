# DAGITAB

A responsive event website and team workspace for **CPET BISEG: DAGITAB — Building Integrated Systems for E-Governance**, a CURSOR-led collaborative initiative at Batangas State University.

The site introduces Digital Bayanihan, invites developers from BatStateU, LPU Batangas, and the University of Batangas, and explains the shared platform. Final modules and development order follow the highest priorities identified by Batangas City; the examples do not limit the scope.

## Run locally

Use Node.js **24.x**. `.nvmrc` records 24.19.0; this workflow also runs on 24.22.1. The API uses Node's built-in SQLite and cryptography modules; no external database service or API key is needed.

```sh
cd /workspace/DAGITAB
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev
```

`npm run dev` starts Vite on **5173** and the API on **127.0.0.1:3001**, with `/api` requests proxied by Vite. Run it from the repository root. The writable cache path above is suitable for this cloud environment. Local data is stored in ignored `.data/dagitab.sqlite`; set `DAGITAB_DB_PATH` to use another persistent location. Live processes need restarting in future sessions; use the existing isolated checkout rather than creating a worktree.

```sh
npm test
npm run format:check
npm run build
```

The production frontend is generated in `dist/`. `npm run preview` only previews those static files; use `npm run dev` or the Node production server for working account and workspace APIs.

## Accounts and team workspaces

Registration at `/register` stays inside DAGITAB. Developers choose Front-end, Back-end, Machine learning, Data, Research, or UI/UX & creative, select their expertise, and describe their intended contribution. `/teams` shows each team's focus and current registration availability. Administrators can close registration or set a capacity; no event capacity or real project is invented or seeded.

Members sign in at `/login`; administrators can use `/admin/login`. Both use the same server-side authentication, with roles enforced by the API. `/dashboard` shows the signed-in member's team projects, tasks, and teammates. Team members can create tasks, delegate them to teammates, and update progress. Administrators create projects for teams, manage registration availability, and view the registration roster across teams.

There is no default administrator. Bootstrap one in a Bash terminal using an email that is not already registered:

```bash
cd /workspace/DAGITAB
IFS= read -r -s -p 'Administrator password (12–128 characters): ' dagitab_admin_password
printf '\n'
printf '%s' "$dagitab_admin_password" | npm run admin:create -- admin@example.org "Administrator name"
unset dagitab_admin_password
```

Use the same `DAGITAB_DB_PATH` for the CLI and running server. Never put passwords in command arguments, source files, or chat. The CLI creates an administrator; registration always creates a member and cannot promote an account.

Passwords are salted and hashed with scrypt. Sessions use expiring HttpOnly cookies, CSRF tokens, and same-origin checks; production cookies also require HTTPS. The API checks team membership for task and project access. Team peers receive names and team membership; administrators can see registration email, school, expertise, and contribution details. The current release has no email verification or self-service password recovery.

**SQLite data is not encrypted by the application.** Production needs an encrypted persistent volume, encrypted backups, and restricted host access. See [the deployment guide](docs/DEPLOYMENT.md) for HTTPS, database, and startup requirements. A static-only Vercel deployment cannot run the account or team workspace APIs. Local checks do not publish the site or push files to GitHub.

## Content and branding

- `src/eventData.js` contains the internal registration path, schools, module descriptions, FAQs, and planned dates. Update event details when CURSOR confirms changes.
- `src/App.jsx` contains the public page structure and interactions. Work areas and suggested skills are illustrative; the city's priorities determine scope, while CURSOR confirms assignments and prerequisites.
- `src/Portal.jsx` contains registration, sign-in, teams, and dashboards. `server/app.mjs` enforces authentication, validation, and team access; `server/teams.mjs` defines team descriptions.
- `src/styles.css` and `src/redesign.css` define the base treatment and reveals. `src/orbit-theme.css` adds golden-orange accents and constellation details alongside purple, white, and black; `src/portal.css` styles account and workspace pages. `src/mobile.css` and `src/navigation.css` provide phone layouts and safe-area navigation.
- `src/liquid-glass.css` resolves glass highlights and fills. `src/GlassRefraction.jsx` progressively adds rounded-edge lens maps on compatible desktop pointers; foreground text and logos remain undistorted.
- `src/Starfield.jsx` and `src/starfield.css` add a decorative sky. Stars slowly brighten and dim, use fewer points on phones, and stay static for reduced motion.
- `src/GlassGraphics.jsx` provides original service-city, community, and system illustrations. `src/LogoParticles.jsx` forms the DAGITAB logo from spring-based particles, responds to pointers/taps, suspends rendering in hidden tabs, and respects reduced motion.
- `public/brand/dagitab-logo.svg` is the authoritative user-uploaded event logo. Its transparent viewport is trimmed for consistent display; the embedded silver artwork and original transforms are preserved. It also supplies the particle formation mask.
- Organization originals are `2.png` (BatStateU), `3.png` (CURSOR), `4.png` (UB Computer Engineering Students' Society), and `5.png` (LPU-B Microsoft Student Community). Vite imports these directly without recoloring them.
- Batangas City is the main recipient LGU. Its featured card uses a geographic outline, rather than an official seal. `public/organizations/batangas-city-map.svg` preserves the city's mainland and Verde Island boundary from NAMRIA / PSA via OCHA COD-AB, adapted from [James Faeldon's Philippines JSON Maps](https://github.com/faeldon/philippines-json-maps/blob/bf7060598ff5a5d160917f1dcb9622dbaef85ff7/latest/geojson/provdists/medres/municities-provdist-401000000.0.01.json), under [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). Source attribution and the derivative repository's MIT notice are preserved in the SVG metadata and this documentation.
- `public/dagitab-event-brief.pdf` is the user-supplied source document. Fonts are bundled locally through Fontsource; no third-party moodboard images are used.

Registration buttons open the app's own form. Account and task data stays in the configured SQLite database; protect that database and its backups as personal data.

## Date and event accuracy

The source document describes a collaborative initiative, not a competition. It lists November 2026–May 2027 as the program window, an online format, preparatory activities in October, and a joint Integration Day with venue details unconfirmed. Planned dates do not imply an activity has already happened. All listed times are Philippine Time.

No entry fee, deadline, prize, guaranteed certificate, confirmed LGU office, skill threshold, or final-stage date has been invented. Contact and social destinations are omitted where the source provides none.

## Interaction checks

Run `npm test` for API integration checks, including authentication, CSRF enforcement, team isolation, and task delegation. Before release, also build and check these flows in a browser:

- Eight role dialogs, including Escape, close buttons, focus trapping, and focus restoration.
- Three roadmap phases, with arrow-key, Home, and End navigation.
- FAQ expansion/collapse and mobile menu navigation/Escape dismissal.
- Internal registration, sign-in, team availability, administrator project creation, and team task delegation.
- Event brief PDF, logo particles, reduced motion, and scroll-triggered reveals.
- Responsive page widths from 320px to 1440px.

Confirm the published schedule, registration responsibilities, and privacy/retention arrangements with CURSOR before launching publicly.
