// ============================================
// SYSTEM SETTINGS ROUTES
// Neural Core - Configuration API Endpoints
// ============================================

const express = require('express');
const router = express.Router();
const {
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  initializeDefaults,
  resetToDefaults,
  getReceiptPreview,
} = require('../controllers/settingsController');

const { authenticate, authorize } = require('../middleware/auth');

// All settings routes require authentication
router.use(authenticate);

// ===== PUBLIC READS (Any authenticated user) =====

// Get all settings grouped by category
router.get('/', getAllSettings);

// Get settings by category
router.get('/category/:category', getSettingsByCategory);

// Get single setting
router.get('/:category/:key', getSetting);

// Get receipt preview data
router.get('/preview/receipt', getReceiptPreview);

// ===== ADMIN WRITES (ADMIN or OWNER only) =====

// Update single setting
router.put('/:category/:key', authorize('ADMIN', 'OWNER'), updateSetting);

// Bulk update settings
router.put('/', authorize('ADMIN', 'OWNER'), bulkUpdateSettings);

// Initialize default settings
router.post('/initialize', authorize('ADMIN', 'OWNER'), initializeDefaults);

// Reset to defaults (OWNER only)
router.post('/reset', authorize('OWNER'), resetToDefaults);
router.post('/reset/:category', authorize('OWNER'), resetToDefaults);

module.exports = router;
