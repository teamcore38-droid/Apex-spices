import webPush from 'web-push';
import PushNotificationLog from '../models/pushNotificationLogModel.js';
import PushSubscription from '../models/pushSubscriptionModel.js';

let configuredVapidSignature = '';

const getVapidConfiguration = () => ({
  publicKey: String(process.env.VAPID_PUBLIC_KEY || '').trim(),
  privateKey: String(process.env.VAPID_PRIVATE_KEY || '').trim(),
  subject: String(process.env.VAPID_SUBJECT || '').trim(),
});

const isVapidConfigured = () => {
  const { publicKey, privateKey, subject } = getVapidConfiguration();
  return Boolean(publicKey && privateKey && /^(mailto:|https:\/\/)/i.test(subject));
};

const configureWebPush = () => {
  const configuration = getVapidConfiguration();

  if (!isVapidConfigured()) {
    const error = new Error('Web Push is not configured on the backend');
    error.code = 'VAPID_NOT_CONFIGURED';
    throw error;
  }

  const signature = `${configuration.subject}:${configuration.publicKey}:${configuration.privateKey}`;
  if (signature !== configuredVapidSignature) {
    webPush.setVapidDetails(
      configuration.subject,
      configuration.publicKey,
      configuration.privateKey
    );
    configuredVapidSignature = signature;
  }

  return configuration;
};

const sendWebPushNotification = async (subscription, payload) => {
  configureWebPush();

  return webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
      },
    },
    JSON.stringify(payload),
    {
      TTL: 60,
      urgency: 'high',
    }
  );
};

const isExpiredPushSubscriptionError = (error) =>
  [404, 410].includes(Number(error?.statusCode || error?.status));

const getFrontendUrl = () =>
  String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const buildOrderPushPayload = (order, event, details = {}) => {
  const orderId = order?._id?.toString?.() || String(order?._id || '');
  const orderLabel = String(order?.orderNumber || '').trim() || (orderId ? orderId.slice(-6).toUpperCase() : '');
  const titleMap = {
    'order.created': 'Order received',
    'order.paid': 'Payment confirmed',
    'order.status.updated': 'Order status updated',
    'order.shipment.updated': 'Shipment update',
    'order.cancellation.reviewed': 'Cancellation request updated',
  };

  return {
    title: titleMap[event] || 'Apex Spices update',
    body:
      details.message ||
      (orderLabel
        ? `Order ${orderLabel} is now ${order?.orderStatus || 'updated'}.`
        : 'Your marketplace update is ready.'),
    url: `${getFrontendUrl()}/orders/${orderId}`,
    orderId,
    status: order?.orderStatus || '',
    trackingNumber: order?.trackingNumber || '',
    ...details,
  };
};

const findOrderSubscriptions = async (order) => {
  const filters = [];

  if (order?.user) {
    filters.push({ user: order.user, isActive: true, 'preferences.orderUpdates': true });
  }

  const email = String(order?.guestCustomer?.email || order?.shippingAddress?.email || '')
    .trim()
    .toLowerCase();

  if (email) {
    filters.push({ guestEmail: email, isActive: true, 'preferences.orderUpdates': true });
  }

  if (filters.length === 0) {
    return [];
  }

  return PushSubscription.find({ $or: filters }).limit(25);
};

const logNotification = async ({ subscription = null, event, payload, status = 'queued', error = '' }) =>
  PushNotificationLog.create({
    user: subscription?.user || null,
    subscription: subscription?._id || null,
    event,
    title: payload.title || '',
    body: payload.body || '',
    url: payload.url || '',
    status,
    error,
    payload,
  });

const notifyOrderEvent = async (order, event, details = {}) => {
  try {
    const payload = buildOrderPushPayload(order, event, details);
    const subscriptions = await findOrderSubscriptions(order);

    if (subscriptions.length === 0) {
      await logNotification({ event, payload, status: 'skipped', error: 'No active subscriptions' });
      return;
    }

    await Promise.all(
      subscriptions.map((subscription) =>
        logNotification({
          subscription,
          event,
          payload,
          status:
            process.env.FCM_SERVER_KEY || process.env.APNS_KEY_ID || process.env.WEB_PUSH_PRIVATE_KEY
              ? 'queued'
              : 'skipped',
          error:
            process.env.FCM_SERVER_KEY || process.env.APNS_KEY_ID || process.env.WEB_PUSH_PRIVATE_KEY
              ? ''
              : 'Push provider credentials are not configured',
        })
      )
    );
  } catch (error) {
    console.error('[pushService:notifyOrderEvent]', error);
  }
};

export {
  configureWebPush,
  getVapidConfiguration,
  isExpiredPushSubscriptionError,
  isVapidConfigured,
  notifyOrderEvent,
  sendWebPushNotification,
};
