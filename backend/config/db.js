import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/apexlinkgroup';
const stateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const DEFAULT_RETRY_DELAY_MS = 5000;
let connectionPromise = null;
let lastConnectionError = null;
let retryAfter = 0;

const getRetryDelayMs = () => {
  const configuredDelay = Number.parseInt(process.env.MONGO_RETRY_DELAY_MS, 10);
  return Number.isFinite(configuredDelay) && configuredDelay >= 0
    ? configuredDelay
    : DEFAULT_RETRY_DELAY_MS;
};

const rememberConnectionFailure = (error) => {
  lastConnectionError = error;
  retryAfter = Date.now() + getRetryDelayMs();
};

const clearConnectionFailure = () => {
  lastConnectionError = null;
  retryAfter = 0;
};

const performConnection = async (options = {}) => {
  const primaryUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const localUri = process.env.LOCAL_MONGO_URI || DEFAULT_LOCAL_URI;

  const tryConnect = async (uri, label) => {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });

    console.log(`MongoDB Connected (${label}): ${conn.connection.host}`);
    return true;
  };

  try {
    if (primaryUri) {
      return await tryConnect(primaryUri, 'primary');
    }
  } catch (error) {
    console.warn(`MongoDB primary connection failed: ${error.message}`);
    if (options.strict || process.env.NODE_ENV === 'production') {
      throw error;
    }
  }

  try {
    return await tryConnect(localUri, 'local');
  } catch (error) {
    console.warn(`MongoDB local connection failed: ${error.message}`);
    if (options.strict) {
      throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MongoDB connection failed and no fallback database is available.');
  }

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await tryConnect(memoryUri, 'memory');
    console.log(`MongoDB Memory Server started at ${memoryUri}`);
    return true;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    return false;
  }
};

const connectDB = async (options = {}) => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (mongoose.connection.readyState === 2) {
    const error = new Error('MongoDB connection is still being established.');
    if (options.strict || process.env.NODE_ENV === 'production') {
      throw error;
    }
    return false;
  }

  if (!options.force && lastConnectionError && Date.now() < retryAfter) {
    if (options.strict || process.env.NODE_ENV === 'production') {
      throw lastConnectionError;
    }
    return false;
  }

  connectionPromise = (async () => {
    try {
      const connected = await performConnection(options);

      if (!connected || mongoose.connection.readyState !== 1) {
        const error = new Error('MongoDB connection did not become ready.');
        rememberConnectionFailure(error);
        if (options.strict || process.env.NODE_ENV === 'production') {
          throw error;
        }
        return false;
      }

      clearConnectionFailure();
      return true;
    } catch (error) {
      rememberConnectionFailure(error);
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

export const getMongoConnectionState = () => stateMap[mongoose.connection.readyState] || 'unknown';
export const isMongoReady = () => mongoose.connection.readyState === 1;

export default connectDB;
