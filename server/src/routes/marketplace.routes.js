/**
 * marketplace.routes.js — Route definitions for the voucher marketplace.
 *
 * GET  /items              — any authenticated user; browse available vouchers
 * GET  /items/:id          — employee, employer, or admin; single voucher (admin sees promo_code)
 * POST /items              — admin only; create a voucher
 * PUT  /items/:id          — admin only; update a voucher
 * DELETE /items/:id        — admin only; delete a voucher
 * POST /redeem             — employee only; exchange tokens for a promo code
 * GET  /orders             — employee or manager; own redemption history
 * GET  /admin/vouchers     — admin only; full catalogue including unavailable vouchers
 * GET  /admin/history      — admin only; all redemptions across all users
 */
const { Router } = require('express');
const { body, param } = require('express-validator');
const marketplaceController = require('../controllers/marketplace.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

router.get('/items', verifyToken, marketplaceController.listItems);

router.get(
  '/items/:id',
  verifyToken,
  roleGuard('employee', 'admin', 'employer', 'manager'),
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
    body('promo_code').trim().notEmpty().withMessage('promo_code is required'),
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
    body('promo_code').optional().trim().notEmpty().withMessage('promo_code must not be empty'),
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
  roleGuard('employee', 'manager', 'employer'),
  [body('voucher_id').isUUID().withMessage('voucher_id must be a valid UUID'), validate],
  marketplaceController.redeem
);

router.get('/orders', verifyToken, roleGuard('employee', 'manager'), marketplaceController.listOrders);

/* ── Admin-only endpoints ── */
router.get('/admin/vouchers', verifyToken, roleGuard('admin'), marketplaceController.adminListVouchers);
router.get('/admin/history',  verifyToken, roleGuard('admin'), marketplaceController.adminHistory);

module.exports = router;
