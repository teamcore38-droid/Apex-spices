import express from 'express';
import {
  processAdminNotificationOutbox,
  reconcileAdminNotificationOutbox,
} from '../controllers/notificationWorkerController.js';
import { verifyQstashSignature } from '../middleware/qstashMiddleware.js';

const router = express.Router();

router.use(verifyQstashSignature);
router.post('/', processAdminNotificationOutbox);
router.post('/reconcile', reconcileAdminNotificationOutbox);

export default router;
