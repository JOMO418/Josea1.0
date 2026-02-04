const Redis = require('ioredis');

let redis = null;
let isConnected = false;

// Only attempt Redis connection if REDIS_URL is set or in production
const shouldUseRedis = process.env.REDIS_URL || process.env.NODE_ENV === 'production';

if (shouldUseRedis) {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️ Redis connection failed after 3 retries, falling back to in-memory');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true, // Don't connect immediately
    });

    redis.on('connect', () => {
      isConnected = true;
      console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
      if (isConnected) {
        console.error('❌ Redis error:', err.message);
      }
      isConnected = false;
    });

    redis.on('close', () => {
      isConnected = false;
    });

    // Attempt connection
    redis.connect().catch(() => {
      console.warn('⚠️ Redis not available, using in-memory fallback');
      redis = null;
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization failed:', err.message);
    redis = null;
  }
} else {
  console.log('ℹ️ Redis disabled (set REDIS_URL to enable)');
}

// Helper to check if Redis is available
const isRedisAvailable = () => redis !== null && isConnected;

// Export as object to avoid null assignment issue
module.exports = {
  redis,
  isRedisAvailable,
  getClient: () => redis
};
