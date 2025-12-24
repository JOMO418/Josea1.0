const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('OWNER', 'ADMIN'), auditController.getAuditLogs);
router.get('/export', authenticate, authorize('OWNER', 'ADMIN'), auditController.exportAuditLogs);

module.exports = router;