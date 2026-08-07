import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getMongoConnectionState, isMongoReady } from '../config/db.js';
import { captureException } from '../utils/errorMonitoring.js';
import { sendAlert } from '../utils/alertService.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Order from '../models/orderModel.js';
import products from '../data/products.js';
import users from '../data/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const startedAt = new Date();
const counters = {
  clientErrors: 0,
  uptimeChecks: 0,
};

const getOpsHealth = (_req, res) => {
  const dbReady = isMongoReady();

  res.set('Cache-Control', 'no-store');
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'not_ready',
    service: process.env.SERVICE_NAME || 'apex-backend',
    environment: process.env.NODE_ENV || 'development',
    startedAt,
    uptimeSeconds: process.uptime(),
    database: {
      state: getMongoConnectionState(),
    },
  });
};

const getReadiness = (_req, res) => {
  const dbReady = isMongoReady();

  res.set('Cache-Control', 'no-store');
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ready' : 'not_ready',
    database: {
      state: getMongoConnectionState(),
    },
  });
};

const getMetrics = (_req, res) => {
  const memory = process.memoryUsage();

  res.type('text/plain').send(
    [
      '# HELP apex_uptime_seconds Process uptime in seconds',
      '# TYPE apex_uptime_seconds gauge',
      `apex_uptime_seconds ${Math.round(process.uptime())}`,
      '# HELP apex_memory_heap_used_bytes Node heap used',
      '# TYPE apex_memory_heap_used_bytes gauge',
      `apex_memory_heap_used_bytes ${memory.heapUsed}`,
      '# HELP apex_client_errors_total Client-side errors received',
      '# TYPE apex_client_errors_total counter',
      `apex_client_errors_total ${counters.clientErrors}`,
      '# HELP apex_uptime_checks_total Uptime checks received',
      '# TYPE apex_uptime_checks_total counter',
      `apex_uptime_checks_total ${counters.uptimeChecks}`,
    ].join('\n')
  );
};

const recordClientError = async (req, res) => {
  counters.clientErrors += 1;
  await captureException(new Error(req.body?.message || 'Client error'), {
    level: 'error',
    source: 'frontend',
    path: req.body?.path || '',
    stack: req.body?.stack || '',
    requestId: req.requestId,
  });

  res.status(202).json({ accepted: true });
};

const uptimeCheck = async (_req, res) => {
  counters.uptimeChecks += 1;
  const dbReady = isMongoReady();

  if (!dbReady) {
    await sendAlert({
      title: 'Apex uptime check failed',
      message: `Database state is ${getMongoConnectionState()}`,
      severity: 'critical',
    });
  }

  res.set('Cache-Control', 'no-store');
  res.status(dbReady ? 200 : 503).json({
    ok: dbReady,
    checkedAt: new Date().toISOString(),
    database: getMongoConnectionState(),
  });
};

const getOpenApi = async (_req, res) => {
  const openApiPath = join(__dirname, '..', 'docs', 'openapi.json');
  const contents = await readFile(openApiPath, 'utf8');
  res.type('application/json').send(contents);
};

const seedDatabase = async (req, res) => {
  const seedSecret = process.env.DB_SEED_SECRET;

  if (!seedSecret) {
    return res.status(403).json({ message: 'Forbidden: Database seeding is disabled on this environment' });
  }

  if (req.query.secret !== seedSecret) {
    return res.status(403).json({ message: 'Forbidden: Invalid seed secret' });
  }

  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]._id;

    const sampleProducts = products.map((p) => {
      return { ...p, user: adminUser };
    });

    await Product.insertMany(sampleProducts);

    res.json({ message: 'Database successfully seeded. Existing categories were preserved.' });
  } catch (error) {
    console.error('[opsController:seedDatabase]', error);
    res.status(500).json({ error: error.message });
  }
};

export {
  getMetrics,
  getOpenApi,
  getOpsHealth,
  getReadiness,
  recordClientError,
  uptimeCheck,
  seedDatabase,
};
