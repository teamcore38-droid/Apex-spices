import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import AdminNotification from '../../models/adminNotificationModel.js';
import NotificationOutbox from '../../models/notificationOutboxModel.js';
import {
  buildAdminNotificationContent,
  buildEventKey,
  buildOutboxPayload,
  endpointHash,
} from '../../utils/notificationOutboxService.js';
import { getRequestPublicUrl } from '../../middleware/qstashMiddleware.js';

const orderId = new mongoose.Types.ObjectId();

test('order notification event keys and payloads are deterministic', () => {
  const order = {
    _id: orderId,
    totalPrice: 3500.99,
    currency: 'lkr',
    paymentMethod: 'Card',
    paymentProvider: 'PayHere',
    paymentStatus: 'Paid',
    paidAt: new Date('2026-07-19T10:30:00.000Z'),
    shippingAddress: { fullName: 'Sam Customer' },
  };
  const payload = buildOutboxPayload(order, 'order.paid');

  assert.equal(buildEventKey('order.paid', orderId), `order.paid:${orderId}`);
  assert.equal(payload.orderId, String(orderId));
  assert.equal(payload.orderNumber, String(orderId).slice(-8).toUpperCase());
  assert.equal(payload.customerName, 'Sam Customer');
  assert.equal(payload.total, 3500.99);
  assert.equal(payload.currency, 'LKR');
  assert.equal(payload.adminUrl, `/admin/orders/${orderId}`);
});

test('admin push content includes required order and payment details', () => {
  const content = buildAdminNotificationContent({
    eventType: 'order.paid',
    eventKey: `order.paid:${orderId}`,
    payload: {
      orderId: String(orderId),
      orderNumber: 'ABC12345',
      customerName: 'Sam Customer',
      total: 3500.99,
      currency: 'LKR',
      paymentMethod: 'Card',
      paymentProvider: 'PayHere',
      paymentStatus: 'Paid',
      timestamp: '2026-07-19T10:30:00.000Z',
      adminUrl: `/admin/orders/${orderId}`,
    },
  });

  assert.equal(content.title, 'Order payment confirmed');
  assert.match(content.message, /ABC12345/);
  assert.match(content.message, /LKR 3,500\.99/);
  assert.match(content.message, /Card \(PayHere\)/);
  assert.match(content.message, /Paid/);
  assert.equal(content.pushPayload.url, `/admin/orders/${orderId}`);
  assert.equal(content.pushPayload.tag, `order.paid:${orderId}`);
});

test('outbox and history schemas enforce event idempotency', () => {
  const outboxEventIndex = NotificationOutbox.schema.indexes().find(
    ([fields]) => fields.eventKey === 1
  );
  const historyEventIndex = AdminNotification.schema.indexes().find(
    ([fields]) => fields.user === 1 && fields.sourceEventKey === 1
  );

  assert.equal(outboxEventIndex?.[1]?.unique, true);
  assert.equal(historyEventIndex?.[1]?.unique, true);
  assert.equal(NotificationOutbox.schema.paths.status.options.default, 'pending');
  assert.equal(AdminNotification.schema.paths.sourceEventKey.options.default, '');
  assert.equal(endpointHash('https://push.example/device'), endpointHash('https://push.example/device'));
});

test('QStash verification uses the externally visible request URL', () => {
  const req = {
    headers: {
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'api.apexspices.lk',
    },
    protocol: 'http',
    originalUrl: '/api/workers/admin-notifications',
    get: () => 'internal.vercel.app',
  };

  assert.equal(
    getRequestPublicUrl(req),
    'https://api.apexspices.lk/api/workers/admin-notifications'
  );
});

test('Phase 3 worker is signed, retry-safe, and deactivates expired devices', async () => {
  const [routeSource, serviceSource, notificationRoutes, orderSource, paymentSource] =
    await Promise.all([
      readFile(new URL('../../routes/notificationWorkerRoutes.js', import.meta.url), 'utf8'),
      readFile(new URL('../../utils/notificationOutboxService.js', import.meta.url), 'utf8'),
      readFile(new URL('../../routes/adminNotificationRoutes.js', import.meta.url), 'utf8'),
      readFile(new URL('../../controllers/orderController.js', import.meta.url), 'utf8'),
      readFile(new URL('../../controllers/paymentController.js', import.meta.url), 'utf8'),
    ]);

  assert.match(routeSource, /router\.use\(verifyQstashSignature\)/);
  assert.match(routeSource, /reconcileAdminNotificationOutbox/);
  assert.match(serviceSource, /Promise\.allSettled/);
  assert.match(serviceSource, /isExpiredPushSubscriptionError/);
  assert.match(serviceSource, /isActive: false/);
  assert.match(serviceSource, /sourceEventKey: outbox\.eventKey/);
  assert.doesNotMatch(notificationRoutes, /\/test/);
  assert.match(orderSource, /createOrderOutboxEvent\(createdOrder, 'order\.created'/);
  assert.match(orderSource, /runCheckoutNotificationsInBackground\('order-created'/);
  assert.doesNotMatch(orderSource, /await sendOrderConfirmationEmail\(populatedOrder\)/);
  assert.match(paymentSource, /createOrderOutboxEvent\(updatedOrder, 'order\.paid'/);
  assert.match(paymentSource, /if \(order\.isPaid\)[\s\S]*createOrderOutboxEvent\(order, 'order\.paid'/);
});
