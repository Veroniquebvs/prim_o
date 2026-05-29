const { Router } = require('express');
const { body, param } = require('express-validator');
const marketplaceController = require('../controllers/marketplace.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

router.get('/items', verifyToken, roleGuard('employee'), marketplaceController.listItems);

router.get(
  '/items/:id',
  verifyToken,
  roleGuard('employee'),
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  marketplaceController.getItem
);

router.post(
  '/items',
  verifyToken,
  roleGuard('admin'),
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('partner').trim().notEmpty().withMessage('partner is required'),
    body('token_cost').isInt({ min: 0 }).withMessage('token_cost must be a non-negative integer'),
    body('available').optional().isBoolean().withMessage('available must be a boolean'),
    validate,
  ],
  marketplaceController.createItem
);

router.put(
  '/items/:id',
  verifyToken,
  roleGuard('admin'),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('title').optional().trim().notEmpty().withMessage('title must not be empty'),
    body('partner').optional().trim().notEmpty().withMessage('partner must not be empty'),
    body('token_cost').optional().isInt({ min: 0 }).withMessage('token_cost must be a non-negative integer'),
    body('available').optional().isBoolean().withMessage('available must be a boolean'),
    validate,
  ],
  marketplaceController.updateItem
);

router.delete(
  '/items/:id',
  verifyToken,
  roleGuard('admin'),
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  marketplaceController.deleteItem
);

router.post(
  '/redeem',
  verifyToken,
  roleGuard('employee'),
  [body('voucherId').isUUID().withMessage('voucherId must be a valid UUID'), validate],
  marketplaceController.redeem
);

router.get('/orders', verifyToken, roleGuard('employee'), marketplaceController.listOrders);

module.exports = router;
