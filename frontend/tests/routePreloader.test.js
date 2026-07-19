import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PRELOADED_ROUTES_KEY,
  hasPreloadedRoute,
  markRoutePreloaded,
  normalizeRoutePreloadKey,
  readPreloadedRoutes,
  shouldPreloadRoute,
  shouldTrackRequest,
} from '../src/utils/routePreloader.js';

const createMemoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
};

test('route preload keys are stable across aliases and trailing slashes', () => {
  assert.equal(normalizeRoutePreloadKey('/shop/'), '/products');
  assert.equal(normalizeRoutePreloadKey('/shop/sale'), '/products');
  assert.equal(normalizeRoutePreloadKey('/categories/'), '/categories');
  assert.equal(normalizeRoutePreloadKey('/account'), '/profile');
});

test('loaded routes are remembered once per browser session', () => {
  const storage = createMemoryStorage();

  assert.equal(hasPreloadedRoute('/products', storage), false);
  markRoutePreloaded('/shop', storage);
  markRoutePreloaded('/products', storage);

  assert.equal(hasPreloadedRoute('/products', storage), true);
  assert.deepEqual(readPreloadedRoutes(storage), ['/products']);
  assert.ok(storage.getItem(PRELOADED_ROUTES_KEY));
});

test('a route does not preload again after it finishes in the current document', () => {
  const storage = createMemoryStorage();
  const route = '/category/whole-spices';

  assert.equal(shouldPreloadRoute(route, storage), true);
  markRoutePreloaded(route, storage);
  assert.equal(shouldPreloadRoute(route, storage), false);
});

test('preloader tracks page API data but ignores analytics traffic', () => {
  assert.equal(shouldTrackRequest({ url: '/api/customer/home' }), true);
  assert.equal(shouldTrackRequest({ url: 'https://api.apexspices.lk/api/categories' }), true);
  assert.equal(shouldTrackRequest({ url: '/api/analytics/events' }), false);
  assert.equal(shouldTrackRequest({ url: '/assets/index.js' }), false);
});

test('application includes the immediate boot overlay and route readiness boundary', async () => {
  const [html, appSource, preloaderSource] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/RoutePreloader.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="apex-boot-preloader"/);
  assert.match(appSource, /<RoutePreloader>/);
  assert.match(appSource, /<RouteReadyBoundary routeKey={routePreloadKey}>/);
  assert.match(preloaderSource, /waitForApiIdle/);
  assert.match(preloaderSource, /waitForCriticalMedia/);
  assert.match(preloaderSource, /MAXIMUM_WAIT_MS = 10000/);
});
