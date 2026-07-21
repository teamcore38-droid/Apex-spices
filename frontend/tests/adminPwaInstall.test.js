import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboardSource = readFileSync(
  new URL('../src/pages/AdminDashboard.jsx', import.meta.url),
  'utf8'
);
const installSource = readFileSync(
  new URL('../src/utils/adminPwaInstall.js', import.meta.url),
  'utf8'
);
const mainSource = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const adminManifest = readFileSync(
  new URL('../public/admin.webmanifest', import.meta.url),
  'utf8'
);

test('admin dashboard exposes an install app control in the sidebar', () => {
  assert.match(dashboardSource, /Install Admin App/);
  assert.match(dashboardSource, /Admin App Installed/);
  assert.match(dashboardSource, /showAdminInstallButton/);
  assert.match(dashboardSource, /promptAdminPwaInstall/);
});

test('admin install control provides iOS add to home screen guidance', () => {
  assert.match(dashboardSource, /Tap the Share icon/);
  assert.match(dashboardSource, /Select Add to Home Screen/);
  assert.match(dashboardSource, /Open Apex Admin from your Home Screen/);
});

test('admin PWA install prompt is captured globally and uses admin manifest', () => {
  assert.match(mainSource, /utils\/adminPwaInstall/);
  assert.match(installSource, /beforeinstallprompt/);
  assert.match(installSource, /event\.preventDefault\(\)/);
  assert.match(installSource, /\/admin\.webmanifest\?v=20260721/);
  assert.match(installSource, /display-mode: standalone/);
});

test('admin PWA manifest opens directly to the protected admin dashboard', () => {
  const manifest = JSON.parse(adminManifest);

  assert.equal(manifest.name, 'Apex Spices Admin');
  assert.equal(manifest.start_url, '/admin?source=admin-pwa');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.length >= 2);
});
