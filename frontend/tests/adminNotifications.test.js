import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getSafeAdminNotificationUrl,
  mergeAdminNotifications,
} from '../src/utils/adminNotifications.js';

test('admin notifications are deduplicated and sorted newest first', () => {
  const notifications = mergeAdminNotifications(
    [
      { id: 'one', createdAt: '2026-07-19T10:00:00.000Z' },
      { id: 'two', createdAt: '2026-07-19T11:00:00.000Z' },
    ],
    [
      { id: 'one', createdAt: '2026-07-19T10:00:00.000Z', isRead: true },
      { id: 'three', createdAt: '2026-07-19T12:00:00.000Z' },
    ]
  );

  assert.deepEqual(notifications.map((item) => item.id), ['three', 'two', 'one']);
  assert.equal(notifications.find((item) => item.id === 'one').isRead, true);
});

test('notification navigation accepts only admin order routes', () => {
  const orderId = '507f1f77bcf86cd799439011';

  assert.equal(
    getSafeAdminNotificationUrl({ adminUrl: `/admin/orders/${orderId}`, orderId }),
    `/admin/orders/${orderId}`
  );
  assert.equal(getSafeAdminNotificationUrl({ adminUrl: 'https://evil.example' }), '/admin');
});

test('notification panel uses Mongo-backed count and read APIs', async () => {
  const source = await readFile(
    new URL('../src/components/AdminNotificationsPanel.jsx', import.meta.url),
    'utf8'
  );

  assert.match(source, /\/api\/admin\/notifications\/unread-count/);
  assert.match(source, /\/api\/admin\/notifications\/read-all/);
  assert.match(source, /\/api\/admin\/notifications\/test/);
  assert.match(source, /Mark All Read/);
});
