import express from 'express';
import {
  deactivateAdminPushSubscription,
  listAdminPushSubscriptions,
  sendAdminTestNotification,
  upsertAdminPushSubscription,
} from '../controllers/adminPushController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.use(protect, requirePermission(PERMISSIONS.ORDERS_READ));
router.route('/subscriptions').get(listAdminPushSubscriptions).post(upsertAdminPushSubscription);
router.route('/subscriptions/:id').delete(deactivateAdminPushSubscription);
router.route('/test').post(sendAdminTestNotification);

export default router;
