# DAGITAB

A responsive event website for **CPET BISEG: DAGITAB — Building Integrated Systems for E-Governance**, a CURSOR-led collaborative initiative at Batangas State University.

The site introduces Digital Bayanihan, invites student developers from BatStateU, LPU Batangas, and the University of Batangas, and explains the shared platform, eight modules, program stages, and participation expectations.

## Run locally

Use Node.js 24 (the tested version is pinned in `.nvmrc`).

```sh
cd /workspace/DAGITAB
npm ci
npm run dev
```

Vite serves the development site on port **5173**. If the runtime restricts opening local sockets, run the server through the environment's supported approval mechanism.

```sh
npm run build
npm run preview
```

The production build is generated in `dist/`; preview uses port **4173**. Deploy that directory to any static website host. No database, API keys, or application backend are required. Live development processes need restarting in future sessions; use the existing isolated checkout rather than creating a worktree.

## Deploy on Vercel

Commit and push the project files to GitHub, then import the repository in **Vercel → Add New → Project**. Use the repository root, the **Vite** preset, and Node.js **24.x**. The checked-in `vercel.json` sets the install command, build command, and `dist` output directory.

Click **Deploy** and use the `vercel.app` URL Vercel assigns. No custom domain, DNS changes, application environment variables, or API keys are required. Dashboard imports do not require a `VERCEL_TOKEN` in this cloud environment.

See [the deployment guide](docs/DEPLOYMENT.md) for exact settings and verification. Local build verification does not publish the site or push files to GitHub.

## Content and branding

- `src/eventData.js` contains the official Notion registration URL, schools, module descriptions, FAQs, and planned dates. Update it when CURSOR confirms changes.
- `src/App.jsx` contains the page structure and interactions. Suggested skills on role cards are illustrative; final assignments and prerequisites belong to CURSOR.
- `src/styles.css` contains base responsive styles; `src/redesign.css` defines the black/silver brand treatment, reveals, and layout. `src/liquid-glass.css` adds shared glass surfaces. `src/GlassRefraction.jsx` computes rounded-edge lens maps from each panel’s actual size and corner radius; clear centers remain undistorted and unsupported browsers retain native blur. Foreground text and logos remain sharp.
- `src/GlassGraphics.jsx` provides original SVG service-city, community, and system illustrations, plus the straight-line underlays visible through glass cards. Page backgrounds remain pure black.
- `src/LogoParticles.jsx` samples the actual DAGITAB logo into a spring-based particle system. Particles assemble into the logo, respond to pointer movement and taps, and reform. Replay and global pause controls are available; offscreen/hidden tabs suspend rendering and reduced-motion preferences show a static logo immediately.
- `public/brand/dagitab-logo.svg` is the authoritative event logo uploaded by the user. Only its oversized transparent viewport is trimmed for consistent display; the embedded high-resolution silver artwork, colors, and original transforms are preserved. This same SVG appears in the header/footer and supplies the particle formation mask.
- The uploaded organization originals are `2.png` (BatStateU), `3.png` (CURSOR), `4.png` (UB Computer Engineering Students’ Society), and `5.png` (LPU-B Microsoft Student Community). Vite imports these directly; all four marks are centered without recoloring or altering the originals.
- `public/dagitab-event-brief.pdf` is the user-supplied source document.
- Fonts are bundled locally through Fontsource. No third-party moodboard images are used.

Registration buttons open the **user-provided official Notion page** in a new tab. This website does not collect, store, or submit student information itself. The Notion form's availability and submission behavior are managed externally.

## Date and event accuracy

The source document describes a collaborative initiative, not a competition. It lists November 2026–May 2027 as the program window, an online format, preparatory activities in October, and a joint Integration Day with venue details unconfirmed. The site preserves these distinctions. Planned dates do not imply an activity has already happened. All listed times are Philippine Time.

No entry fee, deadline, prize, guaranteed certificate, confirmed LGU office, skill threshold, or final-stage date has been invented. Contact and social destinations are omitted where the source provides none.

## Interaction checks

Production compilation and Chromium desktop/mobile checks are used to validate this implementation:

- Eight role dialogs, including Escape, close buttons, native focus trapping, and focus restoration.
- All three roadmap phases, with arrow-key, Home, and End navigation.
- FAQ expansion and collapse.
- Mobile menu navigation and Escape dismissal.
- Official registration links and downloadable PDF.
- Visible logo formation, pointer/tap scattering, replay, global pause/resume, and reduced-motion rendering.
- Scroll-triggered section reveals, animated system connections, and page progress.
- Responsive page widths from 320px to 1440px.

Check the external form and confirm the published schedule with CURSOR before launching the site publicly.
