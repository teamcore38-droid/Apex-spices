const COD_PAYMENT_PROVIDER = 'COD';
const COD_PAYMENT_METHOD = 'Cash on Delivery';
const DEVELOPMENT_PAYMENT_PROVIDER = 'Manual';
const DEVELOPMENT_PAYMENT_METHOD = 'Development Placeholder';

const normalizePaymentToken = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const invalidPayment = (message, status = 400) => ({
  valid: false,
  status,
  message,
});

const resolveCheckoutPayment = ({
  paymentProvider = '',
  paymentMethod = '',
  payhereConfigured = false,
  stripeConfigured = false,
  environment = process.env.NODE_ENV || 'development',
} = {}) => {
  const provider = normalizePaymentToken(paymentProvider);
  const method = normalizePaymentToken(paymentMethod);
  const isCodRequest = provider === 'cod' || method === 'cod' || method === 'cashondelivery';

  if (isCodRequest) {
    if (
      (provider && !['cod', 'manual'].includes(provider)) ||
      (method && !['cod', 'cashondelivery'].includes(method))
    ) {
      return invalidPayment('Cash on delivery must use the COD payment selection.');
    }

    return {
      valid: true,
      paymentProvider: COD_PAYMENT_PROVIDER,
      paymentMethod: COD_PAYMENT_METHOD,
      isCashOnDelivery: true,
      paymentStatus: 'Unpaid',
    };
  }

  if (provider === 'payhere') {
    if (!payhereConfigured) {
      return invalidPayment('PayHere is not configured for this environment.', 503);
    }

    if (method && !['card', 'payhere'].includes(method)) {
      return invalidPayment('PayHere checkout must use the card payment selection.');
    }

    return {
      valid: true,
      paymentProvider: 'PayHere',
      paymentMethod: 'Card',
      isCashOnDelivery: false,
      paymentStatus: 'Payment Pending',
    };
  }

  if (provider === 'stripe') {
    if (!stripeConfigured) {
      return invalidPayment('Stripe is not configured for this environment.', 503);
    }

    if (method && !['card', 'stripe'].includes(method)) {
      return invalidPayment('Stripe checkout must use the card payment selection.');
    }

    return {
      valid: true,
      paymentProvider: 'Stripe',
      paymentMethod: 'Card',
      isCashOnDelivery: false,
      paymentStatus: 'Payment Pending',
    };
  }

  if (
    provider === '' ||
    provider === 'manual' ||
    (provider === 'developmentplaceholder' && method === '')
  ) {
    if (environment === 'production') {
      return invalidPayment(
        'Select Cash on Delivery or a configured secure online payment method.'
      );
    }

    if (method && method !== 'developmentplaceholder' && method !== 'manual') {
      return invalidPayment('The selected payment method is not supported.');
    }

    return {
      valid: true,
      paymentProvider: DEVELOPMENT_PAYMENT_PROVIDER,
      paymentMethod: DEVELOPMENT_PAYMENT_METHOD,
      isCashOnDelivery: false,
      developmentPlaceholder: true,
      paymentStatus: 'Payment Pending',
    };
  }

  return invalidPayment('The selected payment method is not supported.');
};

const isCashOnDeliveryOrder = (order = {}) =>
  normalizePaymentToken(order.paymentProvider) === 'cod' ||
  ['cod', 'cashondelivery'].includes(normalizePaymentToken(order.paymentMethod));

export {
  COD_PAYMENT_METHOD,
  COD_PAYMENT_PROVIDER,
  DEVELOPMENT_PAYMENT_METHOD,
  DEVELOPMENT_PAYMENT_PROVIDER,
  isCashOnDeliveryOrder,
  normalizePaymentToken,
  resolveCheckoutPayment,
};
