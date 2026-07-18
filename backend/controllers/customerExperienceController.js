import mongoose from 'mongoose';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import RecentlyViewed from '../models/recentlyViewedModel.js';
import SupportTicket from '../models/supportTicketModel.js';
import User from '../models/userModel.js';
import { LoyaltyAccount, LoyaltyTransaction } from '../models/loyaltyModel.js';
import fallbackCategories from '../data/categories.js';
import fallbackProducts from '../data/products.js';
import logger from '../utils/logger.js';
import { activeProductFilter, getPersonalizedRecommendations } from '../utils/recommendationService.js';
import { getOrCreateLoyaltyAccount } from '../utils/loyaltyService.js';
import { emitWebhookEvent } from '../utils/webhookService.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSessionId = (req) =>
  String(req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'] || '').trim();

const normalizeFallbackProduct = (product) => ({
  ...product,
  _id: product._id || product.slug,
});

const normalizeFallbackCategory = (category) => ({
  ...category,
  _id: category._id || category.slug,
});

const hydrateProductReviewStats = async (products = []) => {
  const productList = Array.isArray(products) ? products : [products];
  const normalizedProducts = productList.map((product) => (product?.toObject ? product.toObject() : product));
  const productIds = normalizedProducts.map((product) => product?._id).filter(Boolean);

  if (mongoose.connection.readyState !== 1 || productIds.length === 0) {
    return Array.isArray(products) ? normalizedProducts : normalizedProducts[0];
  }

  const reviewStats = await Review.aggregate([
    {
      $match: {
        product: { $in: productIds },
        status: 'Approved',
        verifiedPurchase: true,
      },
    },
    {
      $group: {
        _id: '$product',
        rating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  const statsByProductId = new Map(
    reviewStats.map((stats) => [
      String(stats._id),
      {
        rating: Number(Number(stats.rating || 0).toFixed(1)),
        numReviews: Number(stats.numReviews || 0),
      },
    ])
  );

  const hydratedProducts = normalizedProducts.map((product) => ({
    ...product,
    ...(statsByProductId.get(String(product._id)) || { rating: 0, numReviews: 0 }),
  }));

  return Array.isArray(products) ? hydratedProducts : hydratedProducts[0];
};

const buildProductReviewStatsStages = (minRating = 0) => [
  {
    $lookup: {
      from: Review.collection.name,
      let: { productId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$product', '$$productId'] },
                { $eq: ['$status', 'Approved'] },
                { $eq: ['$verifiedPurchase', true] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            rating: { $avg: '$rating' },
            numReviews: { $sum: 1 },
          },
        },
      ],
      as: 'reviewStats',
    },
  },
  {
    $addFields: {
      rating: {
        $round: [{ $ifNull: [{ $arrayElemAt: ['$reviewStats.rating', 0] }, 0] }, 1],
      },
      numReviews: { $ifNull: [{ $arrayElemAt: ['$reviewStats.numReviews', 0] }, 0] },
    },
  },
  { $project: { reviewStats: 0 } },
  ...(minRating > 0 ? [{ $match: { rating: { $gte: minRating } } }] : []),
];

const getFallbackFeaturedProducts = () =>
  fallbackProducts
    .filter((product) => product.isFeatured && product.isActive !== false)
    .slice(0, 8)
    .map(normalizeFallbackProduct);

const getFallbackBestSellers = () =>
  fallbackProducts
    .filter((product) => product.isBestSeller && product.isActive !== false)
    .slice(0, 4)
    .map(normalizeFallbackProduct);

const getFallbackCategories = () =>
  fallbackCategories
    .filter((category) => category.isActive !== false)
    .slice(0, 3)
    .map(normalizeFallbackCategory);

const resolveHomeSection = async (req, section, queryFn, fallbackFn) => {
  if (mongoose.connection.readyState !== 1) {
    const databaseState = mongoose.connection.readyState;
    logger.warn('Home data section using fallback because database is not connected', {
      requestId: req.requestId,
      section,
      databaseState,
    });

    return {
      data: fallbackFn(),
      warning: {
        section,
        message: 'Database is not connected',
      },
    };
  }

  try {
    return {
      data: await queryFn(),
      warning: null,
    };
  } catch (error) {
    logger.error('Home data section failed', {
      requestId: req.requestId,
      section,
      error: error.message,
      databaseState: mongoose.connection.readyState,
    });

    return {
      data: fallbackFn(),
      warning: {
        section,
        message: error.message,
      },
    };
  }
};

const getHomePageData = async (req, res) => {
  const [featuredResult, bestSellerResult, categoriesResult] = await Promise.all([
    resolveHomeSection(
      req,
      'featuredProducts',
      () =>
        Product.find({
          ...activeProductFilter,
          isFeatured: true,
        })
          .sort({ isBestSeller: -1, rating: -1, createdAt: -1 })
          .limit(8)
          .lean(),
      getFallbackFeaturedProducts
    ),
    resolveHomeSection(
      req,
      'bestSellers',
      () =>
        Product.find({
          ...activeProductFilter,
          isBestSeller: true,
        })
          .sort({ rating: -1, createdAt: -1 })
          .limit(4)
          .lean(),
      getFallbackBestSellers
    ),
    resolveHomeSection(
      req,
      'categories',
      () => Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).limit(3).lean(),
      getFallbackCategories
    ),
  ]);

  featuredResult.data = await hydrateProductReviewStats(featuredResult.data);
  bestSellerResult.data = await hydrateProductReviewStats(bestSellerResult.data);

  const warnings = [featuredResult.warning, bestSellerResult.warning, categoriesResult.warning].filter(Boolean);
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json({
    featuredProducts: featuredResult.data,
    bestSellers: bestSellerResult.data,
    categories: categoriesResult.data,
    generatedAt: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'production' || warnings.length === 0 ? {} : { warnings }),
  });
};

const buildSearchFilter = (query = {}) => {
  const {
    keyword = '',
    category = '',
    brand = '',
    origin = '',
    minPrice = '',
    maxPrice = '',
    stock = '',
  } = query;
  const filters = [activeProductFilter];

  if (keyword) {
    const pattern = new RegExp(escapeRegex(String(keyword).trim()), 'i');
    filters.push({
      $or: [
        { name: pattern },
        { brand: pattern },
        { category: pattern },
        { origin: pattern },
        { sku: pattern },
        { shortDescription: pattern },
        { description: pattern },
      ],
    });
  }

  if (category) {
    filters.push({ category: { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') } });
  }

  if (brand) {
    filters.push({ brand: { $regex: new RegExp(`^${escapeRegex(brand)}$`, 'i') } });
  }

  if (origin) {
    filters.push({ origin: { $regex: new RegExp(escapeRegex(origin), 'i') } });
  }

  const min = (minPrice === undefined || minPrice === null || minPrice === '') ? null : Number(minPrice);
  const max = (maxPrice === undefined || maxPrice === null || maxPrice === '') ? null : Number(maxPrice);

  if ((min !== null && !Number.isNaN(min)) || (max !== null && !Number.isNaN(max))) {
    const priceFilter = {};
    if (min !== null && !Number.isNaN(min)) priceFilter.$gte = min;
    if (max !== null && !Number.isNaN(max)) priceFilter.$lte = max;
    filters.push({ price: priceFilter });
  }

  if (stock === 'in-stock') {
    filters.push({ countInStock: { $gt: 0 } });
  } else if (stock === 'out-of-stock') {
    filters.push({ countInStock: { $lte: 0 } });
  }

  return { $and: filters };
};

const getAdvancedSearch = async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 48);
  const sort = String(req.query.sort || '');
  const filter = buildSearchFilter(req.query);
  const minRating = Math.max(0, Number(req.query.rating || 0) || 0);
  const sortMap = {
    newest: { createdAt: -1 },
    'price-low': { price: 1 },
    'price-high': { price: -1 },
    'rating-high': { rating: -1, createdAt: -1 },
    'name-asc': { name: 1 },
  };
  const searchPipeline = [
    { $match: filter },
    ...buildProductReviewStatsStages(minRating),
  ];

  const [totalResult, products, facets, priceRange] = await Promise.all([
    Product.aggregate([...searchPipeline, { $count: 'totalProducts' }]),
    Product.aggregate([
      ...searchPipeline,
      { $sort: sortMap[sort] || { isFeatured: -1, isBestSeller: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]),
    Product.aggregate([
      ...searchPipeline,
      {
        $facet: {
          categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          brands: [{ $group: { _id: '$brand', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          origins: [{ $group: { _id: '$origin', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          availability: [
            {
              $group: {
                _id: { $cond: [{ $gt: ['$countInStock', 0] }, 'in-stock', 'out-of-stock'] },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
    Product.aggregate([
      ...searchPipeline,
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
  ]);

  const totalProducts = totalResult[0]?.totalProducts || 0;
  const totalPages = totalProducts === 0 ? 1 : Math.ceil(totalProducts / limit);

  res.json({
    products,
    currentPage: Math.min(page, totalPages),
    totalPages,
    totalProducts,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    facets: {
      categories: facets[0]?.categories || [],
      brands: facets[0]?.brands || [],
      origins: facets[0]?.origins || [],
      availability: facets[0]?.availability || [],
      priceRange: priceRange[0] || { min: 0, max: 0 },
    },
  });
};

const recordRecentlyViewed = async (req, res) => {
  const { productId = '' } = req.body;
  const sessionId = getSessionId(req);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Valid product is required' });
  }

  if (!req.user?._id && !sessionId) {
    return res.status(400).json({ message: 'Session ID is required for guest recently viewed products' });
  }

  const filter = req.user?._id
    ? { user: req.user._id, product: productId }
    : { sessionId, product: productId };
  const viewed = await RecentlyViewed.findOneAndUpdate(
    filter,
    {
      ...filter,
      viewedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(viewed);
};

const getRecentlyViewed = async (req, res) => {
  const sessionId = getSessionId(req);

  if (!req.user?._id && !sessionId) {
    return res.json([]);
  }

  const filter = req.user?._id ? { user: req.user._id } : { sessionId };
  const viewed = await RecentlyViewed.find(filter)
    .populate('product')
    .sort({ viewedAt: -1 })
    .limit(12);

  res.json(viewed.map((entry) => entry.product).filter(Boolean));
};

const getRecommendations = async (req, res) => {
  const products = await getPersonalizedRecommendations({
    userId: req.user?._id || null,
    sessionId: getSessionId(req),
    limit: Number.parseInt(req.query.limit, 10) || 8,
  });

  res.json(await hydrateProductReviewStats(products));
};

const getLoyalty = async (req, res) => {
  const account = await getOrCreateLoyaltyAccount(req.user._id);
  const transactions = await LoyaltyTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ account, transactions });
};

const getNotificationPreferences = async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences phone email');
  res.json(user.notificationPreferences || {});
};

const updateNotificationPreferences = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...req.body,
    email: {
      ...user.notificationPreferences?.email,
      ...req.body.email,
    },
    sms: {
      ...user.notificationPreferences?.sms,
      ...req.body.sms,
    },
    whatsapp: {
      ...user.notificationPreferences?.whatsapp,
      ...req.body.whatsapp,
    },
  };
  await user.save();

  res.json(user.notificationPreferences);
};

const createSupportTicket = async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const body = String(req.body.message || req.body.body || '').trim();

  if (!subject || !body) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }

  const ticket = await SupportTicket.create({
    user: req.user?._id || null,
    order: mongoose.Types.ObjectId.isValid(req.body.orderId) ? req.body.orderId : null,
    guestEmail: String(req.body.guestEmail || req.user?.email || '').trim().toLowerCase(),
    name: String(req.body.name || req.user?.name || '').trim(),
    subject,
    category: ['General', 'Order', 'Shipping', 'Return', 'Product', 'Payment', 'B2B'].includes(req.body.category)
      ? req.body.category
      : 'General',
    priority: ['Low', 'Normal', 'High', 'Urgent'].includes(req.body.priority) ? req.body.priority : 'Normal',
    channel: ['Live Chat', 'Support Ticket', 'Email', 'WhatsApp'].includes(req.body.channel)
      ? req.body.channel
      : 'Support Ticket',
    messages: [
      {
        author: req.user?._id || null,
        authorName: req.user?.name || req.body.name || '',
        authorEmail: req.user?.email || req.body.guestEmail || '',
        body,
        isStaff: false,
      },
    ],
    lastMessageAt: new Date(),
  });
  await emitWebhookEvent('support.ticket.created', ticket.toObject(), {
    resourceType: 'SupportTicket',
    resourceId: ticket._id.toString(),
  });

  res.status(201).json(ticket);
};

const getSupportTickets = async (req, res) => {
  const guestEmail = String(req.query.guestEmail || '').trim().toLowerCase();
  const filter = req.user?._id ? { user: req.user._id } : guestEmail ? { guestEmail } : null;

  if (!filter) {
    return res.json([]);
  }

  const tickets = await SupportTicket.find(filter).sort({ lastMessageAt: -1 }).limit(100);
  res.json(tickets);
};

const addSupportTicketReply = async (req, res) => {
  const body = String(req.body.body || req.body.message || '').trim();

  if (!body) {
    return res.status(400).json({ message: 'Reply message is required' });
  }

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Support ticket not found' });
  }

  const isOwner =
    req.user?._id?.toString?.() === ticket.user?.toString?.() ||
    (!ticket.user && String(req.body.guestEmail || '').toLowerCase() === ticket.guestEmail);

  if (!isOwner) {
    return res.status(403).json({ message: 'Not authorized to reply to this ticket' });
  }

  ticket.messages.push({
    author: req.user?._id || null,
    authorName: req.user?.name || req.body.name || '',
    authorEmail: req.user?.email || req.body.guestEmail || '',
    body,
    isStaff: false,
  });
  ticket.status = 'Pending Staff';
  ticket.lastMessageAt = new Date();
  await ticket.save();

  res.json(ticket);
};

const getAdminSupportTickets = async (req, res) => {
  const { status = '' } = req.query;
  const filter = status ? { status } : {};
  const tickets = await SupportTicket.find(filter)
    .populate('user', 'name email phone')
    .populate('order', '_id orderStatus totalPrice')
    .sort({ lastMessageAt: -1 })
    .limit(200);

  res.json(tickets);
};

const updateAdminSupportTicket = async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Support ticket not found' });
  }

  if (req.body.status) {
    ticket.status = req.body.status;
  }

  if (req.body.reply) {
    ticket.messages.push({
      author: req.user._id,
      authorName: req.user.name || req.user.email || 'Staff',
      authorEmail: req.user.email,
      body: String(req.body.reply).trim(),
      isStaff: true,
    });
    ticket.status = req.body.status || 'Pending Customer';
    ticket.lastMessageAt = new Date();
  }

  if (req.body.assignedToName !== undefined) {
    ticket.assignedTo = req.user._id;
    ticket.assignedToName = req.body.assignedToName || req.user.name || req.user.email || '';
  }

  await ticket.save();
  res.json(ticket);
};

export {
  addSupportTicketReply,
  createSupportTicket,
  getAdvancedSearch,
  getAdminSupportTickets,
  getHomePageData,
  getLoyalty,
  getNotificationPreferences,
  getRecentlyViewed,
  getRecommendations,
  getSupportTickets,
  recordRecentlyViewed,
  updateAdminSupportTicket,
  updateNotificationPreferences,
};
