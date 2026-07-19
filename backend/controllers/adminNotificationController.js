import mongoose from 'mongoose';
import AdminNotification from '../models/adminNotificationModel.js';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const normalizePageSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
};

const encodeNotificationCursor = (notification) =>
  Buffer.from(
    JSON.stringify({
      createdAt: new Date(notification.createdAt).toISOString(),
      id: String(notification._id),
    })
  ).toString('base64url');

const decodeNotificationCursor = (value) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    const createdAt = new Date(parsed.createdAt);

    if (Number.isNaN(createdAt.getTime()) || !mongoose.isValidObjectId(parsed.id)) {
      return { error: 'Invalid notification cursor' };
    }

    return { createdAt, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    return { error: 'Invalid notification cursor' };
  }
};

const buildOrderNumber = (order) => {
  const explicitNumber = String(order?.orderNumber || '').trim();
  if (explicitNumber) {
    return explicitNumber;
  }

  const orderId = String(order?._id || '');
  return orderId ? orderId.slice(-8).toUpperCase() : '';
};

const buildSecureAdminOrderUrl = (orderId) => {
  const normalizedId = String(orderId || '').trim();
  if (!mongoose.isValidObjectId(normalizedId)) {
    throw new Error('A valid order id is required for an admin notification');
  }

  return `/admin/orders/${normalizedId}`;
};

const presentAdminNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  orderId: notification.order,
  orderNumber: notification.orderNumber,
  adminUrl: notification.adminUrl,
  isRead: notification.isRead,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

const listAdminNotifications = async (req, res) => {
  const limit = normalizePageSize(req.query.limit);
  const cursor = decodeNotificationCursor(req.query.cursor);

  if (cursor?.error) {
    return res.status(400).json({ message: cursor.error });
  }

  const filter = { user: req.user._id };
  if (cursor) {
    filter.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ];
  }

  const records = await AdminNotification.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = records.length > limit;
  const page = hasMore ? records.slice(0, limit) : records;

  res.json({
    notifications: page.map(presentAdminNotification),
    nextCursor: hasMore && page.length ? encodeNotificationCursor(page[page.length - 1]) : null,
    hasMore,
  });
};

const getAdminNotificationUnreadCount = async (req, res) => {
  const unreadCount = await AdminNotification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.json({ unreadCount });
};

const markAdminNotificationRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification id' });
  }

  const notification = await AdminNotification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: 'Admin notification not found' });
  }

  res.json({ notification: presentAdminNotification(notification) });
};

const markAllAdminNotificationsRead = async (req, res) => {
  const readAt = new Date();
  const result = await AdminNotification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true, readAt } }
  );

  res.json({
    message: 'All notifications marked as read',
    updatedCount: result.modifiedCount || 0,
  });
};

export {
  buildOrderNumber,
  buildSecureAdminOrderUrl,
  decodeNotificationCursor,
  encodeNotificationCursor,
  getAdminNotificationUnreadCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  normalizePageSize,
  presentAdminNotification,
};
