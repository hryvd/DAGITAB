# Deploy DAGITAB with Google Sheets

In Google Sheets mode, the browser calls DAGITAB's same-origin `/api` on Vercel. The Vercel function authenticates to the Google Apps Script web app, which reads and writes the spreadsheet. Local development still uses SQLite.

## Set up the spreadsheet and Apps Script

1. Create a dedicated spreadsheet in the Google account that will own the Apps Script deployment. Keep the sheet private and limit editor access to people who need it. Copy the spreadsheet ID from the URL between `/d/` and `/edit`.
2. Open the Apps Script project for deployment `AKfycbykEzXjzhOHcWE4JWekmIiCZcUHmQyvnc2lteZopr7GtdT1RPKzHKZvvjtOdeopf6hZKg`. Add the contents of [Code.gs](../google-apps-script/Code.gs) and save.
3. In Apps Script, go to **Project Settings → Script properties**. Set `DAGITAB_SPREADSHEET_ID` to the spreadsheet ID and `DAGITAB_SHEETS_SECRET` to a randomly generated secret of at least 32 characters. Save the secret securely so you can enter the same value in Vercel.
4. Select **Deploy → Manage deployments**. Edit the existing web app deployment, choose **New version**, set **Execute as** to **Me**, and set **Who has access** to **Anyone**. Deploy and complete Google's consent prompt if it appears. Updating the existing deployment keeps its ID. The web app's access setting lets Vercel reach the endpoint. The shared secret controls access to DAGITAB data, and spreadsheet sharing stays restricted.

## Configure the Vercel deployment

Set these values under **Settings → Environment Variables** for **Production**.

| Name                          | Value                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `DAGITAB_DATABASE`            | `google-sheets`                                                              |
| `GOOGLE_SHEETS_DEPLOYMENT_ID` | `AKfycbykEzXjzhOHcWE4JWekmIiCZcUHmQyvnc2lteZopr7GtdT1RPKzHKZvvjtOdeopf6hZKg` |
| `DAGITAB_SHEETS_SECRET`       | The exact secret in Apps Script's Script properties                          |
| `APP_ORIGIN`                  | `https://www.dagitab.xyz` if this is the public production origin            |

Keep the secret server-side and omit the `VITE_` prefix for these variables. If preview deployments need accounts, give them a dedicated test spreadsheet and a separate script deployment and secret. Deploy the revision that contains Google Sheets support after saving the Production variables.

To create the first administrator on a new database, use the [administrator command](DEPLOYMENT.md#create-the-first-administrator) from a trusted terminal. Set `DAGITAB_DATABASE=google-sheets`, `GOOGLE_SHEETS_DEPLOYMENT_ID`, and `DAGITAB_SHEETS_SECRET` in that process and omit the SQLite path override.

## Move existing Supabase data

If the site already has Supabase records, pause writes to the site and import before deploying Google Sheets mode. Use a trusted terminal with the project's Node.js dependencies installed. Supply the source `DATABASE_URL` or `POSTGRES_URL`, the destination `GOOGLE_SHEETS_DEPLOYMENT_ID`, and `DAGITAB_SHEETS_SECRET` through the process environment.

```sh
node server/import-to-sheets.mjs
```

The command reads a consistent snapshot of Supabase and writes it only to an empty Sheets database. It preserves account password hashes, active sessions, team settings, projects, and tasks. Expired sessions, demo sessions, and rate-limit counters are omitted. The Supabase database stays intact. After a successful import, deploy Google Sheets mode, verify existing accounts and workspaces, and reopen registration.

## Verify production

1. Open [the production teams API](https://www.dagitab.xyz/api/teams) and confirm it returns six teams as JSON.
2. Open registration in a private browser window, submit a disposable account, sign out, and sign back in. Verify that the spreadsheet received the account and that the account's workspace loads.
3. Confirm that the disposable account still works after a redeploy. Handle the test record under your project's retention policy.

If the API returns a connection error, confirm that the deploy contains the Google Sheets code, the four variables are set for Production, the Apps Script web app points to its latest version, and the secret matches in both places. Review Vercel function logs and **Executions** in Apps Script to see which service received the request. Apps Script response requests can use both `script.google.com` and `script.googleusercontent.com`.

Google Apps Script and Google Sheets have execution and concurrency quotas. DAGITAB reads a database snapshot for each API request and limits snapshots to 5,000 database rows across accounts, sessions, team settings, projects, tasks, and rate-limit counters. Use this setup for a small event and monitor Apps Script execution errors during registration. Control access and retention for registration records and keep any backups private.
