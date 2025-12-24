const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/overseer', authenticate, authorize('OWNER', 'ADMIN'), dashboardController.getOverseerDashboard);
router.get('/branch/:branchId', authenticate, dashboardController.getBranchDashboard);

module.exports = router;