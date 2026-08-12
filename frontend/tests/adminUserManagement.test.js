import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('user-management sections are routed and linked from the admin dashboard', async () => {
  const [appSource, dashboardSource, pageSource] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminDashboard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AdminUserManagementPage.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(appSource, /path="\/admin\/users\/customers"/);
  assert.match(appSource, /path="\/admin\/users\/staff"/);
  assert.match(appSource, /path="\/admin\/users\/admins"/);
  assert.match(dashboardSource, /navigate\('\/admin\/users\/customers'\)/);
  assert.match(pageSource, /\/api\/admin\/users\/\$\{accountType\}/);
  assert.match(pageSource, /Customer Users/);
  assert.match(pageSource, /Staff Users/);
  assert.match(pageSource, /Admin Users/);
  assert.match(pageSource, /getSectionAccess/);
  assert.match(pageSource, /currentAccess\.manage/);
});
