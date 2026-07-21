import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import AdminNotification from '../../models/adminNotificationModel.js';
import {
  buildOrderNumber,
  buildSecureAdminOrderUrl,
  decodeNotificationCursor,
  encodeNotificationCursor,
  normalizePageSize,
} from '../../controllers/adminNotificationController.js';

test('notification cursors preserve timestamp and ObjectId ordering', () => {
  const notification = {
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date('2026-07-19T10:30:00.000Z'),
  };
  const cursor = encodeNotificationCursor(notification);
  const decoded = decodeNotificationCursor(cursor);

  assert.equal(decoded.createdAt.toISOString(), notification.createdAt.toISOString());
  assert.equal(decoded.id.toString(), notification._id.toString());
  assert.equal(decodeNotificationCursor('not-a-cursor').error, 'Invalid notification cursor');
});

test('notification page size has safe defaults and limits', () => {
  assert.equal(normalizePageSize(undefined), 12);
  assert.equal(normalizePageSize('0'), 12);
  assert.equal(normalizePageSize('8'), 8);
  assert.equal(normalizePageSize('500'), 50);
});

test('admin notification order URLs cannot leave the protected order route', () => {
  const orderId = new mongoose.Types.ObjectId().toString();

  assert.equal(buildSecureAdminOrderUrl(orderId), `/admin/orders/${orderId}`);
  assert.throws(() => buildSecureAdminOrderUrl('https://evil.example/order'));
  assert.equal(buildOrderNumber({ _id: orderId, orderNumber: 'AXS-000100' }), 'AXS-000100');
  assert.equal(buildOrderNumber({ _id: orderId }), orderId.slice(-8).toUpperCase());
});

test('AdminNotification schema stores unread state separately per user', () => {
  const paths = AdminNotification.schema.paths;

  assert.equal(paths.user.options.required, true);
  assert.equal(paths.order.options.required, true);
  assert.equal(paths.adminUrl.options.required, true);
  assert.equal(paths.isRead.options.default, false);
  assert.equal(paths.readAt.options.default, null);
});

test('admin notification routes require authentication and orders:read', async () => {
  const routeSource = await readFile(
    new URL('../../routes/adminNotificationRoutes.js', import.meta.url),
    'utf8'
  );

  assert.match(
    routeSource,
    /router\.use\(protect, requirePermission\(PERMISSIONS\.ORDERS_READ\)\)/
  );
});
