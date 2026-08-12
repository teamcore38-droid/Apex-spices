import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('checkout exposes COD alongside PayHere and sends the canonical COD contract', async () => {
  const source = await readFile(new URL('../src/pages/CheckoutPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /const COD_PAYMENT_PROVIDER = 'COD'/);
  assert.match(source, /const COD_PAYMENT_METHOD = 'Cash on Delivery'/);
  assert.match(source, /data-testid="checkout-payment-methods"/);
  assert.match(source, /useState\(true\)/);
  assert.match(source, /className="order-1 overflow-hidden[^"]*lg:row-start-1/);
  assert.match(source, /className="order-2 space-y-6 lg:col-start-1 lg:row-start-2"/);
  assert.match(source, /name="checkout-payment-method"/);
  assert.match(source, /value="COD"/);
  assert.match(source, /Cash on Delivery/);
  assert.ok(source.includes("paymentProvider: activePaymentSelection === 'COD' ? COD_PAYMENT_PROVIDER : 'PayHere'"));
  assert.ok(source.includes("paymentMethod: activePaymentSelection === 'COD' ? COD_PAYMENT_METHOD : 'Card'"));
  assert.match(source, /Cash on delivery is currently available only for Sri Lanka deliveries/);
});

test('admin order controls use a dedicated COD collection action', async () => {
  const source = await readFile(new URL('../src/pages/AdminOrderDetailPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /\/api\/orders\/\$\{order\._id\}\/cod\/collect/);
  assert.match(source, /Record COD Collection/);
  assert.match(source, /disabled=\{order\.paymentProvider === 'COD'\}/);
});
