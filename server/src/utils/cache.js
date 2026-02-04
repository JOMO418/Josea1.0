const { redis, isRedisAvailable } = require('./redis');

// In-memory cache fallback
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// Clean expired items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheTTL.entries()) {
    if (now > expiry) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
}, 60000); // Clean every minute

class CacheManager {
  async get(key) {
    try {
      // Try Redis first
      if (isRedisAvailable()) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      }

      // Fallback to memory cache
      const expiry = memoryCacheTTL.get(key);
      if (expiry && Date.now() > expiry) {
        memoryCache.delete(key);
        memoryCacheTTL.delete(key);
        return null;
      }
      return memoryCache.get(key) || null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  async set(key, value, ttl = 60) {
    try {
      // Try Redis first
      if (isRedisAvailable()) {
        await redis.setex(key, ttl, JSON.stringify(value));
        return;
      }

      // Fallback to memory cache
      memoryCache.set(key, value);
      memoryCacheTTL.set(key, Date.now() + (ttl * 1000));
    } catch (error) {
      console.error('Cache set error:', error.message);
    }
  }

  async del(key) {
    try {
      // Try Redis first
      if (isRedisAvailable()) {
        await redis.del(key);
        return;
      }

      // Fallback to memory cache
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error.message);
    }
  }

  async delPattern(pattern) {
    try {
      // Try Redis first
      if (isRedisAvailable()) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        return;
      }

      // Fallback to memory cache - convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);

      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
          memoryCacheTTL.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error.message);
    }
  }
}

module.exports = new CacheManager();
