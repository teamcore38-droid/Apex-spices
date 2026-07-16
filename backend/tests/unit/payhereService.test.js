import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPayhereCheckoutHash,
  buildPayhereNotificationSignature,
  isPublicPayhereNotifyUrl,
  validatePayhereNotification,
  validatePayhereOrderMatch,
} from '../../utils/payhereService.js';

const merchantId = '1220000';
const merchantSecret = 'sandbox-domain-secret';

const buildPayload = (overrides = {}) => {
  const payload = {
    merchant_id: merchantId,
    order_id: '665000000000000000000001',
    payment_id: '320000012345',
    payhere_amount: '1250.00',
    payhere_currency: 'LKR',
    status_code: '2',
    method: 'VISA',
    ...overrides,
  };

  payload.md5sig = buildPayhereNotificationSignature({
    merchantId: payload.merchant_id,
    merchantSecret,
    orderId: payload.order_id,
    amount: payload.payhere_amount,
    currency: payload.payhere_currency,
    statusCode: payload.status_code,
  });

  return payload;
};

test('buildPayhereCheckoutHash formats the server amount consistently', () => {
  const fromNumber = buildPayhereCheckoutHash({
    merchantId,
    merchantSecret,
    orderId: 'order-1',
    amount: 1250,
    currency: 'lkr',
  });
  const fromFormattedString = buildPayhereCheckoutHash({
    merchantId,
    merchantSecret,
    orderId: 'order-1',
    amount: '1250.00',
    currency: 'LKR',
  });

  assert.equal(fromNumber, fromFormattedString);
  assert.equal(fromNumber, 'E49FEBC8B7644FD3CD39E1D12095FF51');
});

test('validatePayhereNotification accepts a correctly signed notification', () => {
  const payload = buildPayload();
  const result = validatePayhereNotification({
    payload,
    merchantId,
    merchantSecret,
  });

  assert.equal(payload.md5sig, 'EFDAE62D20AF79B4A613FE34125C3B66');
  assert.equal(result.valid, true);
  assert.equal(result.notification.statusCode, '2');
});

test('validatePayhereNotification rejects a tampered signed field', () => {
  const payload = buildPayload();
  payload.payhere_amount = '1.00';

  const result = validatePayhereNotification({ payload, merchantId, merchantSecret });

  assert.equal(result.valid, false);
  assert.equal(result.reason, 'Signature mismatch');
});

test('validatePayhereOrderMatch requires the expected provider, amount, and currency', () => {
  const notification = validatePayhereNotification({
    payload: buildPayload(),
    merchantId,
    merchantSecret,
  }).notification;

  assert.equal(
    validatePayhereOrderMatch({
      order: { paymentProvider: 'PayHere', totalPrice: 1250, currency: 'LKR' },
      notification,
    }).valid,
    true
  );
  assert.equal(
    validatePayhereOrderMatch({
      order: { paymentProvider: 'Manual', totalPrice: 1250, currency: 'LKR' },
      notification,
    }).valid,
    false
  );
  assert.equal(
    validatePayhereOrderMatch({
      order: { paymentProvider: 'PayHere', totalPrice: 1200, currency: 'LKR' },
      notification,
    }).valid,
    false
  );
});

test('isPublicPayhereNotifyUrl rejects callback URLs PayHere cannot reach', () => {
  assert.equal(
    isPublicPayhereNotifyUrl('https://api.apexspices.lk/api/payments/payhere/notify'),
    true
  );
  assert.equal(
    isPublicPayhereNotifyUrl('http://localhost:5000/api/payments/payhere/notify'),
    false
  );
  assert.equal(
    isPublicPayhereNotifyUrl('https://192.168.1.20/api/payments/payhere/notify'),
    false
  );
});
