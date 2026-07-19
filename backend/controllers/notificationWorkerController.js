import mongoose from 'mongoose';
import {
  processOutboxRecord,
  reconcileNotificationOutbox,
} from '../utils/notificationOutboxService.js';

const processAdminNotificationOutbox = async (req, res) => {
  const outboxId = String(req.body?.outboxId || '').trim();
  if (!mongoose.isValidObjectId(outboxId)) {
    return res.status(400).json({ message: 'A valid outbox id is required' });
  }

  try {
    const result = await processOutboxRecord(outboxId);
    return res.status(result.processing ? 202 : 200).json(result);
  } catch (error) {
    console.error(`[notificationWorker:process:${outboxId}]`, error);
    if (error.code === 'OUTBOX_NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'INVALID_OUTBOX_ID') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Notification outbox processing failed' });
  }
};

const reconcileAdminNotificationOutbox = async (req, res) => {
  try {
    const result = await reconcileNotificationOutbox({ limit: req.body?.limit });
    res.json(result);
  } catch (error) {
    console.error('[notificationWorker:reconcile]', error);
    res.status(500).json({ message: 'Notification outbox reconciliation failed' });
  }
};

export {
  processAdminNotificationOutbox,
  reconcileAdminNotificationOutbox,
};
