import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import orderRoutes from '../../routes/orderRoutes.js';
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
import AuditLog from '../../models/auditLogModel.js';
import { LoyaltyAccount, LoyaltyTransaction } from '../../models/loyaltyModel.js';

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

test('COD checkout and collection use the actual authenticated Express route chain', async (t) => {
  const originalEnvironment = { ...process.env };
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'cod-route-test-jwt-secret';
  delete process.env.PAYHERE_MERCHANT_ID;
  delete process.env.STRIPE_SECRET_KEY;
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

  const adminId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();
  const outboxId = new mongoose.Types.ObjectId();
  const user = {
    _id: adminId,
    name: 'COD Fulfillment Admin',
    email: 'cod-admin@example.com',
    phone: '+94770000000',
    preferredCurrency: 'LKR',
    isAdmin: true,
    isStaff: true,
    accountStatus: 'Active',
    staffStatus: 'Active',
  };
  const product = {
    _id: productId,
    name: 'COD Cinnamon',
    image: '/mock-cod-cinnamon.webp',
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
  mockMethod(SequenceCounter, 'create', async () => ({ value: 199 }));
  mockMethod(SequenceCounter, 'findOneAndUpdate', async () => ({ value: 200 }));
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
  mockMethod(NotificationOutbox, 'findOneAndUpdate', async () => ({ _id: outboxId }));
  mockMethod(NotificationOutbox, 'updateOne', async () => ({ acknowledged: true }));
  mockMethod(VendorOrder, 'updateMany', async () => ({ acknowledged: true }));
  mockMethod(VendorOrder, 'find', () => ({ populate: async () => [] }));
  mockMethod(PushSubscription, 'find', () => ({ limit: async () => [] }));
  mockMethod(PushNotificationLog, 'create', async () => ({}));
  mockMethod(WebhookSubscription, 'find', () => ({ select: async () => [] }));
  mockMethod(AuditLog, 'create', async () => ({}));
  const loyaltyAccount = {
    pointsBalance: 0,
    lifetimePoints: 0,
    save: async function save() {
      return this;
    },
  };
  mockMethod(LoyaltyAccount, 'findOneAndUpdate', async () => loyaltyAccount);
  mockMethod(LoyaltyTransaction, 'create', async () => ({}));

  const requireReadyDatabase = createDatabaseReadinessMiddleware({
    connect: async () => {},
    isReady: () => true,
    getState: () => 'connected',
  });
  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use(sanitizeRequest);
  app.use('/api/orders', requireReadyDatabase, orderRoutes);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = {
    fullName: 'COD Customer',
    phone: '+94770000000',
    email: 'cod-customer@example.com',
    addressLine1: '100 Delivery Road',
    city: 'Colombo',
    state: 'Colombo',
    district: 'Colombo',
    postalCode: '00100',
    country: 'Sri Lanka',
    countryCode: 'LK',
  };
  const authorization = `Bearer ${jwt.sign({ id: adminId.toString() }, process.env.JWT_SECRET)}`;
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const requestOptions = {
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
  };

  const internationalResponse = await fetch(`${baseUrl}/api/orders`, {
    ...requestOptions,
    method: 'POST',
    body: JSON.stringify({
      orderItems: [{ product: productId.toString(), qty: 1, price: 100 }],
      shippingAddress: {
        ...address,
        country: 'United States',
        countryCode: 'US',
        state: 'New York',
        district: 'New York',
      },
      paymentMethod: 'Cash on Delivery',
      paymentProvider: 'COD',
      currency: 'USD',
    }),
  });
  assert.equal(internationalResponse.status, 400);

  const createResponse = await fetch(`${baseUrl}/api/orders`, {
    ...requestOptions,
    method: 'POST',
    body: JSON.stringify({
      orderItems: [{ product: productId.toString(), qty: 1, price: 100 }],
      shippingAddress: address,
      paymentMethod: 'Cash on Delivery',
      paymentProvider: 'COD',
      currency: 'LKR',
      totalPrice: 115,
    }),
  });
  const createdOrder = await createResponse.json();

  assert.equal(createResponse.status, 201, JSON.stringify(createdOrder));
  assert.equal(createdOrder.paymentProvider, 'COD');
  assert.equal(createdOrder.paymentMethod, 'Cash on Delivery');
  assert.equal(createdOrder.paymentStatus, 'Unpaid');
  assert.equal(createdOrder.codStatus, 'Pending');
  assert.equal(createdOrder.isPaid, false);
  assert.equal(createdOrder.inventoryStatus, 'Reserved');

  const earlyCollectionResponse = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/cod/collect`, {
    ...requestOptions,
    method: 'PUT',
    body: JSON.stringify({}),
  });
  assert.equal(earlyCollectionResponse.status, 409);

  const genericPaidResponse = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/status`, {
    ...requestOptions,
    method: 'PUT',
    body: JSON.stringify({ isPaid: true }),
  });
  assert.equal(genericPaidResponse.status, 409);

  const deliveryResponse = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/status`, {
    ...requestOptions,
    method: 'PUT',
    body: JSON.stringify({ orderStatus: 'Delivered', isDelivered: true }),
  });
  assert.equal(deliveryResponse.status, 200);

  const collectionResponse = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/cod/collect`, {
    ...requestOptions,
    method: 'PUT',
    body: JSON.stringify({ collectionNote: 'Collected in cash at the doorstep.' }),
  });
  const collectedOrder = await collectionResponse.json();

  assert.equal(collectionResponse.status, 200, JSON.stringify(collectedOrder));
  assert.equal(collectedOrder.paymentStatus, 'Paid');
  assert.equal(collectedOrder.isPaid, true);
  assert.equal(collectedOrder.codStatus, 'Collected');
  assert.equal(collectedOrder.paymentResult.paymentMethodType, 'cash_on_delivery');
  assert.equal(collectedOrder.inventoryStatus, 'Deducted');

  const onlinePaymentResponse = await fetch(`${baseUrl}/api/orders/${createdOrder._id}/pay`, {
    ...requestOptions,
    method: 'PUT',
    body: JSON.stringify({ paymentIntentId: 'pi_cod_must_not_use' }),
  });
  assert.equal(onlinePaymentResponse.status, 409);
});
