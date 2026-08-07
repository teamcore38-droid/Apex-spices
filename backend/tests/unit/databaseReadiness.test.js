import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import connectDB from '../../config/db.js';
import { getHomePageData } from '../../controllers/customerExperienceController.js';
import { getOpsHealth, getReadiness } from '../../controllers/opsController.js';
import { createDatabaseReadinessMiddleware } from '../../middleware/databaseReadinessMiddleware.js';

const createResponse = () => ({
  body: null,
  headers: {},
  statusCode: 200,
  set(name, value) {
    this.headers[name] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('database readiness middleware waits for the shared connection before continuing', async () => {
  let ready = false;
  let connectCalls = 0;
  let nextCalls = 0;
  const middleware = createDatabaseReadinessMiddleware({
    connect: async () => {
      connectCalls += 1;
      ready = true;
      return true;
    },
    getState: () => (ready ? 'connected' : 'disconnected'),
    isReady: () => ready,
  });

  await middleware({}, createResponse(), () => {
    nextCalls += 1;
  });

  assert.equal(connectCalls, 1);
  assert.equal(nextCalls, 1);
});

test('database readiness middleware returns a non-cacheable 503 when connection fails', async () => {
  let nextCalls = 0;
  const response = createResponse();
  const middleware = createDatabaseReadinessMiddleware({
    connect: async () => {
      throw new Error('connection failed');
    },
    getState: () => 'disconnected',
    isReady: () => false,
  });

  await middleware({}, response, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 0);
  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(response.headers['Retry-After'], '5');
  assert.equal(response.body.status, 'unavailable');
  assert.equal(response.body.database.state, 'disconnected');
});

test('connectDB shares one in-flight connection attempt across concurrent callers', async () => {
  const originalConnect = mongoose.connect;
  const originalReadyState = mongoose.connection.readyState;
  const originalMongoUri = process.env.MONGO_URI;
  const originalNodeEnv = process.env.NODE_ENV;
  let releaseConnection;
  let connectCalls = 0;

  try {
    mongoose.connection.readyState = 0;
    process.env.MONGO_URI = 'mongodb://readiness-test.invalid/apex';
    process.env.NODE_ENV = 'production';
    mongoose.connect = async () => {
      connectCalls += 1;
      await new Promise((resolve) => {
        releaseConnection = resolve;
      });
      mongoose.connection.readyState = 1;
      return { connection: { host: 'readiness-test' } };
    };

    const first = connectDB({ strict: true, force: true });
    const second = connectDB({ strict: true, force: true });
    await Promise.resolve();

    assert.equal(connectCalls, 1);
    releaseConnection();
    assert.deepEqual(await Promise.all([first, second]), [true, true]);
  } finally {
    mongoose.connect = originalConnect;
    mongoose.connection.readyState = originalReadyState;
    if (originalMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalMongoUri;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('health and readiness endpoints report 200 only while MongoDB is connected', () => {
  const originalReadyState = mongoose.connection.readyState;

  try {
    mongoose.connection.readyState = 0;
    const healthResponse = createResponse();
    const readinessResponse = createResponse();

    getOpsHealth({}, healthResponse);
    getReadiness({}, readinessResponse);

    assert.equal(healthResponse.statusCode, 503);
    assert.equal(healthResponse.headers['Cache-Control'], 'no-store');
    assert.equal(healthResponse.body.status, 'not_ready');
    assert.equal(healthResponse.body.database.state, 'disconnected');
    assert.equal(readinessResponse.statusCode, 503);
    assert.equal(readinessResponse.headers['Cache-Control'], 'no-store');
    assert.equal(readinessResponse.body.status, 'not_ready');

    mongoose.connection.readyState = 1;
    const healthyResponse = createResponse();
    const readyResponse = createResponse();

    getOpsHealth({}, healthyResponse);
    getReadiness({}, readyResponse);

    assert.equal(healthyResponse.statusCode, 200);
    assert.equal(healthyResponse.body.status, 'ok');
    assert.equal(healthyResponse.body.database.state, 'connected');
    assert.equal(readyResponse.statusCode, 200);
    assert.equal(readyResponse.body.status, 'ready');
  } finally {
    mongoose.connection.readyState = originalReadyState;
  }
});

test('home data returns a non-cacheable 503 instead of fallback data when MongoDB is unavailable', async () => {
  const originalReadyState = mongoose.connection.readyState;

  try {
    mongoose.connection.readyState = 0;
    const response = createResponse();

    await getHomePageData({ requestId: 'readiness-test' }, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.equal(response.body.status, 'unavailable');
    assert.equal(response.body.database.state, 'disconnected');
    assert.equal('featuredProducts' in response.body, false);
    assert.equal('bestSellers' in response.body, false);
    assert.equal('categories' in response.body, false);
  } finally {
    mongoose.connection.readyState = originalReadyState;
  }
});
