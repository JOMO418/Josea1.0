const express = require('express');
const router = express.Router();
const adminAIController = require('../controllers/adminAIController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkAIRateLimit, incrementAfterSuccess } = require('../middleware/aiRateLimit');

/**
 * Admin AI Routes
 * Base path: /api/admin-ai
 * Access: ADMIN and OWNER only
 */

// Apply authentication and authorization to all routes
router.use(authenticate);
router.use(authorize('ADMIN', 'OWNER'));

/**
 * POST /api/admin-ai/query
 * Main AI query endpoint with conversation history support
 * Body: { message: string, conversationId?: string }
 */
router.post(
  '/query',
  checkAIRateLimit,
  incrementAfterSuccess,
  adminAIController.query
);

/**
 * GET /api/admin-ai/conversations
 * Get last 5 conversations for current user
 */
router.get('/conversations', adminAIController.getConversations);

/**
 * GET /api/admin-ai/conversations/:id
 * Get specific conversation with all messages
 */
router.get('/conversations/:id', adminAIController.getConversation);

/**
 * POST /api/admin-ai/conversations
 * Create new conversation
 * Body: { title?: string }
 */
router.post('/conversations', adminAIController.createConversation);

/**
 * DELETE /api/admin-ai/conversations/:id
 * Delete conversation (and all its messages)
 */
router.delete('/conversations/:id', adminAIController.deleteConversation);

/**
 * GET /api/admin-ai/usage
 * Get current usage statistics (queries used today)
 */
router.get('/usage', adminAIController.getUsage);

module.exports = router;
