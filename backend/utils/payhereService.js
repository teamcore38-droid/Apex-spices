import crypto from 'crypto';

const md5Upper = (value) =>
  crypto.createHash('md5').update(String(value)).digest('hex').toUpperCase();

const formatPayhereAmount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error('Invalid PayHere amount');
  }

  return numericAmount.toFixed(2);
};

const buildPayhereCheckoutHash = ({ merchantId, merchantSecret, orderId, amount, currency }) => {
  const normalizedMerchantId = String(merchantId || '').trim();
  const normalizedSecret = String(merchantSecret || '').trim();
  const normalizedOrderId = String(orderId || '').trim();
  const normalizedCurrency = String(currency || '').trim().toUpperCase();

  if (!normalizedMerchantId || !normalizedSecret || !normalizedOrderId || !normalizedCurrency) {
    throw new Error('PayHere checkout configuration is incomplete');
  }

  return md5Upper(
    normalizedMerchantId +
      normalizedOrderId +
      formatPayhereAmount(amount) +
      normalizedCurrency +
      md5Upper(normalizedSecret)
  );
};

const buildPayhereNotificationSignature = ({
  merchantId,
  merchantSecret,
  orderId,
  amount,
  currency,
  statusCode,
}) =>
  md5Upper(
    String(merchantId || '').trim() +
      String(orderId || '').trim() +
      String(amount || '').trim() +
      String(currency || '').trim() +
      String(statusCode || '').trim() +
      md5Upper(String(merchantSecret || '').trim())
  );

const signaturesMatch = (receivedSignature, expectedSignature) => {
  const received = Buffer.from(String(receivedSignature || '').trim().toUpperCase(), 'utf8');
  const expected = Buffer.from(String(expectedSignature || '').trim().toUpperCase(), 'utf8');

  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

const isPublicPayhereNotifyUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    const hostname = url.hostname.toLowerCase();
    const isPrivateIpv4 =
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    const isLocal =
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('127.') ||
      isPrivateIpv4;

    return (
      url.protocol === 'https:' &&
      !isLocal &&
      url.pathname.endsWith('/api/payments/payhere/notify')
    );
  } catch {
    return false;
  }
};

const normalizePayhereNotification = (payload = {}) => ({
  merchantId: String(payload.merchant_id || '').trim(),
  orderId: String(payload.order_id || '').trim(),
  paymentId: String(payload.payment_id || '').trim(),
  amount: String(payload.payhere_amount || '').trim(),
  currency: String(payload.payhere_currency || '').trim().toUpperCase(),
  statusCode: String(payload.status_code || '').trim(),
  signature: String(payload.md5sig || '').trim().toUpperCase(),
  method: String(payload.method || '').trim(),
  statusMessage: String(payload.status_message || '').trim(),
});

const validatePayhereNotification = ({ payload, merchantId, merchantSecret }) => {
  const notification = normalizePayhereNotification(payload);
  const configuredMerchantId = String(merchantId || '').trim();
  const configuredSecret = String(merchantSecret || '').trim();

  if (!configuredMerchantId || !configuredSecret) {
    return { valid: false, reason: 'PayHere is not configured', notification };
  }

  if (
    !notification.merchantId ||
    !notification.orderId ||
    !notification.amount ||
    !notification.currency ||
    !notification.statusCode ||
    !notification.signature
  ) {
    return { valid: false, reason: 'Missing required notification fields', notification };
  }

  if (notification.merchantId !== configuredMerchantId) {
    return { valid: false, reason: 'Merchant ID mismatch', notification };
  }

  const expectedSignature = buildPayhereNotificationSignature({
    merchantId: notification.merchantId,
    merchantSecret: configuredSecret,
    orderId: notification.orderId,
    amount: notification.amount,
    currency: notification.currency,
    statusCode: notification.statusCode,
  });

  if (!signaturesMatch(notification.signature, expectedSignature)) {
    return { valid: false, reason: 'Signature mismatch', notification };
  }

  return { valid: true, reason: '', notification };
};

const validatePayhereOrderMatch = ({ order, notification }) => {
  if (order.paymentProvider !== 'PayHere') {
    return { valid: false, reason: 'Order is not assigned to PayHere' };
  }

  const expectedCurrency = String(order.currency || '').trim().toUpperCase();
  if (notification.currency !== expectedCurrency) {
    return { valid: false, reason: 'Payment currency does not match the order' };
  }

  const paidMinorUnits = Math.round(Number(notification.amount) * 100);
  const expectedMinorUnits = Math.round(Number(order.totalPrice) * 100);

  if (
    !Number.isFinite(paidMinorUnits) ||
    !Number.isFinite(expectedMinorUnits) ||
    paidMinorUnits !== expectedMinorUnits
  ) {
    return { valid: false, reason: 'Payment amount does not match the order total' };
  }

  return { valid: true, reason: '' };
};

export {
  buildPayhereCheckoutHash,
  buildPayhereNotificationSignature,
  formatPayhereAmount,
  isPublicPayhereNotifyUrl,
  normalizePayhereNotification,
  signaturesMatch,
  validatePayhereNotification,
  validatePayhereOrderMatch,
};
