# Deploy DAGITAB on Vercel

Deploy this static React/Vite site to the standard `vercel.app` address assigned by Vercel. No custom domain or DNS configuration is needed.

## Import from GitHub

1. Commit and push the website files, including `package-lock.json` and `vercel.json`, to the intended GitHub branch. Local files in a workspace are not visible to a Vercel Git import until pushed.
2. In Vercel, choose **Add New → Project**, connect GitHub if needed, and import **hryvd/DAGITAB**.
3. Choose the account/team that should own the website and confirm these settings:

   | Setting               | Value                         |
   | --------------------- | ----------------------------- |
   | Root directory        | Repository root (`.`)         |
   | Framework preset      | Vite                          |
   | Node.js version       | 24.x                          |
   | Install command       | `npm ci --no-audit --no-fund` |
   | Build command         | `npm run build`               |
   | Output directory      | `dist`                        |
   | Environment variables | None                          |

   `package.json` pins the Node major through `engines.node`; `vercel.json` supplies the framework and build settings.

4. Click **Deploy**. Wait for the deployment status to become **Ready**, then open the exact `vercel.app` URL Vercel returns. Do not assume a particular subdomain is available.

No deployment token is needed in this development environment for the Vercel dashboard workflow. The site itself has no backend, database, or secret requirements. Leave deployment credentials out of the Vercel application's environment variables.

## Verify before deployment

```sh
npm ci --no-audit --no-fund
npm run format:check
npm run build
npm run preview
```

The build output is `dist/`. Preview serves that output on port 4173. The public assets and locally hosted fonts are copied into the build automatically.

## Verify the deployed website

- Confirm the DAGITAB heading, particle artwork, glass navigation, and all eight role cards render.
- Open and close a role dialog; switch roadmap tabs and FAQ answers.
- Check the mobile menu and layout on a phone-sized screen.
- Open the event brief PDF and check the registration buttons use the supplied Notion page.
- Confirm the browser reports no missing assets or JavaScript errors.

Registration runs externally on Notion; a working website does not prove the external form accepts submissions.

## Deployment behavior

- Navigation uses page anchors, so no catch-all route rewrite is needed.
- Hashed files under `/assets/` receive long-lived immutable caching. HTML and the event PDF do not receive that rule.
- `.gitignore` and `.vercelignore` exclude local secrets, dependencies, build caches, and `.vercel/` account-link metadata.
- Vercel's Git integration can create preview deployments for pull requests and production deployments for the configured production branch.

## Optional CLI deployment

From a machine already authenticated with Vercel:

```sh
npx vercel
npx vercel --prod
```

Confirm the intended account/team and project when prompted. These commands publish the site; repository preparation alone does not. A custom domain can be configured separately later.
