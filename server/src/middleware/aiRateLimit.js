const prisma = require('../utils/prisma');

/**
 * AI Rate Limiting Middleware
 * Enforces daily query limits:
 * - MANAGER: 25 queries/day
 * - ADMIN/OWNER: 40 queries/day
 * Resets at midnight (Kenya timezone)
 */

/**
 * Check and enforce AI rate limits
 */
exports.checkAIRateLimit = async (req, res, next) => {
  try {
    // 🚧 TESTING MODE: Rate limits DISABLED
    console.log('⚠️ AI Rate limits DISABLED for testing');

    req.aiUsageTracking = {
      userId: req.user.id,
      date: new Date(),
      currentCount: 0,
      limit: 999999,
    };

    return next();

    /* ==========================================
       ORIGINAL CODE - UNCOMMENT TO RE-ENABLE
       ==========================================

    const userId = req.user.id;
    const userRole = req.user.role;

    // Get rate limit based on role
    const limit = getRateLimitForRole(userRole);

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create usage tracking record for today
    let usage = await prisma.AIUsageTracking.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!usage) {
      // Create new tracking record
      usage = await prisma.AIUsageTracking.create({
        data: {
          userId,
          date: today,
          queryCount: 0,
        },
      });
    }

    // Check if limit exceeded
    if (usage.queryCount >= limit) {
      const resetTime = new Date(today);
      resetTime.setDate(resetTime.getDate() + 1); // Tomorrow at midnight

      return res.status(429).json({
        error: 'Daily AI query limit reached',
        message: `You have reached your daily limit of ${limit} queries. Please try again tomorrow.`,
        limit,
        used: usage.queryCount,
        remaining: 0,
        resetAt: resetTime.toISOString(),
      });
    }

    // Increment query count (will be committed after successful response)
    // We do this in the route handler after successful query
    req.aiUsageTracking = {
      userId,
      date: today,
      currentCount: usage.queryCount,
      limit,
    };

    next();
    ========================================== */
  } catch (error) {
    console.error('❌ Rate limit check error:', error);
    // Don't block on rate limit errors - allow the request
    next();
  }
};

/**
 * Increment usage count after successful query
 * Call this in the controller after AI response is generated
 */
exports.incrementUsageCount = async (userId, date = new Date()) => {
  try {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    await prisma.AIUsageTracking.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        queryCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        date: today,
        queryCount: 1,
      },
    });

    return true;
  } catch (error) {
    console.error('❌ Error incrementing usage count:', error);
    return false;
  }
};

/**
 * Get remaining queries for a user today
 */
exports.getRemainingQueries = async (userId, userRole) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.AIUsageTracking.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    const limit = getRateLimitForRole(userRole);
    const used = usage?.queryCount || 0;
    const remaining = Math.max(0, limit - used);

    const resetTime = new Date(today);
    resetTime.setDate(resetTime.getDate() + 1);

    return {
      limit,
      used,
      remaining,
      resetAt: resetTime.toISOString(),
    };
  } catch (error) {
    console.error('❌ Error getting remaining queries:', error);
    return {
      limit: 0,
      used: 0,
      remaining: 0,
      resetAt: new Date().toISOString(),
    };
  }
};

/**
 * Middleware to increment count after successful query
 * Add this AFTER the main handler responds
 */
exports.incrementAfterSuccess = async (req, res, next) => {
  // Store the original res.json
  const originalJson = res.json.bind(res);

  // Override res.json to increment count after sending response
  res.json = function (data) {
    // Send response first
    originalJson(data);

    // Then increment count asynchronously
    if (req.aiUsageTracking && req.user) {
      exports.incrementUsageCount(
        req.aiUsageTracking.userId,
        req.aiUsageTracking.date
      ).catch(err => {
        console.error('❌ Failed to increment usage count:', err);
      });
    }
  };

  next();
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get rate limit based on user role
 */
function getRateLimitForRole(role) {
  if (role === 'MANAGER') {
    return parseInt(process.env.AI_RATE_LIMIT_MANAGER) || 25;
  }
  // ADMIN and OWNER
  return parseInt(process.env.AI_RATE_LIMIT_ADMIN) || 40;
}

/**
 * Check if usage should be reset (for cron jobs or manual resets)
 */
exports.shouldResetUsage = (lastResetDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const lastReset = new Date(lastResetDate);
  lastReset.setHours(0, 0, 0, 0);

  return now.getTime() > lastReset.getTime();
};
