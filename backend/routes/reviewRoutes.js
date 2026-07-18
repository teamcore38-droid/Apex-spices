import express from 'express';
import {
  createProductReview,
  deleteReview,
  getProductReviewEligibility,
  getProductReviews,
  getReviewsForModeration,
  moderateReview,
} from '../controllers/reviewController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/product/:productId').get(protectOptional, getProductReviews).post(protect, createProductReview);
router.route('/product/:productId/eligibility').get(protect, getProductReviewEligibility);
router.route('/admin/all').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), getReviewsForModeration);
router
  .route('/admin/:reviewId')
  .delete(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), deleteReview);
router.route('/admin/:reviewId/status').put(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), moderateReview);

export default router;
