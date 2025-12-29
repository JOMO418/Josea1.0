const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, productController.getProducts);
router.get('/global/inventory', authenticate, authorize('OWNER', 'ADMIN'), productController.getGlobalProducts);
router.get('/:id', authenticate, productController.getProduct);
router.post('/', authenticate, authorize('OWNER', 'ADMIN'), productController.createProduct);
router.put('/:id', authenticate, authorize('OWNER', 'ADMIN'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), productController.deleteProduct);

module.exports = router;