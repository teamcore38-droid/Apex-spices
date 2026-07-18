import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import Order from '../models/orderModel.js';

const REVIEW_STATUSES = ['Pending', 'Approved', 'Rejected', 'Hidden'];

const isReviewEligibleOrder = (order = {}) =>
  Boolean(
    order &&
      (order.isDelivered || order.orderStatus === 'Delivered') &&
      (order.isPaid || order.paymentStatus === 'Paid')
  );

const orderContainsProduct = (order = {}, productId) =>
  (order.orderItems || []).some((item) => String(item.product) === String(productId));

const recalculateProductRating = async (productId) => {
  const approvedReviews = await Review.find({
    product: productId,
    status: 'Approved',
    verifiedPurchase: true,
  });
  const numReviews = approvedReviews.length;
  const rating =
    numReviews > 0
      ? approvedReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / numReviews
      : 0;

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        rating: Number(rating.toFixed(1)),
        numReviews,
      },
    }
  );
};

const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      status: req.user?.isAdmin ? { $in: REVIEW_STATUSES } : 'Approved',
      ...(req.user?.isAdmin ? {} : { verifiedPurchase: true }),
    })
      .populate('order', '_id createdAt')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('[reviewController:getProductReviews]', error);
    res.status(500).json({ message: 'Unable to load reviews right now' });
  }
};

const createProductReview = async (req, res) => {
  const { rating, title = '', comment = '', orderId = '' } = req.body;

  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const parsedRating = Number(rating);

    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (!String(comment).trim()) {
      return res.status(400).json({ message: 'Review comment is required' });
    }

    if (!orderId) {
      return res.status(400).json({ message: 'A delivered order is required to review this product' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({ message: 'Eligible order not found' });
    }

    if (!isReviewEligibleOrder(order)) {
      return res.status(403).json({ message: 'Only paid and delivered orders can be reviewed' });
    }

    if (!orderContainsProduct(order, product._id)) {
      return res.status(403).json({ message: 'This product was not part of the selected order' });
    }

    const existingReview = await Review.findOne({
      product: product._id,
      user: req.user._id,
      order: order._id,
    });

    if (existingReview) {
      return res.status(409).json({ message: 'You have already reviewed this product for this order' });
    }

    const review = await Review.create({
      product: product._id,
      user: req.user._id,
      order: order._id,
      name: req.user.name,
      title: String(title).trim(),
      rating: parsedRating,
      comment: String(comment).trim(),
      verifiedPurchase: true,
      status: 'Pending',
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('[reviewController:createProductReview]', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this product for this order' });
    }
    res.status(500).json({ message: 'Unable to submit review right now' });
  }
};

const getProductReviewEligibility = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select('_id');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const orders = await Order.find({
      user: req.user._id,
      $or: [{ isDelivered: true }, { orderStatus: 'Delivered' }],
      $and: [{ $or: [{ isPaid: true }, { paymentStatus: 'Paid' }] }],
      'orderItems.product': product._id,
    })
      .select('_id createdAt orderItems orderStatus isDelivered isPaid paymentStatus')
      .sort({ createdAt: -1 });

    const existingReviews = await Review.find({
      product: product._id,
      user: req.user._id,
      order: { $in: orders.map((order) => order._id) },
    }).select('_id order status createdAt');

    const reviewedOrderIds = new Set(existingReviews.map((review) => String(review.order)));
    const eligibleOrders = orders
      .filter((order) => !reviewedOrderIds.has(String(order._id)))
      .map((order) => ({
        _id: order._id,
        createdAt: order.createdAt,
      }));

    res.json({
      canReview: eligibleOrders.length > 0,
      eligibleOrders,
      existingReviews,
    });
  } catch (error) {
    console.error('[reviewController:getProductReviewEligibility]', error);
    res.status(500).json({ message: 'Unable to check review eligibility right now' });
  }
};

const getReviewsForModeration = async (req, res) => {
  try {
    const { status = '' } = req.query;
    const filter = REVIEW_STATUSES.includes(status) ? { status } : {};
    const reviews = await Review.find(filter)
      .populate('product', 'name image')
      .populate('user', 'name email')
      .populate('order', '_id createdAt orderStatus')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('[reviewController:getReviewsForModeration]', error);
    res.status(500).json({ message: 'Unable to load review queue right now' });
  }
};

const moderateReview = async (req, res) => {
  const { status = '' } = req.body;

  try {
    if (!REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid review status' });
    }

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.status = status;
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    await review.save();
    await recalculateProductRating(review.product);

    res.json(review);
  } catch (error) {
    console.error('[reviewController:moderateReview]', error);
    res.status(500).json({ message: 'Unable to moderate review right now' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const productId = review.product;
    await review.deleteOne();
    await recalculateProductRating(productId);

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('[reviewController:deleteReview]', error);
    res.status(500).json({ message: 'Unable to delete review right now' });
  }
};

export {
  getProductReviews,
  getProductReviewEligibility,
  createProductReview,
  getReviewsForModeration,
  moderateReview,
  deleteReview,
  recalculateProductRating,
};
