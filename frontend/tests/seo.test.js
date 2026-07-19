import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SITE_NAME,
  SITE_URL,
  buildProductStructuredData,
  canonicalForPath,
} from '../src/utils/seo.js';
import { isPrivateRoute, staticRouteSeo } from '../src/utils/routeSeo.js';
import { getCloudinarySrcSet, getOptimizedImageUrl } from '../src/utils/imageUi.js';

test('SEO configuration uses one production host and Apex Spices brand', () => {
  assert.equal(SITE_NAME, 'Apex Spices');
  assert.equal(SITE_URL, 'https://www.apexspices.lk');
  assert.equal(canonicalForPath('/products/'), 'https://www.apexspices.lk/products');
  assert.equal(staticRouteSeo['/products'].canonicalUrl, 'https://www.apexspices.lk/products');
});

test('private and transactional routes are excluded from indexable route metadata', () => {
  for (const pathname of ['/admin', '/checkout', '/profile', '/orders/example', '/track-order']) {
    assert.equal(isPrivateRoute(pathname), true);
    assert.equal(staticRouteSeo[pathname], undefined);
  }
});

test('product schema uses LKR and omits ratings when no approved reviews exist', () => {
  const schema = buildProductStructuredData({
    _id: 'product-id',
    name: 'Ceylon Cinnamon',
    image: '/cinnamon.webp',
    images: ['/cinnamon.webp'],
    category: 'Whole Spices',
    price: 1800.99,
    countInStock: 10,
    rating: 0,
    numReviews: 0,
  });
  const product = schema['@graph'].find((entry) => entry['@type'] === 'Product');

  assert.equal(product.offers.priceCurrency, 'LKR');
  assert.equal(product.aggregateRating, undefined);
  assert.deepEqual(product.image, ['https://www.apexspices.lk/cinnamon.webp']);
});

test('Vercel routes proxy the live sitemap and return dynamic SEO HTML', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const sitemapRewrite = config.rewrites.find((entry) => entry.source === '/sitemap.xml');
  const productRewrite = config.rewrites.find((entry) => entry.source === '/product/:id');

  assert.equal(sitemapRewrite.destination, 'https://api.apexspices.lk/sitemap.xml');
  assert.match(productRewrite.destination, /api\/seo-page/);
});

test('Cloudinary images use responsive automatic delivery without changing stored URLs', () => {
  const original = 'https://res.cloudinary.com/demo/image/upload/v1/apex/cinnamon.webp';
  const optimized = getOptimizedImageUrl(original, 600);

  assert.match(optimized, /f_auto,q_auto:good,c_limit,w_600/);
  assert.match(getCloudinarySrcSet(original, [320, 600]), /320w, .*600w/);
  assert.equal(getOptimizedImageUrl('/products/cinnamon.webp', 600), '/products/cinnamon.webp');
});
