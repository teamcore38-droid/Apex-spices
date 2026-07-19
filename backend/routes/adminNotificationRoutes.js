import express from 'express';
import {
  createSampleAdminNotification,
  getAdminNotificationUnreadCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '../controllers/adminNotificationController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.use(protect, requirePermission(PERMISSIONS.ORDERS_READ));
router.route('/').get(listAdminNotifications);
router.route('/unread-count').get(getAdminNotificationUnreadCount);
router.route('/read-all').patch(markAllAdminNotificationsRead);
router.route('/test').post(createSampleAdminNotification);
router.route('/:id/read').patch(markAdminNotificationRead);

export default router;
