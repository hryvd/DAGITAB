// Build first, then run with a locally installed Chromium. Uses a disposable database.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { chromium } from 'playwright-core';
import { createApp, hashPassword } from '../server/app.mjs';

const directory = await mkdtemp(join(tmpdir(), 'dagitab-browser-'));
const app = createApp({ dbPath: join(directory, 'app.sqlite') });
await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.server.address().port}`;
const password = randomBytes(24).toString('base64url');
app.db
  .prepare(
    "INSERT INTO users (name,email,password,role,createdAt) VALUES (?,?,?,'admin',?)",
  )
  .run(
    'Event Admin',
    'admin@example.test',
    await hashPassword(password),
    Date.now(),
  );
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const errors = [];
const openedPages = [];
async function newPage() {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  openedPages.push(page);
  page.on('pageerror', (error) => errors.push(error.message));
  return page;
}
async function register(page, name, email, teamId) {
  await page.goto(`${base}/register?team=${teamId}`);
  await page.getByLabel('Full name', { exact: true }).fill(name);
  await page.getByLabel('School / organization').fill('Test University');
  await page.getByLabel('Email address').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByLabel('UI/UX design', { exact: true }).check();
  await page
    .getByLabel('How would you like to contribute?', { exact: false })
    .fill('Prototype and test accessible services.');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await page.waitForURL('**/dashboard');
  await page
    .getByRole('heading', { name: 'Small steps. Real impact.' })
    .waitFor();
}
try {
  const publicPage = await newPage();
  await publicPage.goto(base);
  assert.equal(await publicPage.locator('a[href*="notion"]').count(), 0);
  await publicPage.getByRole('link', { name: 'Teams', exact: true }).click();
  await publicPage
    .getByRole('heading', { name: 'Find your constellation.' })
    .waitFor();
  assert.equal(await publicPage.locator('.team-card').count(), 6);
  await publicPage.setViewportSize({ width: 375, height: 812 });
  assert.ok(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'teams fit mobile',
  );
  await publicPage.goto(`${base}/register?team=design`);
  await publicPage
    .getByRole('heading', { name: 'Join the collective', exact: true })
    .waitFor();
  assert.ok(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'registration fits mobile',
  );
  const member = await newPage();
  const colleague = await newPage();
  const outsider = await newPage();
  await register(member, 'Design Builder', 'designer@example.test', 'design');
  await register(
    colleague,
    'Design Colleague',
    'colleague@example.test',
    'design',
  );
  await register(outsider, 'Data Builder', 'data@example.test', 'data');
  assert.equal(
    await member.getByRole('button', { name: 'Team settings' }).count(),
    0,
  );
  const admin = await newPage();
  await admin.goto(`${base}/admin/login`);
  await admin.getByLabel('Email address').fill('admin@example.test');
  await admin.locator('input[name="password"]').fill(password);
  await admin.getByRole('button', { name: 'Sign in to workspace' }).click();
  await admin.waitForURL('**/dashboard');
  await admin.getByRole('button', { name: 'Projects', exact: true }).click();
  await admin.getByRole('button', { name: 'New project' }).click();
  const dialog = admin.getByRole('dialog');
  await dialog
    .getByRole('combobox', { name: 'Team', exact: true })
    .selectOption('design');
  await dialog.getByLabel('Project name').fill('Accessible service journey');
  await dialog
    .getByLabel('Description')
    .fill('Map and prototype a city service.');
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await admin
    .getByRole('combobox', {
      name: 'Project status for Accessible service journey',
    })
    .selectOption('active');
  await member.getByRole('button', { name: 'Refresh workspace' }).click();
  await member.getByRole('button', { name: 'Add task' }).click();
  const taskDialog = member.getByRole('dialog');
  await taskDialog
    .getByLabel('Task title')
    .fill('Prototype the registration flow');
  await taskDialog
    .getByRole('combobox', { name: 'Assign to', exact: true })
    .selectOption({ label: 'Design Colleague' });
  await taskDialog
    .getByRole('button', { name: 'Add task', exact: true })
    .click();
  await taskDialog.waitFor({ state: 'hidden' });
  await colleague.getByRole('button', { name: 'Refresh workspace' }).click();
  await colleague
    .getByRole('combobox', {
      name: 'Status for Prototype the registration flow',
      exact: true,
    })
    .selectOption('in_progress');
  await colleague
    .getByText('Task updated. Your team has the latest changes.')
    .waitFor();
  await colleague.reload();
  assert.equal(
    await colleague
      .getByRole('combobox', {
        name: 'Status for Prototype the registration flow',
        exact: true,
      })
      .inputValue(),
    'in_progress',
  );
  await outsider.getByRole('button', { name: 'Refresh workspace' }).click();
  assert.equal(
    await outsider
      .getByText('Prototype the registration flow', { exact: true })
      .count(),
    0,
  );
  if (process.env.DAGITAB_CAPTURE === '1') {
    await colleague.screenshot({
      path: '/tmp/dagitab-workspace.png',
      fullPage: true,
    });
    await publicPage.goto(`${base}/register`);
    await publicPage.screenshot({
      path: '/tmp/dagitab-registration.png',
      fullPage: true,
    });
  }
  await colleague.setViewportSize({ width: 375, height: 812 });
  assert.ok(
    await colleague.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'dashboard fits mobile',
  );
  await admin.getByRole('button', { name: 'Team members' }).click();
  await admin.getByText('designer@example.test', { exact: false }).waitFor();
  await admin.getByRole('button', { name: 'Team settings' }).click();
  const designSettings = admin.locator('.team-setting').filter({
    has: admin.getByRole('heading', {
      name: 'Creative and UI/UX',
      exact: true,
    }),
  });
  await designSettings.getByLabel('Member limit').fill('2');
  await designSettings.getByRole('button', { name: 'Save settings' }).click();
  await publicPage.goto(`${base}/teams/design`);
  await publicPage
    .locator('.team-detail')
    .getByText('Team full', { exact: false })
    .waitFor();
  await colleague.getByRole('button', { name: 'Sign out' }).click();
  await colleague.waitForURL('**/login');
  await colleague.goto(`${base}/dashboard`);
  await colleague.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log(
    'PASS browser: internal navigation, six teams, registration, admin login, projects, member delegation, persistence, team isolation, capacity, logout, and mobile widths.',
  );
} catch (error) {
  for (const [index, page] of openedPages.entries()) {
    await page
      .screenshot({ path: `/tmp/dagitab-smoke-${index}.png` })
      .catch(() => {});
    console.log(
      'Page',
      index,
      page.url(),
      (await page.locator('dialog[open]').count())
        ? await page.locator('dialog[open]').ariaSnapshot()
        : '',
    );
  }
  throw error;
} finally {
  await browser.close();
  await app.close();
  await rm(directory, { recursive: true, force: true });
}
