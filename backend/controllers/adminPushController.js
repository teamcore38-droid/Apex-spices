import mongoose from 'mongoose';
import PushSubscription from '../models/pushSubscriptionModel.js';
import {
  isExpiredPushSubscriptionError,
  isVapidConfigured,
  sendWebPushNotification,
} from '../utils/pushService.js';
import { logNotificationError } from '../utils/notificationLogging.js';

const ADMIN_PUSH_PURPOSE = 'admin-orders';

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const normalizeWebPushSubscription = (payload = {}) => {
  const source = payload.subscription && typeof payload.subscription === 'object'
    ? payload.subscription
    : payload;
  const endpoint = cleanText(source.endpoint, 5000);
  const p256dh = cleanText(source.keys?.p256dh, 500);
  const auth = cleanText(source.keys?.auth, 500);

  let parsedEndpoint;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    parsedEndpoint = null;
  }

  if (!parsedEndpoint || parsedEndpoint.protocol !== 'https:') {
    return { error: 'A valid HTTPS Web Push endpoint is required' };
  }

  if (!p256dh || !auth) {
    return { error: 'Web Push encryption keys are required' };
  }

  return {
    endpoint,
    keys: { p256dh, auth },
    platform: ['ios', 'android'].includes(payload.platform) ? payload.platform : 'web',
    deviceLabel: cleanText(payload.deviceLabel, 120),
    userAgent: cleanText(payload.userAgent, 500),
  };
};

const presentSubscription = (subscription) => ({
  id: subscription._id,
  endpoint: subscription.endpoint,
  platform: subscription.platform,
  deviceLabel: subscription.deviceLabel,
  isActive: subscription.isActive,
  lastSeenAt: subscription.lastSeenAt,
  createdAt: subscription.createdAt,
  updatedAt: subscription.updatedAt,
});

const listAdminPushSubscriptions = async (req, res) => {
  const subscriptions = await PushSubscription.find({
    user: req.user._id,
    purpose: ADMIN_PUSH_PURPOSE,
    isActive: true,
  }).sort({ updatedAt: -1 });

  res.json({
    configured: isVapidConfigured(),
    subscriptions: subscriptions.map(presentSubscription),
  });
};

const upsertAdminPushSubscription = async (req, res) => {
  if (!isVapidConfigured()) {
    return res.status(503).json({ message: 'Web Push is not configured on the backend' });
  }

  const normalized = normalizeWebPushSubscription(req.body);
  if (normalized.error) {
    return res.status(400).json({ message: normalized.error });
  }

  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint: normalized.endpoint, purpose: ADMIN_PUSH_PURPOSE },
    {
      $set: {
        user: req.user._id,
        guestEmail: '',
        sessionId: '',
        token: '',
        endpoint: normalized.endpoint,
        keys: normalized.keys,
        platform: normalized.platform,
        purpose: ADMIN_PUSH_PURPOSE,
        deviceLabel: normalized.deviceLabel,
        userAgent: normalized.userAgent,
        appVersion: 'admin-pwa',
        preferences: {
          orderUpdates: true,
          promotions: false,
          support: false,
        },
        isActive: true,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ subscription: presentSubscription(subscription) });
};

const deactivateAdminPushSubscription = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid push subscription id' });
  }

  const subscription = await PushSubscription.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      purpose: ADMIN_PUSH_PURPOSE,
    },
    { $set: { isActive: false, lastSeenAt: new Date() } },
    { new: true }
  );

  if (!subscription) {
    return res.status(404).json({ message: 'Admin push subscription not found' });
  }

  res.json({ message: 'Order notifications disabled for this device' });
};

const sendAdminTestNotification = async (req, res) => {
  if (!isVapidConfigured()) {
    return res.status(503).json({ message: 'Web Push is not configured on the backend' });
  }

  const endpoint = cleanText(req.body?.endpoint, 5000);
  if (!endpoint) {
    return res.status(400).json({ message: 'The current device push endpoint is required' });
  }

  const subscription = await PushSubscription.findOne({
    user: req.user._id,
    purpose: ADMIN_PUSH_PURPOSE,
    endpoint,
    isActive: true,
  });

  if (!subscription) {
    return res.status(404).json({ message: 'Enable order notifications on this device first' });
  }

  try {
    await sendWebPushNotification(subscription, {
      title: 'Apex Spices test notification',
      body: 'Web Push is ready for admin order alerts on this device.',
      url: '/admin',
      type: 'admin.push.test',
    });

    subscription.lastSeenAt = new Date();
    await subscription.save();

    return res.json({ message: 'Test notification sent to this device' });
  } catch (error) {
    if (isExpiredPushSubscriptionError(error)) {
      subscription.isActive = false;
      subscription.lastSeenAt = new Date();
      await subscription.save();
      return res.status(410).json({ message: 'This browser subscription expired. Enable notifications again.' });
    }

    logNotificationError({
      scope: 'admin-push',
      action: 'send-test',
      error,
    });
    return res.status(502).json({ message: 'The push service could not deliver the test notification' });
  }
};

export {
  ADMIN_PUSH_PURPOSE,
  deactivateAdminPushSubscription,
  listAdminPushSubscriptions,
  normalizeWebPushSubscription,
  sendAdminTestNotification,
  upsertAdminPushSubscription,
};
