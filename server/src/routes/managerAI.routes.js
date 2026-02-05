const express = require('express');
const router = express.Router();
const managerAIController = require('../controllers/managerAIController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkAIRateLimit, incrementAfterSuccess } = require('../middleware/aiRateLimit');

/**
 * Manager AI Routes
 * Base path: /api/manager-ai
 * Access: MANAGER only
 */

// Apply authentication and authorization to all routes
router.use(authenticate);
router.use(authorize('MANAGER'));

/**
 * POST /api/manager-ai/query
 * Main AI query endpoint (no conversation history)
 * Body: { message: string }
 *
 * Automatically filtered to manager's branch
 * Maximum 14-day lookback period
 */
router.post(
  '/query',
  checkAIRateLimit,
  incrementAfterSuccess,
  managerAIController.query
);

/**
 * GET /api/manager-ai/usage
 * Get current usage statistics (queries used today)
 */
router.get('/usage', managerAIController.getUsage);

module.exports = router;
