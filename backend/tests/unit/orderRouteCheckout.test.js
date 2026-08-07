import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import orderRoutes from '../../routes/orderRoutes.js';
import paymentRoutes from '../../routes/paymentRoutes.js';
import { createDatabaseReadinessMiddleware } from '../../middleware/databaseReadinessMiddleware.js';
import { requestContext } from '../../middleware/requestContextMiddleware.js';
import { sanitizeRequest } from '../../middleware/sanitizeMiddleware.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
import ShippingRate from '../../models/shippingRateModel.js';
import TaxRule from '../../models/taxRuleModel.js';
import InventoryEvent from '../../models/inventoryEventModel.js';
import SecurityEvent from '../../models/securityEventModel.js';
import SequenceCounter from '../../models/sequenceCounterModel.js';
import NotificationOutbox from '../../models/notificationOutboxModel.js';
import VendorOrder from '../../models/vendorOrderModel.js';
import PushSubscription from '../../models/pushSubscriptionModel.js';
import PushNotificationLog from '../../models/pushNotificationLogModel.js';
import WebhookSubscription from '../../models/webhookSubscriptionModel.js';
import { buildPayhereCheckoutHash } from '../../utils/payhereService.js';

const createLeanQuery = (value) => ({
  sort() {
    return this;
  },
  lean: async () => value,
});

const createResolvedQuery = (value) => ({
  populate: async () => value,
  select: async () => value,
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

test('POST /api/orders survives the actual middleware chain and can initiate PayHere', async (t) => {
  const originalEnvironment = { ...process.env };
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'checkout-route-test-jwt-secret';
  process.env.PAYHERE_MERCHANT_ID = '1210000';
  process.env.PAYHERE_MERCHANT_SECRET = 'mock-payhere-merchant-secret';
  process.env.PAYHERE_MODE = 'sandbox';
  process.env.PAYHERE_NOTIFY_URL =
    'https://mock-payhere.example.com/api/payments/payhere/notify';
  delete process.env.EMAIL_HOST;
  delete process.env.QSTASH_TOKEN;

  t.after(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnvironment)) delete process.env[key];
    }
    Object.assign(process.env, originalEnvironment);
  });

  const restore = [];
  const mockMethod = (target, name, implementation) => {
    const original = target[name];
    target[name] = implementation;
    restore.push(() => {
      target[name] = original;
    });
  };
  t.after(() => restore.reverse().forEach((restoreMethod) => restoreMethod()));

  const userId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const outboxId = new mongoose.Types.ObjectId();
  const user = {
    _id: userId,
    name: 'Checkout Route Test',
    email: 'checkout-route@example.com',
    phone: '+94770000000',
    preferredCurrency: 'LKR',
    isAdmin: false,
  };
  const product = {
    _id: productId,
    name: 'Mock Ceylon Cinnamon',
    image: '/mock-cinnamon.webp',
    price: 100,
    countInStock: 10,
    reservedStock: 0,
    isActive: true,
    approvalStatus: 'Approved',
    variants: [],
    vendor: null,
    save: async function save() {
      return this;
    },
  };
  let persistedOrder = null;

  mockMethod(User, 'findById', () => createResolvedQuery(user));
  mockMethod(Product, 'findById', async () => product);
  mockMethod(ShippingRate, 'find', () => createLeanQuery([]));
  mockMethod(TaxRule, 'findOne', () => createLeanQuery(null));
  mockMethod(InventoryEvent, 'create', async () => ({}));
  mockMethod(SecurityEvent, 'countDocuments', async () => 0);
  mockMethod(SequenceCounter, 'create', async () => ({ value: 99 }));
  mockMethod(SequenceCounter, 'findOneAndUpdate', async () => ({ value: 100 }));
  mockMethod(Order, 'countDocuments', async () => 0);
  mockMethod(Order.collection, 'insertOne', async (document) => ({
    acknowledged: true,
    insertedId: document._id,
  }));
  mockMethod(Order.collection, 'updateOne', async () => ({
    acknowledged: true,
    matchedCount: 1,
    modifiedCount: 1,
  }));
  const originalSave = Order.prototype.save;
  mockMethod(Order.prototype, 'save', async function save(...args) {
    const result = await originalSave.apply(this, args);
    persistedOrder = result;
    return result;
  });
  mockMethod(Order, 'findById', () => createResolvedQuery(persistedOrder));
  mockMethod(NotificationOutbox, 'findOneAndUpdate', async (filter) =>
    filter.eventKey ? { _id: outboxId, eventKey: filter.eventKey } : null
  );
  mockMethod(NotificationOutbox, 'updateOne', async () => ({ acknowledged: true }));
  mockMethod(VendorOrder, 'updateMany', async () => ({ acknowledged: true }));
  mockMethod(VendorOrder, 'find', () => ({ populate: async () => [] }));
  mockMethod(PushSubscription, 'find', () => ({ limit: async () => [] }));
  mockMethod(PushNotificationLog, 'create', async () => ({}));
  mockMethod(WebhookSubscription, 'find', () => ({ select: async () => [] }));

  let readinessConnectCalls = 0;
  const requireReadyDatabase = createDatabaseReadinessMiddleware({
    connect: async () => {
      readinessConnectCalls += 1;
    },
    isReady: () => true,
    getState: () => 'connected',
  });
  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use(sanitizeRequest);
  app.use('/api/orders', requireReadyDatabase, orderRoutes);
  app.use('/api/payments', requireReadyDatabase, paymentRoutes);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = {
    fullName: 'Checkout Route Test',
    phone: '+94770000000',
    email: 'checkout-route@example.com',
    addressLine1: '100 Test Road',
    city: 'Colombo',
    state: 'Western',
    postalCode: '00100',
    country: 'Sri Lanka',
    countryCode: 'LK',
  };
  const authorization = `Bearer ${jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET)}`;
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const createResponse = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderItems: [{ product: productId.toString(), qty: 1, price: 100 }],
      shippingAddress: address,
      paymentMethod: 'Card',
      paymentProvider: 'PayHere',
      currency: 'LKR',
      totalPrice: 115,
    }),
  });
  const createdOrder = await createResponse.json();

  assert.equal(createResponse.status, 201, JSON.stringify(createdOrder));
  assert.equal(createdOrder.orderNumber, 'AXS-000100');
  assert.equal(createdOrder.paymentProvider, 'PayHere');
  assert.notEqual(createdOrder.message, 'next is not a function');
  assert.equal(readinessConnectCalls, 0);

  const paymentResponse = await fetch(`${baseUrl}/api/payments/payhere/hash`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId: createdOrder._id }),
  });
  const payment = await paymentResponse.json();

  assert.equal(paymentResponse.status, 200, JSON.stringify(payment));
  assert.equal(payment.merchantId, process.env.PAYHERE_MERCHANT_ID);
  assert.equal(payment.notifyUrl, process.env.PAYHERE_NOTIFY_URL);
  assert.equal(payment.currency, 'LKR');
  assert.equal(payment.amount, Number(createdOrder.totalPrice).toFixed(2));
  assert.equal(payment.sandbox, true);
  assert.equal(
    payment.hash,
    buildPayhereCheckoutHash({
      merchantId: process.env.PAYHERE_MERCHANT_ID,
      merchantSecret: process.env.PAYHERE_MERCHANT_SECRET,
      orderId: createdOrder._id,
      amount: payment.amount,
      currency: payment.currency,
    })
  );

  await new Promise((resolve) => setImmediate(resolve));
});
