import express from 'express';
import {
  createManagedUser,
  getManagedUser,
  listManagedUsers,
  revokeManagedUserSessions,
  unlockManagedUser,
  updateManagedUser,
} from '../controllers/userManagementController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireUserManagementAccess } from '../middleware/userManagementMiddleware.js';

const router = express.Router();

router.route('/:type').get(protect, requireUserManagementAccess('read'), listManagedUsers);
router.route('/:type').post(protect, requireUserManagementAccess('manage'), createManagedUser);
router.route('/:type/:id').get(protect, requireUserManagementAccess('read'), getManagedUser);
router.route('/:type/:id').put(protect, requireUserManagementAccess('manage'), updateManagedUser);
router
  .route('/:type/:id/unlock')
  .post(protect, requireUserManagementAccess('manage'), unlockManagedUser);
router
  .route('/:type/:id/revoke-sessions')
  .post(protect, requireUserManagementAccess('manage'), revokeManagedUserSessions);

export default router;
