import crypto from 'crypto';
import mongoose from 'mongoose';
import { Client } from '@upstash/qstash';
import AdminNotification from '../models/adminNotificationModel.js';
import NotificationOutbox from '../models/notificationOutboxModel.js';
import PushSubscription from '../models/pushSubscriptionModel.js';
import User from '../models/userModel.js';
import { hasPermission, PERMISSIONS } from './permissions.js';
import {
  isExpiredPushSubscriptionError,
  sendWebPushNotification,
} from './pushService.js';

const WORKER_PATH = '/api/workers/admin-notifications';
const PUBLISH_LEASE_MS = 60 * 1000;
const PROCESSING_LEASE_MS = 5 * 60 * 1000;
const STALE_PUBLISHED_MS = 15 * 60 * 1000;
const MAX_RECONCILE_BATCH = 50;

let qstashClientSignature = '';
let qstashClient = null;

const normalizeBaseUrl = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const getQstashConfiguration = () => ({
  baseUrl: normalizeBaseUrl(process.env.QSTASH_URL || 'https://qstash.upstash.io'),
  token: String(process.env.QSTASH_TOKEN || '').trim(),
});

const isQstashConfigured = () => {
  const configuration = getQstashConfiguration();
  return Boolean(configuration.baseUrl && configuration.token);
};

const getQstashClient = () => {
  const configuration = getQstashConfiguration();
  if (!isQstashConfigured()) {
    const error = new Error('QStash publishing is not configured');
    error.code = 'QSTASH_NOT_CONFIGURED';
    throw error;
  }

  const signature = `${configuration.baseUrl}:${configuration.token}`;
  if (!qstashClient || signature !== qstashClientSignature) {
    qstashClient = new Client({
      baseUrl: configuration.baseUrl,
      token: configuration.token,
      enableTelemetry: false,
      retry: { retries: 2 },
    });
    qstashClientSignature = signature;
  }

  return qstashClient;
};

const resolveBackendBaseUrl = (req = null) => {
  const explicitUrl = normalizeBaseUrl(
    process.env.BACKEND_PUBLIC_URL || process.env.API_PUBLIC_URL || ''
  );
  if (explicitUrl) {
    return explicitUrl;
  }

  if (req) {
    const forwardedProtocol = String(req.headers?.['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim();
    const forwardedHost = String(req.headers?.['x-forwarded-host'] || '')
      .split(',')[0]
      .trim();
    const host = forwardedHost || req.get?.('host');
    if (host) {
      return `${forwardedProtocol || req.protocol || 'https'}://${host}`;
    }
  }

  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || ''
  );
  if (vercelUrl) {
    return /^https?:\/\//i.test(vercelUrl) ? vercelUrl : `https://${vercelUrl}`;
  }

  return normalizeBaseUrl(process.env.PAYHERE_NOTIFY_URL || '').replace(
    /\/api\/payments\/payhere\/notify$/i,
    ''
  );
};

const resolveWorkerUrl = (req = null) => {
  const explicitWorkerUrl = String(process.env.QSTASH_WORKER_URL || '').trim();
  if (explicitWorkerUrl) {
    return explicitWorkerUrl;
  }

  const baseUrl = resolveBackendBaseUrl(req);
  return baseUrl ? `${baseUrl}${WORKER_PATH}` : '';
};

const getOrderNumber = (order = {}) => {
  const explicitNumber = String(order.orderNumber || '').trim();
  if (explicitNumber) {
    return explicitNumber;
  }

  const orderId = String(order._id || '');
  return orderId ? orderId.slice(-8).toUpperCase() : '';
};

const getCustomerName = (order = {}) =>
  String(
    order.user?.name ||
      order.guestCustomer?.name ||
      order.shippingAddress?.fullName ||
      'Customer'
  ).trim();

const buildOutboxPayload = (order, eventType) => {
  const orderId = String(order?._id || '');
  if (!mongoose.isValidObjectId(orderId)) {
    throw new Error('A valid order is required to create a notification outbox event');
  }

  return {
    orderId,
    orderNumber: getOrderNumber(order),
    customerName: getCustomerName(order),
    total: Number(order.totalPrice || 0),
    currency: String(order.currency || 'LKR').trim().toUpperCase(),
    paymentMethod: String(order.paymentMethod || order.paymentProvider || 'Not specified').trim(),
    paymentProvider: String(order.paymentProvider || '').trim(),
    paymentStatus: String(
      order.paymentStatus || (order.isPaid ? 'Paid' : 'Payment Pending')
    ).trim(),
    timestamp: new Date(
      eventType === 'order.paid'
        ? order.paidAt || order.updatedAt || Date.now()
        : order.createdAt || Date.now()
    ).toISOString(),
    adminUrl: `/admin/orders/${orderId}`,
  };
};

const buildEventKey = (eventType, orderId) => `${eventType}:${String(orderId)}`;

const createOrderOutboxEvent = async (order, eventType, { request = null } = {}) => {
  if (!['order.created', 'order.paid'].includes(eventType)) {
    throw new Error(`Unsupported notification outbox event: ${eventType}`);
  }

  const payload = buildOutboxPayload(order, eventType);
  const eventKey = buildEventKey(eventType, payload.orderId);
  const workerUrl = resolveWorkerUrl(request);

  try {
    return await NotificationOutbox.findOneAndUpdate(
      { eventKey },
      {
        $setOnInsert: {
          eventKey,
          eventType,
          order: payload.orderId,
          payload,
          status: 'pending',
          nextAttemptAt: new Date(),
        },
        ...(workerUrl ? { $set: { workerUrl } } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return NotificationOutbox.findOne({ eventKey });
    }
    throw error;
  }
};

const getRetryDate = (attempts = 1) => {
  const delayMs = Math.min(15 * 60 * 1000, Math.max(15 * 1000, 2 ** attempts * 1000));
  return new Date(Date.now() + delayMs);
};

const serializeError = (error, fallback = 'Notification delivery failed') =>
  String(error?.message || error?.body || fallback).slice(0, 500);

const publishOutboxRecord = async (outboxId) => {
  if (!mongoose.isValidObjectId(outboxId)) {
    throw new Error('Invalid notification outbox id');
  }

  const now = new Date();
  const record = await NotificationOutbox.findOneAndUpdate(
    {
      _id: outboxId,
      status: { $in: ['pending', 'failed'] },
      nextAttemptAt: { $lte: now },
      $or: [
        { publishLockedUntil: null },
        { publishLockedUntil: { $exists: false } },
        { publishLockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'publishing',
        failureStage: '',
        lastError: '',
        publishLockedUntil: new Date(now.getTime() + PUBLISH_LEASE_MS),
      },
      $inc: { publishAttempts: 1 },
    },
    { new: true }
  );

  if (!record) {
    return { skipped: true, reason: 'not-ready-or-already-published' };
  }

  try {
    if (!record.workerUrl || !/^https:\/\//i.test(record.workerUrl)) {
      throw new Error('A public HTTPS QStash worker URL is required');
    }

    const response = await getQstashClient().publishJSON({
      url: record.workerUrl,
      body: {
        outboxId: String(record._id),
        eventKey: record.eventKey,
      },
      deduplicationId: `${record.eventKey}:publish:${record.publishAttempts}`,
      retries: 5,
      retryDelay: 'max(1000, pow(2, retried) * 1000)',
    });

    const messageId = String(response?.messageId || '').trim();
    await NotificationOutbox.updateOne(
      { _id: record._id, status: 'publishing' },
      {
        $set: {
          status: 'published',
          publishedAt: new Date(),
          publishLockedUntil: null,
          nextAttemptAt: null,
        },
        ...(messageId ? { $addToSet: { qstashMessageIds: messageId } } : {}),
      }
    );

    return { skipped: false, messageId };
  } catch (error) {
    await NotificationOutbox.updateOne(
      { _id: record._id, status: 'publishing' },
      {
        $set: {
          status: 'failed',
          failureStage: 'publish',
          lastError: serializeError(error, 'Unable to publish notification outbox event'),
          nextAttemptAt: getRetryDate(record.publishAttempts),
          publishLockedUntil: null,
        },
      }
    );
    throw error;
  }
};

const publishOutboxInBackground = (outboxId) => {
  Promise.resolve()
    .then(() => publishOutboxRecord(outboxId))
    .catch((error) => {
      console.error(`[notificationOutbox:publish:${outboxId}]`, error);
    });
};

const formatAmount = (amount, currency) => {
  const numericAmount = Number(amount || 0);
  return `${currency || 'LKR'} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)}`;
};

const buildAdminNotificationContent = (outbox) => {
  const payload = outbox.payload || {};
  const title = outbox.eventType === 'order.paid'
    ? 'Order payment confirmed'
    : 'New order received';
  const paymentMethod = payload.paymentProvider && payload.paymentProvider !== payload.paymentMethod
    ? `${payload.paymentMethod} (${payload.paymentProvider})`
    : payload.paymentMethod;
  const timestamp = new Date(payload.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Colombo',
  });
  const message = [
    `Order #${payload.orderNumber}`,
    payload.customerName,
    formatAmount(payload.total, payload.currency),
    paymentMethod,
    payload.paymentStatus,
    timestamp,
  ].filter(Boolean).join(' | ');

  return {
    title,
    message,
    pushPayload: {
      title,
      body: message,
      type: outbox.eventType,
      eventKey: outbox.eventKey,
      tag: outbox.eventKey,
      url: payload.adminUrl,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      total: payload.total,
      currency: payload.currency,
      paymentMethod,
      paymentStatus: payload.paymentStatus,
      timestamp: payload.timestamp,
    },
  };
};

const getAuthorizedOrderAdmins = async () => {
  const candidates = await User.find({
    $or: [
      { isAdmin: true },
      { isStaff: true, staffStatus: 'Active' },
    ],
  }).select('_id isAdmin isStaff role staffPermissions staffStatus');

  return candidates.filter((user) => hasPermission(user, PERMISSIONS.ORDERS_READ));
};

const endpointHash = (endpoint = '') =>
  crypto.createHash('sha256').update(String(endpoint)).digest('hex');

const acquireOutboxForProcessing = async (outboxId) => {
  const now = new Date();
  return NotificationOutbox.findOneAndUpdate(
    {
      _id: outboxId,
      status: { $in: ['pending', 'publishing', 'published', 'failed'] },
      $or: [
        { processingLockedUntil: null },
        { processingLockedUntil: { $exists: false } },
        { processingLockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'processing',
        failureStage: '',
        processingLockedUntil: new Date(now.getTime() + PROCESSING_LEASE_MS),
        lastError: '',
      },
      $inc: { processAttempts: 1 },
    },
    { new: true }
  );
};

const ensureAdminHistory = async (outbox, admins, content) => {
  if (admins.length === 0) {
    return [];
  }

  return Promise.all(
    admins.map((admin) =>
      AdminNotification.findOneAndUpdate(
        { user: admin._id, sourceEventKey: outbox.eventKey },
        {
          $setOnInsert: {
            user: admin._id,
            sourceEventKey: outbox.eventKey,
            type: outbox.eventType,
            title: content.title,
            message: content.message,
            order: outbox.order,
            orderNumber: outbox.payload.orderNumber,
            adminUrl: outbox.payload.adminUrl,
            isRead: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
};

const prepareDeviceDeliveries = async (outbox, subscriptions) => {
  const deliveryBySubscription = new Map(
    outbox.deviceDeliveries.map((delivery) => [String(delivery.subscription), delivery])
  );

  for (const delivery of outbox.deviceDeliveries) {
    if (delivery.status === 'sending') {
      delivery.status = 'unknown';
      delivery.error = 'Previous delivery outcome is unknown; skipped to prevent a duplicate push.';
    }
  }

  const candidates = [];
  for (const subscription of subscriptions) {
    const subscriptionId = String(subscription._id);
    let delivery = deliveryBySubscription.get(subscriptionId);

    if (!delivery) {
      outbox.deviceDeliveries.push({
        user: subscription.user,
        subscription: subscription._id,
        endpointHash: endpointHash(subscription.endpoint),
        status: 'pending',
      });
      delivery = outbox.deviceDeliveries[outbox.deviceDeliveries.length - 1];
      deliveryBySubscription.set(subscriptionId, delivery);
    }

    if (['pending', 'failed'].includes(delivery.status)) {
      delivery.status = 'sending';
      delivery.attempts += 1;
      delivery.attemptedAt = new Date();
      delivery.error = '';
      candidates.push({ subscription, delivery });
    }
  }

  await outbox.save();
  return candidates;
};

const processOutboxRecord = async (outboxId) => {
  if (!mongoose.isValidObjectId(outboxId)) {
    const error = new Error('Invalid notification outbox id');
    error.code = 'INVALID_OUTBOX_ID';
    throw error;
  }

  const existing = await NotificationOutbox.findById(outboxId).select('status');
  if (!existing) {
    const error = new Error('Notification outbox record not found');
    error.code = 'OUTBOX_NOT_FOUND';
    throw error;
  }
  if (existing.status === 'completed') {
    return { completed: true, alreadyProcessed: true };
  }

  const outbox = await acquireOutboxForProcessing(outboxId);
  if (!outbox) {
    return { completed: false, processing: true };
  }

  try {
    const admins = await getAuthorizedOrderAdmins();
    const content = buildAdminNotificationContent(outbox);
    const history = await ensureAdminHistory(outbox, admins, content);
    const adminIds = admins.map((admin) => admin._id);
    const subscriptions = adminIds.length
      ? await PushSubscription.find({
          user: { $in: adminIds },
          purpose: 'admin-orders',
          isActive: true,
        })
      : [];
    const candidates = await prepareDeviceDeliveries(outbox, subscriptions);
    const settled = await Promise.allSettled(
      candidates.map(({ subscription }) =>
        sendWebPushNotification(subscription, content.pushPayload)
      )
    );
    const expiredSubscriptionIds = [];
    let transientFailures = 0;

    settled.forEach((result, index) => {
      const { subscription, delivery } = candidates[index];
      if (result.status === 'fulfilled') {
        delivery.status = 'sent';
        delivery.statusCode = Number(result.value?.statusCode || 201);
        delivery.deliveredAt = new Date();
        delivery.error = '';
        return;
      }

      const statusCode = Number(result.reason?.statusCode || result.reason?.status || 0) || null;
      delivery.statusCode = statusCode;
      delivery.error = serializeError(result.reason);
      if (isExpiredPushSubscriptionError(result.reason)) {
        delivery.status = 'expired';
        expiredSubscriptionIds.push(subscription._id);
      } else {
        delivery.status = 'failed';
        transientFailures += 1;
      }
    });

    if (expiredSubscriptionIds.length > 0) {
      await PushSubscription.updateMany(
        { _id: { $in: expiredSubscriptionIds } },
        { $set: { isActive: false } }
      );
    }

    outbox.notificationCount = history.length;
    outbox.processingLockedUntil = null;
    if (transientFailures > 0) {
      outbox.status = 'failed';
      outbox.failureStage = 'process';
      outbox.lastError = `${transientFailures} push delivery attempt(s) failed`;
      outbox.nextAttemptAt = getRetryDate(outbox.processAttempts);
      await outbox.save();

      const error = new Error(outbox.lastError);
      error.code = 'OUTBOX_DELIVERY_INCOMPLETE';
      throw error;
    }

    outbox.status = 'completed';
    outbox.failureStage = '';
    outbox.lastError = '';
    outbox.nextAttemptAt = null;
    outbox.completedAt = new Date();
    await outbox.save();

    return {
      completed: true,
      alreadyProcessed: false,
      notificationCount: history.length,
      deviceCount: subscriptions.length,
    };
  } catch (error) {
    if (error.code !== 'OUTBOX_DELIVERY_INCOMPLETE') {
      await NotificationOutbox.updateOne(
        { _id: outbox._id, status: 'processing' },
        {
          $set: {
            status: 'failed',
            failureStage: 'process',
            lastError: serializeError(error, 'Notification outbox processing failed'),
            nextAttemptAt: getRetryDate(outbox.processAttempts),
            processingLockedUntil: null,
          },
        }
      );
    }
    throw error;
  }
};

const reconcileNotificationOutbox = async ({ limit = MAX_RECONCILE_BATCH } = {}) => {
  const now = new Date();
  const batchSize = Math.min(Math.max(Number(limit) || 1, 1), MAX_RECONCILE_BATCH);

  await Promise.all([
    NotificationOutbox.updateMany(
      { status: 'processing', processingLockedUntil: { $lte: now } },
      {
        $set: {
          status: 'failed',
          failureStage: 'process',
          lastError: 'Recovered an expired processing lease',
          nextAttemptAt: now,
          processingLockedUntil: null,
        },
      }
    ),
    NotificationOutbox.updateMany(
      { status: 'publishing', publishLockedUntil: { $lte: now } },
      {
        $set: {
          status: 'failed',
          failureStage: 'publish',
          lastError: 'Recovered an expired publishing lease',
          nextAttemptAt: now,
          publishLockedUntil: null,
        },
      }
    ),
    NotificationOutbox.updateMany(
      {
        status: 'published',
        publishedAt: { $lte: new Date(now.getTime() - STALE_PUBLISHED_MS) },
      },
      {
        $set: {
          status: 'failed',
          failureStage: 'publish',
          lastError: 'Republishing a stale QStash delivery',
          nextAttemptAt: now,
        },
      }
    ),
  ]);

  const records = await NotificationOutbox.find({
    status: { $in: ['pending', 'failed'] },
    nextAttemptAt: { $lte: now },
  })
    .sort({ createdAt: 1 })
    .limit(batchSize)
    .select('_id eventKey');

  const settled = await Promise.allSettled(
    records.map((record) => publishOutboxRecord(record._id))
  );

  return {
    examined: records.length,
    published: settled.filter((result) => result.status === 'fulfilled' && !result.value.skipped).length,
    failed: settled.filter((result) => result.status === 'rejected').length,
    results: settled.map((result, index) => ({
      outboxId: String(records[index]._id),
      eventKey: records[index].eventKey,
      status: result.status,
      error: result.status === 'rejected' ? serializeError(result.reason) : '',
    })),
  };
};

export {
  WORKER_PATH,
  buildAdminNotificationContent,
  buildEventKey,
  buildOutboxPayload,
  createOrderOutboxEvent,
  endpointHash,
  getAuthorizedOrderAdmins,
  getQstashConfiguration,
  isQstashConfigured,
  processOutboxRecord,
  publishOutboxInBackground,
  publishOutboxRecord,
  reconcileNotificationOutbox,
  resolveBackendBaseUrl,
  resolveWorkerUrl,
};
