import express from 'express';
import { getStoreSettings, updateStoreSettings } from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getStoreSettings)
  .put(protect, admin, updateStoreSettings);

export default router;
