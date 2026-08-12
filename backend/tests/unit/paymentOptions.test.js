import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COD_PAYMENT_METHOD,
  COD_PAYMENT_PROVIDER,
  isCashOnDeliveryOrder,
  resolveCheckoutPayment,
} from '../../utils/paymentOptions.js';

test('COD payment aliases normalize to the canonical production contract', () => {
  const result = resolveCheckoutPayment({
    paymentProvider: 'manual',
    paymentMethod: 'cash on delivery',
    environment: 'production',
  });

  assert.deepEqual(result, {
    valid: true,
    paymentProvider: COD_PAYMENT_PROVIDER,
    paymentMethod: COD_PAYMENT_METHOD,
    isCashOnDelivery: true,
    paymentStatus: 'Unpaid',
  });
  assert.equal(isCashOnDeliveryOrder({ paymentProvider: 'COD' }), true);
  assert.equal(isCashOnDeliveryOrder({ paymentMethod: 'Cash on Delivery' }), true);
});

test('COD rejects mixed gateway selections instead of silently downgrading payment', () => {
  const result = resolveCheckoutPayment({
    paymentProvider: 'PayHere',
    paymentMethod: 'Cash on Delivery',
    payhereConfigured: true,
    environment: 'production',
  });

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
});

test('secure online providers require their configured backend gateway', () => {
  assert.equal(
    resolveCheckoutPayment({ paymentProvider: 'PayHere', paymentMethod: 'Card' }).status,
    503
  );
  assert.equal(
    resolveCheckoutPayment({
      paymentProvider: 'PayHere',
      paymentMethod: 'Card',
      payhereConfigured: true,
      environment: 'production',
    }).paymentProvider,
    'PayHere'
  );
});

test('development placeholder remains test-only and is rejected in production', () => {
  assert.equal(
    resolveCheckoutPayment({
      paymentProvider: 'Manual',
      paymentMethod: 'Development Placeholder',
      environment: 'production',
    }).valid,
    false
  );
  assert.equal(
    resolveCheckoutPayment({
      paymentProvider: 'Manual',
      paymentMethod: 'Development Placeholder',
      environment: 'test',
    }).developmentPlaceholder,
    true
  );
});

test('unknown payment selections fail closed', () => {
  const result = resolveCheckoutPayment({
    paymentProvider: 'WireTransfer',
    paymentMethod: 'Bank Transfer',
    environment: 'production',
  });

  assert.equal(result.valid, false);
  assert.equal(result.status, 400);
});
