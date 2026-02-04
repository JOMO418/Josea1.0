const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, authorize('ADMIN'), adminController.getAdminStats);
router.get('/mission-control', authenticate, authorize('ADMIN'), adminController.getCommandCenterStats);
router.get('/branches', authenticate, adminController.getBranches);

// Staff Control - User Management Routes
router.get('/users', authenticate, authorize('ADMIN'), adminController.getUsers);
router.post('/users', authenticate, authorize('ADMIN'), adminController.createUser);
router.get('/users/:id', authenticate, authorize('ADMIN'), adminController.getUserDetails);
router.put('/users/:id', authenticate, authorize('ADMIN'), adminController.updateUser);
router.patch('/users/:id/status', authenticate, authorize('ADMIN'), adminController.toggleUserStatus);
router.post('/users/:id/reset-password', authenticate, authorize('ADMIN'), adminController.resetUserPassword);
router.put('/users/:id/password', authenticate, authorize('ADMIN'), adminController.updateUserPassword);

module.exports = router;
