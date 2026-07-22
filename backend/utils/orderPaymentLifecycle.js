import {
  sendOrderConfirmationEmail,
  sendOrderConfirmedEmail,
  sendOrderStatusUpdateEmail,
} from './emailService.js';

const pushStatusHistoryIfMeaningful = (order, entry) => {
  if (!entry?.note) {
    return false;
  }

  const lastEntry = order.statusHistory?.[order.statusHistory.length - 1];

  if (
    lastEntry &&
    lastEntry.status === entry.status &&
    lastEntry.note === entry.note &&
    String(lastEntry.updatedByName || '') === String(entry.updatedByName || '')
  ) {
    return false;
  }

  order.statusHistory.push({
    status: entry.status || order.orderStatus || 'Processing',
    note: entry.note,
    updatedAt: entry.updatedAt || new Date(),
    updatedBy: entry.updatedBy,
    updatedByName: entry.updatedByName || '',
  });

  return true;
};

const markNotificationSent = (order, key, value = new Date()) => {
  if (!order.notifications) {
    order.notifications = {};
  }

  order.notifications[key] = value;
};

const emailAttemptHandled = (result) =>
  Boolean(result?.sent || result?.queued || result?.skipped);

const calculateRefundStatus = (order) => {
  const refundedAmount = Number(order.refundedAmount || 0);
  const totalPaid = Number(
    order.paymentResult?.amountReceived || order.totalPrice || 0
  );

  if (!refundedAmount) {
    return 'Not Refunded';
  }

  if (refundedAmount >= totalPaid && totalPaid > 0) {
    return 'Refunded';
  }

  return 'Partially Refunded';
};

const calculateRefundableAmount = (order) =>
  Math.max(
    Number(order.paymentResult?.amountReceived || order.totalPrice || 0) -
      Number(order.refundedAmount || 0),
    0
  );

const maybeSendOrderPlacedEmail = async (order) => {
  if (order.notifications?.orderPlacedEmailSentAt || order.notifications?.orderConfirmationSentAt) {
    return false;
  }

  const result = await sendOrderConfirmationEmail(order);
  if (!emailAttemptHandled(result)) {
    return false;
  }

  markNotificationSent(order, 'orderPlacedEmailSentAt');
  markNotificationSent(order, 'orderConfirmationSentAt');
  return true;
};

const maybeSendOrderConfirmedEmail = async (order) => {
  if (order.notifications?.orderConfirmedEmailSentAt) {
    return false;
  }

  const result = await sendOrderConfirmedEmail(order);
  if (!emailAttemptHandled(result)) {
    return false;
  }

  markNotificationSent(order, 'orderConfirmedEmailSentAt');
  return true;
};

const maybeSendFinalStatusEmail = async (order) => {
  const isCancelled = order.orderStatus === 'Cancelled';
  const isDelivered = order.orderStatus === 'Delivered' || order.isDelivered;
  const notificationKey = isCancelled
    ? 'orderCancelledEmailSentAt'
    : isDelivered
      ? 'orderDeliveredEmailSentAt'
      : '';

  if (!notificationKey || order.notifications?.[notificationKey]) {
    return false;
  }

  const result = await sendOrderStatusUpdateEmail(order);
  if (!emailAttemptHandled(result)) {
    return false;
  }

  markNotificationSent(order, notificationKey);
  markNotificationSent(order, 'lastStatusEmailKey', notificationKey);
  return true;
};

const maybeSendStatusEmail = async (order) => {
  const sent = [];

  if (order.isPaid || order.paymentStatus === 'Paid' || order.orderStatus === 'Confirmed') {
    sent.push(await maybeSendOrderConfirmedEmail(order));
  }

  sent.push(await maybeSendFinalStatusEmail(order));

  return sent.some(Boolean);
};

const applySuccessfulPaymentToOrder = async ({
  order,
  paymentIntent,
  actor = {},
  source = 'system',
}) => {
  const alreadyPaid = Boolean(order.isPaid);
  const provider = paymentIntent.provider || order.paymentProvider || 'Stripe';

  order.isPaid = true;
  order.paidAt = paymentIntent.created
    ? new Date(paymentIntent.created * 1000)
    : order.paidAt || new Date();
  order.paymentProvider = provider;
  order.paymentMethod = order.paymentMethod || 'Card';
  order.paymentIntentId = paymentIntent.id || order.paymentIntentId || '';
  order.paymentStatus = 'Paid';
  order.paymentResult = {
    ...order.paymentResult,
    id: paymentIntent.id || order.paymentResult?.id || '',
    status: paymentIntent.status || order.paymentResult?.status || 'succeeded',
    amountReceived:
      Number(paymentIntent.amount_received || 0) > 0
        ? Number(paymentIntent.amount_received || 0) / 100
        : Number(order.paymentResult?.amountReceived || order.totalPrice || 0),
    currency: paymentIntent.currency || order.paymentResult?.currency || '',
    chargeId:
      order.paymentResult?.chargeId ||
      (typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : '') ||
      '',
    paymentMethodType:
      order.paymentResult?.paymentMethodType ||
      paymentIntent.payment_method_types?.[0] ||
      '',
    receiptEmail:
      paymentIntent.receipt_email ||
      order.paymentResult?.receiptEmail ||
      order.shippingAddress?.email ||
      '',
    created: paymentIntent.created
      ? new Date(paymentIntent.created * 1000)
      : order.paymentResult?.created,
  };

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note: alreadyPaid
      ? `${provider} payment success confirmed again via ${source}.`
      : `Payment succeeded via ${provider} ${source === 'webhook' ? 'webhook' : 'confirmation'}.`,
    updatedAt: new Date(),
    updatedBy: actor._id,
    updatedByName: actor.name || actor.email || provider,
  });

  await maybeSendOrderConfirmedEmail(order);
};

const applyFailedPaymentToOrder = async ({
  order,
  paymentIntent,
  actor = {},
  source = 'webhook',
  note,
}) => {
  const provider = paymentIntent?.provider || order.paymentProvider || 'Stripe';

  order.isPaid = false;
  order.paidAt = undefined;
  order.paymentProvider = provider;
  order.paymentIntentId = paymentIntent?.id || order.paymentIntentId || '';
  order.paymentStatus = 'Payment Failed';
  order.paymentResult = {
    ...order.paymentResult,
    id: paymentIntent?.id || order.paymentResult?.id || '',
    status: paymentIntent?.status || 'requires_payment_method',
    amountReceived: Number(order.paymentResult?.amountReceived || 0),
    currency: paymentIntent?.currency || order.paymentResult?.currency || '',
    chargeId: order.paymentResult?.chargeId || '',
    paymentMethodType:
      order.paymentResult?.paymentMethodType ||
      paymentIntent?.payment_method_types?.[0] ||
      '',
    receiptEmail:
      paymentIntent?.receipt_email ||
      order.paymentResult?.receiptEmail ||
      order.shippingAddress?.email ||
      '',
    created: paymentIntent?.created
      ? new Date(paymentIntent.created * 1000)
      : order.paymentResult?.created,
  };

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note:
      note ||
      `Payment failed via ${provider} ${source === 'webhook' ? 'webhook' : 'confirmation'} and the order remains unpaid.`,
    updatedAt: new Date(),
    updatedBy: actor._id,
    updatedByName: actor.name || actor.email || provider,
  });
};

const applyCancelledPaymentToOrder = async ({
  order,
  paymentIntent,
  actor = {},
  source = 'webhook',
}) => {
  const provider = paymentIntent?.provider || order.paymentProvider || 'Stripe';

  order.isPaid = false;
  order.paidAt = undefined;
  order.paymentProvider = provider;
  order.paymentIntentId = paymentIntent?.id || order.paymentIntentId || '';
  order.paymentStatus = 'Cancelled';
  order.paymentResult = {
    ...order.paymentResult,
    id: paymentIntent?.id || order.paymentResult?.id || '',
    status: paymentIntent?.status || 'canceled',
    currency: paymentIntent?.currency || order.paymentResult?.currency || '',
    receiptEmail:
      paymentIntent?.receipt_email ||
      order.paymentResult?.receiptEmail ||
      order.shippingAddress?.email ||
      '',
  };

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note: `Payment was cancelled via ${provider} ${source}.`,
    updatedAt: new Date(),
    updatedBy: actor._id,
    updatedByName: actor.name || actor.email || provider,
  });
};

const applyRefundToOrder = async ({
  order,
  refundRecord,
  actor = {},
  source = 'system',
  note,
}) => {
  const existingRefundIndex = order.refundHistory.findIndex(
    (entry) => entry.refundId === refundRecord.refundId
  );

  if (existingRefundIndex >= 0) {
    order.refundHistory[existingRefundIndex] = {
      ...order.refundHistory[existingRefundIndex].toObject?.(),
      ...refundRecord,
    };
  } else {
    order.refundHistory.push(refundRecord);
  }

  const successfulRefundTotal = order.refundHistory
    .filter((entry) => entry.status === 'succeeded')
    .reduce((total, entry) => total + Number(entry.amount || 0), 0);

  order.refundedAmount = successfulRefundTotal;

  if (refundRecord.status === 'failed') {
    order.refundStatus = 'Refund Failed';
  } else {
    order.refundStatus = calculateRefundStatus(order);
  }

  if (order.refundStatus === 'Refunded') {
    order.paymentStatus = 'Refunded';
  } else if (order.isPaid) {
    order.paymentStatus = 'Paid';
  }

  pushStatusHistoryIfMeaningful(order, {
    status: order.orderStatus,
    note:
      note ||
      (refundRecord.status === 'failed'
        ? `Refund attempt failed for ${refundRecord.amount.toFixed(2)} ${refundRecord.currency.toUpperCase()}.`
        : `Refund ${refundRecord.status} for ${refundRecord.amount.toFixed(2)} ${refundRecord.currency.toUpperCase()} via ${source}.`),
    updatedAt: refundRecord.createdAt || new Date(),
    updatedBy: actor._id || refundRecord.processedBy,
    updatedByName:
      actor.name || actor.email || refundRecord.processedByName || 'Stripe',
  });

};

export {
  calculateRefundableAmount,
  calculateRefundStatus,
  pushStatusHistoryIfMeaningful,
  markNotificationSent,
  emailAttemptHandled,
  maybeSendOrderPlacedEmail,
  maybeSendOrderConfirmedEmail,
  maybeSendStatusEmail,
  maybeSendFinalStatusEmail,
  applySuccessfulPaymentToOrder,
  applyFailedPaymentToOrder,
  applyCancelledPaymentToOrder,
  applyRefundToOrder,
};
