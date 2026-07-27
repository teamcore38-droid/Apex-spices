import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import Product from '../../models/productModel.js';
import { normalizeCartItems } from '../../utils/commerceService.js';

const productId = new mongoose.Types.ObjectId();

const withProductLookup = async (product, assertion) => {
  const originalFindById = Product.findById;

  Product.findById = async (id) => {
    assert.equal(String(id), String(productId));
    return product;
  };

  try {
    await assertion();
  } finally {
    Product.findById = originalFindById;
  }
};

const buildProduct = (overrides = {}) => ({
  _id: productId,
  name: 'Ceylon Cinnamon',
  image: '/cinnamon.webp',
  price: 1000,
  countInStock: 10,
  reservedStock: 0,
  isActive: true,
  approvalStatus: 'Approved',
  variants: [],
  sku: 'CIN-001',
  ...overrides,
});

test('custom quantity pricing uses the product unit price instead of the cart payload', async () => {
  const product = buildProduct({
    allowCustomQuantity: true,
    customQuantitySettings: {
      unit: 'g',
      unitPrice: 2.5,
      minQuantity: 50,
      maxQuantity: 1000,
    },
  });

  await withProductLookup(product, async () => {
    const [item] = await normalizeCartItems([
      {
        product: productId,
        qty: 1,
        isCustomQuantity: true,
        customQuantity: 100,
        customUnit: 'kg',
        customQuantityFormatted: 'tampered',
        unitPrice: 0.01,
      },
    ]);

    assert.equal(item.isCustomQuantity, true);
    assert.equal(item.customUnit, 'g');
    assert.equal(item.customQuantityFormatted, '100g');
    assert.equal(item.unitPrice, 2.5);
    assert.equal(item.price, 250);
  });
});

test('custom quantity checkout rejects quantities below the product minimum', async () => {
  const product = buildProduct({
    allowCustomQuantity: true,
    customQuantitySettings: {
      unit: 'g',
      unitPrice: 2.5,
      minQuantity: 50,
      maxQuantity: 1000,
    },
  });

  await withProductLookup(product, async () => {
    await assert.rejects(
      () => normalizeCartItems([{ product: productId, qty: 1, isCustomQuantity: true, customQuantity: 25 }]),
      /at least 50g/
    );
  });
});

test('custom-enabled products use the default product price and weight when no custom quantity is selected', async () => {
  const product = buildProduct({
    allowCustomQuantity: true,
    price: 2500,
    weight: '250g',
    customQuantitySettings: {
      unit: 'g',
      unitPrice: 10,
      minQuantity: 50,
      maxQuantity: 10000,
    },
  });

  await withProductLookup(product, async () => {
    const [item] = await normalizeCartItems([{ product: productId, qty: 1 }]);

    assert.equal(item.isCustomQuantity, false);
    assert.equal(item.customQuantity, 0);
    assert.equal(item.customUnit, '');
    assert.equal(item.customQuantityFormatted, '');
    assert.equal(item.unitPrice, 0);
    assert.equal(item.variantLabel, 'Default Weight: 250g');
    assert.equal(item.price, 2500);
  });
});

test('fixed quantity products ignore fake custom quantity payload fields', async () => {
  const product = buildProduct({
    allowCustomQuantity: false,
    price: 1200,
  });

  await withProductLookup(product, async () => {
    const [item] = await normalizeCartItems([
      {
        product: productId,
        qty: 1,
        isCustomQuantity: true,
        customQuantity: 5,
        unitPrice: 1,
      },
    ]);

    assert.equal(item.isCustomQuantity, false);
    assert.equal(item.customQuantity, 0);
    assert.equal(item.customUnit, '');
    assert.equal(item.unitPrice, 0);
    assert.equal(item.price, 1200);
  });
});

test('product create and update persist custom quantity settings', async () => {
  const source = await readFile(new URL('../../controllers/productController.js', import.meta.url), 'utf8');

  assert.match(source, /allowCustomQuantity:\s*normalized\.allowCustomQuantity/);
  assert.match(source, /customQuantitySettings:\s*normalized\.customQuantitySettings/);
  assert.match(source, /product\.allowCustomQuantity\s*=\s*normalized\.allowCustomQuantity/);
  assert.match(source, /product\.customQuantitySettings\s*=\s*normalized\.customQuantitySettings/);
});
