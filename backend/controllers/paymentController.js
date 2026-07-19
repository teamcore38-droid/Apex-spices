import Order from '../models/orderModel.js';
import StripeEvent from '../models/stripeEventModel.js';
import {
  applyCancelledPaymentToOrder,
  applyFailedPaymentToOrder,
  applyRefundToOrder,
  applySuccessfulPaymentToOrder,
  calculateRefundableAmount,
} from '../utils/orderPaymentLifecycle.js';
import { commitPromotionsForOrder } from '../utils/commerceService.js';
import {
  deductReservedInventory,
  releaseReservedInventory,
} from '../utils/inventoryService.js';
import { syncVendorOrdersForOrder } from '../utils/vendorService.js';
import { awardOrderLoyaltyPoints } from '../utils/loyaltyService.js';
import {
  buildSafePaymentResult,
  buildSafeRefundRecord,
  buildWebhookEvent,
  getStripeClient,
  getStripeCurrency,
  isStripeConfigured,
  isStripeWebhookConfigured,
  toStripeAmount,
} from '../utils/paymentService.js';
import { recordAuditLog } from '../utils/auditService.js';
import { notifyOrderEvent } from '../utils/pushService.js';
import { emitWebhookEvent } from '../utils/webhookService.js';
import {
  createOrderOutboxEvent,
  publishOutboxInBackground,
} from '../utils/notificationOutboxService.js';
import {
  assessOrderFraud,
  recordFraudSignal,
  shouldBlockPayment,
} from '../utils/fraudService.js';
import {
  buildPayhereCheckoutHash,
  formatPayhereAmount,
  isPublicPayhereNotifyUrl,
  validatePayhereNotification,
  validatePayhereOrderMatch,
} from '../utils/payhereService.js';

const REFUND_REASON_VALUES = ['duplicate', 'fraudulent', 'requested_by_customer'];

const getSafeWebhookActor = () => ({
  name: 'Stripe Webhook',
  email: 'stripe-webhook@system',
});

const getAdminActor = (user) => ({
  _id: user?._id,
  name: user?.name || user?.email || 'Admin',
  email: user?.email || '',
});

const findOrderForPaymentIntent = async (paymentIntentId = '', fallbackOrderId = '') => {
  const normalizedIntentId = String(paymentIntentId || '').trim();
  const normalizedOrderId = String(fallbackOrderId || '').trim();

  if (normalizedIntentId) {
    const byIntent = await Order.findOne({ paymentIntentId: normalizedIntentId });

    if (byIntent) {
      return byIntent;
    }
  }

  if (normalizedOrderId) {
    try {
      return await Order.findById(normalizedOrderId);
    } catch {
      return null;
    }
  }

  return null;
};

const findOrderForRefund = async (refund = {}) => {
  const paymentIntentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id || '';
  const chargeId =
    typeof refund.charge === 'string' ? refund.charge : refund.charge?.id || '';
  const fallbackOrderId = refund.metadata?.orderId || '';

  if (paymentIntentId) {
    const byIntent = await Order.findOne({ paymentIntentId });

    if (byIntent) {
      return byIntent;
    }
  }

  if (chargeId) {
    const byCharge = await Order.findOne({ 'paymentResult.chargeId': chargeId });

    if (byCharge) {
      return byCharge;
    }
  }

  if (fallbackOrderId) {
    try {
      return await Order.findById(fallbackOrderId);
    } catch {
      return null;
    }
  }

  return null;
};

const updateStripeEventRecord = async (eventRecord, updates = {}) => {
  if (!eventRecord) {
    return;
  }

  eventRecord.type = updates.type || eventRecord.type;
  eventRecord.paymentIntentId = updates.paymentIntentId ?? eventRecord.paymentIntentId;
  eventRecord.orderId = updates.orderId ?? eventRecord.orderId;
  eventRecord.processed = updates.processed ?? eventRecord.processed;
  eventRecord.processingError = updates.processingError ?? eventRecord.processingError;
  await eventRecord.save();
};

const processPaymentIntentSucceeded = async (paymentIntent) => {
  const order = await findOrderForPaymentIntent(
    paymentIntent.id,
    paymentIntent.metadata?.orderId || ''
  );

  if (!order) {
    return { order: null, paymentIntentId: paymentIntent.id };
  }

  await applySuccessfulPaymentToOrder({
    order,
    paymentIntent,
    actor: getSafeWebhookActor(),
    source: 'webhook',
  });
  await deductReservedInventory({ order, actor: getSafeWebhookActor() });
  await commitPromotionsForOrder(order);
  await awardOrderLoyaltyPoints(order, getSafeWebhookActor());

  if (!order.paymentResult?.chargeId && paymentIntent.latest_charge) {
    order.paymentResult = {
      ...order.paymentResult,
      chargeId:
        typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id || '',
    };
  }

  await order.save();
  await syncVendorOrdersForOrder(order);
  await notifyOrderEvent(order, 'order.paid');
  await emitWebhookEvent('order.paid', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId: paymentIntent.id };
};

const processPaymentIntentFailed = async (paymentIntent) => {
  const order = await findOrderForPaymentIntent(
    paymentIntent.id,
    paymentIntent.metadata?.orderId || ''
  );

  if (!order) {
    return { order: null, paymentIntentId: paymentIntent.id };
  }

  const failureMessage = paymentIntent.last_payment_error?.message
    ? `Stripe reported payment failure: ${paymentIntent.last_payment_error.message}`
    : '';

  await applyFailedPaymentToOrder({
    order,
    paymentIntent,
    actor: getSafeWebhookActor(),
    source: 'webhook',
    note: failureMessage,
  });
  await releaseReservedInventory({
    order,
    actor: getSafeWebhookActor(),
    note: 'Released reservation after Stripe reported payment failure.',
  });

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('payment.failed', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId: paymentIntent.id };
};

const processPaymentIntentCanceled = async (paymentIntent) => {
  const order = await findOrderForPaymentIntent(
    paymentIntent.id,
    paymentIntent.metadata?.orderId || ''
  );

  if (!order) {
    return { order: null, paymentIntentId: paymentIntent.id };
  }

  await applyCancelledPaymentToOrder({
    order,
    paymentIntent,
    actor: getSafeWebhookActor(),
    source: 'webhook',
  });
  await releaseReservedInventory({
    order,
    actor: getSafeWebhookActor(),
    note: 'Released reservation after Stripe payment was cancelled.',
  });

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('payment.cancelled', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId: paymentIntent.id };
};

const processRefundObject = async (refund, eventType = 'refund.updated') => {
  const order = await findOrderForRefund(refund);

  if (!order) {
    return {
      order: null,
      paymentIntentId:
        typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id || '',
    };
  }

  const refundRecord = buildSafeRefundRecord(refund, {
    source: 'webhook',
    processedByName: 'Stripe Webhook',
  });

  await applyRefundToOrder({
    order,
    refundRecord,
    actor: getSafeWebhookActor(),
    source: 'webhook',
    note:
      eventType === 'refund.failed'
        ? `Stripe reported a failed refund attempt for ${refundRecord.amount.toFixed(2)} ${String(refundRecord.currency || '').toUpperCase() || getStripeCurrency().toUpperCase()}.`
        : undefined,
  });

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('refund.updated', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return {
    order,
    paymentIntentId:
      typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id || '',
  };
};

const processChargeRefunded = async (charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id || '';
  const chargeId = charge.id || '';

  let order = await findOrderForPaymentIntent(paymentIntentId, '');

  if (!order && chargeId) {
    order = await Order.findOne({ 'paymentResult.chargeId': chargeId });
  }

  if (!order) {
    return { order: null, paymentIntentId };
  }

  if (Array.isArray(charge.refunds?.data) && charge.refunds.data.length > 0) {
    for (const refund of charge.refunds.data) {
      const refundRecord = buildSafeRefundRecord(refund, {
        source: 'webhook',
        processedByName: 'Stripe Webhook',
      });

      await applyRefundToOrder({
        order,
        refundRecord,
        actor: getSafeWebhookActor(),
        source: 'webhook',
      });
    }
  } else if (Number(charge.amount_refunded || 0) > 0) {
    const fallbackRefundRecord = buildSafeRefundRecord(null, {
      refundId: `charge_refund_${charge.id}_${charge.amount_refunded}`,
      amount: Number(charge.amount_refunded) / 100,
      currency: charge.currency || getStripeCurrency(),
      status: 'succeeded',
      source: 'webhook',
      processedByName: 'Stripe Webhook',
    });

    await applyRefundToOrder({
      order,
      refundRecord: fallbackRefundRecord,
      actor: getSafeWebhookActor(),
      source: 'webhook',
    });
  }

  await order.save();
  await syncVendorOrdersForOrder(order);
  await emitWebhookEvent('refund.updated', order.toObject(), {
    resourceType: 'Order',
    resourceId: order._id.toString(),
  });

  return { order, paymentIntentId };
};

const processWebhookEvent = async (event) => {
  const type = event.type;
  const object = event.data?.object || {};

  switch (type) {
    case 'payment_intent.succeeded':
      return processPaymentIntentSucceeded(object);
    case 'payment_intent.payment_failed':
      return processPaymentIntentFailed(object);
    case 'payment_intent.canceled':
      return processPaymentIntentCanceled(object);
    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed':
      return processRefundObject(object, type);
    case 'charge.refunded':
      return processChargeRefunded(object);
    default:
      return {
        ignored: true,
        paymentIntentId:
          object.payment_intent ||
          (typeof object.id === 'string' && object.id.startsWith('pi_') ? object.id : ''),
      };
  }
};

const createPaymentIntent = async (req, res) => {
  const { orderId = '' } = req.body;

  try {
    if (!isStripeConfigured()) {
      return res.status(400).json({ message: 'Stripe payment is not configured for this environment' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!req.user.isAdmin && order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to pay for this order' });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: 'This order has already been paid' });
    }

    const fraudRisk = await assessOrderFraud(order, req);
    order.fraudRisk = {
      ...order.fraudRisk,
      ...fraudRisk,
      paymentBlockedAt: shouldBlockPayment(fraudRisk) ? new Date() : order.fraudRisk?.paymentBlockedAt,
    };

    if (fraudRisk.level !== 'low') {
      await recordFraudSignal(req, order, 'payment.fraud.review', fraudRisk);
    }

    if (shouldBlockPayment(fraudRisk) && !req.user.isAdmin) {
      await order.save();
      await recordFraudSignal(req, order, 'payment.fraud.blocked', fraudRisk);
      return res.status(403).json({
        message: 'This payment needs manual review before it can be processed.',
        fraudRisk,
      });
    }

    const stripe = getStripeClient();
    let paymentIntent = null;

    if (order.paymentIntentId) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);

        if (existingIntent && !['canceled', 'succeeded'].includes(existingIntent.status)) {
          paymentIntent = existingIntent;
        }
      } catch (error) {
        console.error('[paymentController:createPaymentIntent:retrieve]', error.message);
      }
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(order.totalPrice),
        currency: String(order.currency || getStripeCurrency()).toLowerCase(),
        metadata: {
          orderId: order._id.toString(),
          userId: req.user._id.toString(),
        },
        receipt_email: order.shippingAddress?.email || req.user.email || undefined,
      });
    }

    order.paymentProvider = 'Stripe';
    order.paymentIntentId = paymentIntent.id;
    order.paymentStatus = 'Payment Pending';
    order.paymentResult = buildSafePaymentResult(paymentIntent);
    await order.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:createPaymentIntent]', error);
    res.status(500).json({ message: 'Unable to prepare payment right now' });
  }
};

const createRefund = async (req, res) => {
  const { orderId = '', amount, reason = '' } = req.body;

  try {
    if (!isStripeConfigured()) {
      return res.status(400).json({ message: 'Stripe payment is not configured for this environment' });
    }

    const order = await Order.findById(orderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.isPaid) {
      return res.status(400).json({ message: 'Only paid orders can be refunded' });
    }

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be refunded' });
    }

    const hasRefundReference = Boolean(order.paymentIntentId || order.paymentResult?.chargeId);

    if (!hasRefundReference) {
      return res.status(400).json({ message: 'No Stripe payment reference is available for this order' });
    }

    const refundableAmount = calculateRefundableAmount(order);

    if (refundableAmount <= 0) {
      return res.status(400).json({ message: 'This order is already fully refunded' });
    }

    const requestedAmount =
      amount === undefined || amount === null || amount === ''
        ? refundableAmount
        : Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ message: 'Refund amount must be greater than zero' });
    }

    if (requestedAmount - refundableAmount > 0.0001) {
      return res.status(400).json({ message: 'Refund amount exceeds the refundable balance' });
    }

    const normalizedReason = String(reason || '').trim();
    const stripe = getStripeClient();
    const refundPayload = {
      amount: toStripeAmount(requestedAmount),
      metadata: {
        orderId: order._id.toString(),
        requestedBy: req.user._id.toString(),
      },
    };

    if (REFUND_REASON_VALUES.includes(normalizedReason)) {
      refundPayload.reason = normalizedReason;
    } else if (normalizedReason) {
      refundPayload.metadata.customReason = normalizedReason;
    }

    if (order.paymentIntentId) {
      refundPayload.payment_intent = order.paymentIntentId;
    } else {
      refundPayload.charge = order.paymentResult?.chargeId;
    }

    const refund = await stripe.refunds.create(refundPayload);
    const refundRecord = buildSafeRefundRecord(refund, {
      source: 'admin',
      processedBy: req.user._id,
      processedByName: req.user.name || req.user.email || 'Admin',
      reason: normalizedReason || refund.reason || '',
    });

    await applyRefundToOrder({
      order,
      refundRecord,
      actor: getAdminActor(req.user),
      source: 'admin',
    });

    const updatedOrder = await order.save();
    await syncVendorOrdersForOrder(updatedOrder);
    await recordAuditLog(req, 'payments.refund.create', 'Order', updatedOrder._id, {
      requestedAmount,
      reason: normalizedReason,
    });
    const populatedOrder = await Order.findById(updatedOrder._id).populate('user', 'name email phone');
    await emitWebhookEvent('refund.updated', populatedOrder.toObject(), {
      resourceType: 'Order',
      resourceId: populatedOrder._id.toString(),
    });

    res.json(populatedOrder);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:createRefund]', error);
    res.status(500).json({ message: 'Unable to process refund right now' });
  }
};

const getOrderPaymentEvents = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select('_id paymentIntentId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const events = await StripeEvent.find({
      $or: [{ orderId: order._id }, ...(order.paymentIntentId ? [{ paymentIntentId: order.paymentIntentId }] : [])],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(events);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.error('[paymentController:getOrderPaymentEvents]', error);
    res.status(500).json({ message: 'Unable to load payment audit events right now' });
  }
};

const handleStripeWebhook = async (req, res) => {
  if (!isStripeWebhookConfigured()) {
    return res.status(200).json({
      received: true,
      ignored: true,
      message: 'Stripe webhook secret is not configured.',
    });
  }

  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ message: 'Missing Stripe signature header' });
  }

  let event = null;

  try {
    event = buildWebhookEvent(req.body, signature);
  } catch (error) {
    console.error('[paymentController:webhook:signature]', error.message);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }

  try {
    let eventRecord = await StripeEvent.findOne({ eventId: event.id });

    if (eventRecord?.processed) {
      return res.status(200).json({
        received: true,
        duplicate: true,
        eventId: event.id,
      });
    }

    if (!eventRecord) {
      try {
        eventRecord = await StripeEvent.create({
          eventId: event.id,
          type: event.type,
          paymentIntentId: '',
          processed: false,
        });
      } catch (createError) {
        if (createError.code === 11000) {
          eventRecord = await StripeEvent.findOne({ eventId: event.id });

          if (eventRecord?.processed) {
            return res.status(200).json({
              received: true,
              duplicate: true,
              eventId: event.id,
            });
          }
        } else {
          throw createError;
        }
      }
    }

    const outcome = await processWebhookEvent(event);

    await updateStripeEventRecord(eventRecord, {
      type: event.type,
      paymentIntentId: outcome?.paymentIntentId || '',
      orderId: outcome?.order?._id || eventRecord?.orderId,
      processed: true,
      processingError: outcome?.ignored ? 'Ignored unsupported event type.' : '',
    });

    return res.status(200).json({
      received: true,
      ignored: Boolean(outcome?.ignored),
      eventId: event.id,
    });
  } catch (error) {
    console.error('[paymentController:webhook:processing]', error);

    const eventRecord = await StripeEvent.findOne({ eventId: event.id });

    if (eventRecord) {
      await updateStripeEventRecord(eventRecord, {
        type: event.type,
        processed: false,
        processingError: error.message || 'Webhook processing failed',
      });
    }

    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

const generatePayhereHash = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const merchantId = String(process.env.PAYHERE_MERCHANT_ID || '').trim();
    const merchantSecret = String(process.env.PAYHERE_MERCHANT_SECRET || '').trim();

    if (!merchantId || !merchantSecret) {
      return res.status(503).json({ message: 'PayHere is not configured for this environment' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const ownsOrder = String(order.user || '') === String(req.user?._id || '');
    if (!ownsOrder && !req.user?.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to initiate payment for this order' });
    }

    if (order.paymentProvider !== 'PayHere') {
      return res.status(400).json({ message: 'This order is not configured for PayHere payment' });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: 'This order has already been paid' });
    }

    const currency = (order.currency || 'LKR').toUpperCase();
    const amount = formatPayhereAmount(order.totalPrice);
    const hash = buildPayhereCheckoutHash({
      merchantId,
      merchantSecret,
      orderId: order._id.toString(),
      amount,
      currency,
    });

    const configuredNotifyUrl = String(process.env.PAYHERE_NOTIFY_URL || '').trim();
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const notifyUrl =
      configuredNotifyUrl || `${protocol}://${req.get('host')}/api/payments/payhere/notify`;

    if (!isPublicPayhereNotifyUrl(notifyUrl)) {
      return res.status(503).json({
        message: 'PAYHERE_NOTIFY_URL must be a public HTTPS PayHere notification endpoint',
      });
    }

    res.json({
      hash,
      merchantId,
      notifyUrl,
      amount,
      currency,
      sandbox: String(process.env.PAYHERE_MODE || 'sandbox').trim().toLowerCase() !== 'live',
    });
  } catch (error) {
    console.error('[paymentController:generatePayhereHash]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const handlePayhereNotify = async (req, res) => {
  try {
    const validation = validatePayhereNotification({
      payload: req.body,
      merchantId: process.env.PAYHERE_MERCHANT_ID,
      merchantSecret: process.env.PAYHERE_MERCHANT_SECRET,
    });

    if (!validation.valid) {
      console.warn(`[paymentController:payhereNotify] Rejected notification: ${validation.reason}`);
      return res.status(400).json({ message: 'Invalid PayHere notification' });
    }

    const notification = validation.notification;
    const order = await Order.findById(notification.orderId);
    if (!order) {
      console.warn(`[paymentController:payhereNotify] Order ${notification.orderId} not found`);
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderMatch = validatePayhereOrderMatch({ order, notification });
    if (!orderMatch.valid) {
      console.warn(
        `[paymentController:payhereNotify] Rejected order ${notification.orderId}: ${orderMatch.reason}`
      );
      return res.status(400).json({ message: 'Payment does not match this order' });
    }

    const actor = {
      name: 'PayHere Webhook',
      email: 'payhere-webhook@system',
    };

    if (notification.statusCode === '2') {
      if (!notification.paymentId) {
        return res.status(400).json({ message: 'PayHere payment ID is required' });
      }

      if (order.isPaid) {
        const paidOutbox = await createOrderOutboxEvent(order, 'order.paid', {
          request: req,
        });
        publishOutboxInBackground(paidOutbox._id);
        return res.status(200).json({ received: true, alreadyProcessed: true });
      }

      const paymentIdOrder = await Order.findOne({
        paymentIntentId: notification.paymentId,
        _id: { $ne: order._id },
      });
      if (paymentIdOrder) {
        return res.status(409).json({ message: 'PayHere payment has already been applied' });
      }

      await applySuccessfulPaymentToOrder({
        order,
        paymentIntent: {
          id: notification.paymentId,
          status: 'succeeded',
          amount_received: Number(notification.amount) * 100,
          currency: notification.currency,
          payment_method_types: [notification.method || 'PayHere'],
          receipt_email: order.shippingAddress?.email || '',
          created: Math.floor(Date.now() / 1000),
          provider: 'PayHere',
        },
        actor,
        source: 'webhook',
      });
      await deductReservedInventory({ order, actor });
      await commitPromotionsForOrder(order);
      await awardOrderLoyaltyPoints(order, actor);

      const updatedOrder = await order.save();
      const paidOutbox = await createOrderOutboxEvent(updatedOrder, 'order.paid', {
        request: req,
      });
      publishOutboxInBackground(paidOutbox._id);
      await syncVendorOrdersForOrder(updatedOrder);
      await notifyOrderEvent(updatedOrder, 'order.paid');
      await emitWebhookEvent('order.paid', updatedOrder.toObject(), {
        resourceType: 'Order',
        resourceId: updatedOrder._id.toString(),
      });
      console.log(
        `[paymentController:payhereNotify] Order ${notification.orderId} successfully marked as paid`
      );
    } else if (notification.statusCode === '-2' && !order.isPaid) {
      await applyFailedPaymentToOrder({
        order,
        paymentIntent: {
          id: notification.paymentId,
          status: 'failed',
          currency: notification.currency,
          payment_method_types: [notification.method || 'PayHere'],
          provider: 'PayHere',
        },
        actor,
        source: 'webhook',
        note: notification.statusMessage || 'PayHere reported that the payment failed.',
      });
      await releaseReservedInventory({
        order,
        actor,
        note: 'Released reservation after PayHere reported payment failure.',
      });
      await order.save();
      await syncVendorOrdersForOrder(order);
    } else if (notification.statusCode === '-1' && !order.isPaid) {
      await applyCancelledPaymentToOrder({
        order,
        paymentIntent: {
          id: notification.paymentId,
          status: 'canceled',
          currency: notification.currency,
          provider: 'PayHere',
        },
        actor,
        source: 'webhook',
      });
      await releaseReservedInventory({
        order,
        actor,
        note: 'Released reservation after PayHere reported payment cancellation.',
      });
      await order.save();
      await syncVendorOrdersForOrder(order);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[paymentController:payhereNotify]', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

export {
  createPaymentIntent,
  createRefund,
  handleStripeWebhook,
  getOrderPaymentEvents,
  generatePayhereHash,
  handlePayhereNotify,
};
