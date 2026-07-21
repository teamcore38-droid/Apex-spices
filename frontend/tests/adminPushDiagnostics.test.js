import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const adminPushSource = readFileSync(
  new URL('../src/utils/adminPush.js', import.meta.url),
  'utf8'
);
const dashboardSource = readFileSync(
  new URL('../src/pages/AdminDashboard.jsx', import.meta.url),
  'utf8'
);

test('admin push diagnostics treat Apple mobile browser tabs as install-required', () => {
  assert.match(adminPushSource, /installRequired = isAppleMobileBrowserContext\(\) && !isStandaloneDisplay\(\)/);
  assert.match(adminPushSource, /This Apple device can only enable Web Push from the installed Admin App/);
});

test('admin push subscription failures preserve the native browser error reason', () => {
  assert.match(adminPushSource, /AbortError/);
  assert.match(adminPushSource, /push service error/);
  assert.match(adminPushSource, /PUSH_SERVICE_UNAVAILABLE/);
  assert.match(adminPushSource, /could not register with its push service/);
});

test('admin dashboard renders the normalized push diagnostics to the UI', () => {
  assert.match(dashboardSource, /getPushAvailabilityMessage/);
  assert.match(dashboardSource, /\[admin-push:enable\]/);
  assert.match(dashboardSource, /BACKEND_SUBSCRIPTION_REJECTED/);
  assert.match(dashboardSource, /Web Push is available after you install the Admin App/);
});
