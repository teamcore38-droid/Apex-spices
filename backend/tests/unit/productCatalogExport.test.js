import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import Product from '../../models/productModel.js';
import User from '../../models/userModel.js';
import AuditLog from '../../models/auditLogModel.js';
import proAdminRoutes from '../../routes/proAdminRoutes.js';
import { CATALOG_EXPORT_HEADERS } from '../../controllers/proAdminController.js';

test('GET product catalog export uses the protected admin route and sample CSV contract', async (t) => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  process.env.JWT_SECRET = 'product-catalog-export-test-secret';
  process.env.FRONTEND_URL = 'https://www.apexspices.lk';

  const restore = [];
  const mockMethod = (target, name, implementation) => {
    const original = target[name];
    target[name] = implementation;
    restore.push(() => {
      target[name] = original;
    });
  };

  t.after(() => {
    restore.reverse().forEach((restoreMethod) => restoreMethod());
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  const adminId = '507f1f77bcf86cd799439011';
  const admin = {
    _id: adminId,
    name: 'Catalog Admin',
    email: 'admin@example.com',
    isAdmin: true,
    accountStatus: 'Active',
  };
  const product = {
    _id: '507f1f77bcf86cd799439012',
    sku: 'SKU-1',
    name: 'Black Pepper',
    description: 'Whole, premium peppercorns, packed fresh.',
    shortDescription: 'Premium peppercorns',
    category: 'Pepper',
    brand: 'Apex Spices',
    price: 19.99,
    compareAtPrice: 25,
    countInStock: 12,
    weight: '100g',
    image: 'https://cdn.example.com/pepper.jpg',
    isActive: true,
    approvalStatus: 'Approved',
  };

  mockMethod(User, 'findById', () => ({ select: async () => admin }));
  mockMethod(Product, 'find', () => ({
    sort() {
      return this;
    },
    lean: async () => [product],
  }));
  mockMethod(AuditLog, 'create', async () => undefined);

  const app = express();
  app.use('/api/admin/pro', proAdminRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const token = jwt.sign({ id: adminId }, process.env.JWT_SECRET);
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/admin/pro/bulk/products/export?format=catalog`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const body = await response.text();
  const lines = body.replace(/^\uFEFF/, '').trimEnd().split('\r\n');

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/csv/);
  assert.match(response.headers.get('content-disposition') || '', /apex-spices-product-catalog\.csv/);
  assert.equal(lines[0], CATALOG_EXPORT_HEADERS.join(','));
  assert.equal(lines.length, 2);
  assert.match(lines[1], /SKU-1/);
  assert.match(lines[1], /"Whole, premium peppercorns, packed fresh\."/);
  assert.match(lines[1], /25\.00 LKR/);
  assert.match(lines[1], /19\.99 LKR/);
  assert.match(lines[1], /https:\/\/www\.apexspices\.lk\/product\/507f1f77bcf86cd799439012/);
});
