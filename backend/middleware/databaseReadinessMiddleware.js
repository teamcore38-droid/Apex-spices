import connectDB, {
  getMongoConnectionState,
  isMongoReady,
} from '../config/db.js';

const createDatabaseReadinessMiddleware = ({
  connect = connectDB,
  getState = getMongoConnectionState,
  isReady = isMongoReady,
} = {}) => async (_req, res, next) => {
  try {
    if (!isReady()) {
      await connect({ strict: true });
    }

    if (!isReady()) {
      throw new Error('MongoDB is not ready.');
    }

    next();
  } catch (error) {
    console.error('[databaseReadiness]', error.message);
    res.set('Cache-Control', 'no-store');
    res.set('Retry-After', '5');
    return res.status(503).json({
      status: 'unavailable',
      message: 'Database service is temporarily unavailable.',
      database: {
        state: getState(),
      },
    });
  }
};

const requireDatabaseConnection = createDatabaseReadinessMiddleware();

export {
  createDatabaseReadinessMiddleware,
  requireDatabaseConnection,
};
