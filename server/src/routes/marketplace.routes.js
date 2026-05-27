const { Router } = require('express');
const marketplaceController = require('../controllers/marketplace.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');

const router = Router();

router.get('/items', verifyToken, roleGuard('employee'), marketplaceController.listItems);
router.get('/items/:id', verifyToken, roleGuard('employee'), marketplaceController.getItem);
router.post('/items', verifyToken, roleGuard('admin'), marketplaceController.createItem);
router.put('/items/:id', verifyToken, roleGuard('admin'), marketplaceController.updateItem);
router.delete('/items/:id', verifyToken, roleGuard('admin'), marketplaceController.deleteItem);
router.post('/redeem', verifyToken, roleGuard('employee'), marketplaceController.redeem);
router.get('/orders', verifyToken, roleGuard('employee'), marketplaceController.listOrders);

module.exports = router;
