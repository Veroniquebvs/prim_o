/**
 * tokens.routes.js — Route definitions for token management and Stripe subscription endpoints.
 *
 * POST /allocate       — employer only; transfers tokens from company balance to an employee
 * GET  /balance/:userId — any authenticated user; reads a user's token balance
 * GET  /transactions   — any authenticated user; filterable ledger query
 * GET  /transactions/:id — any authenticated user; single transaction lookup
 * POST /admin/deduct   — admin only; forcibly removes tokens from a company or employee
 * POST /webhook        — public (Stripe); raw body required for signature verification
 * POST /subscribe      — employer only; creates/updates a Stripe subscription
 * GET  /subscription   — employer only; retrieves current subscription status
 */
const { Router } = require('express');
const { body, param, query } = require('express-validator');
const tokensController = require('../controllers/tokens.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

router.post(
  '/allocate',
  verifyToken,
  roleGuard('employer'),
  [
    body('receiver_id').isUUID().withMessage('receiver_id must be a valid UUID'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('reason').optional().isString().trim().withMessage('reason must be a string'),
    validate,
  ],
  tokensController.allocate
);

router.get(
  '/balance/:userId',
  verifyToken,
  [param('userId').isUUID().withMessage('userId must be a valid UUID'), validate],
  tokensController.getBalance
);

router.get(
  '/transactions',
  verifyToken,
  [
    query('userId').optional().isUUID().withMessage('userId must be a valid UUID'),
    query('date').optional().isISO8601().withMessage('date must be ISO 8601 format'),
    validate,
  ],
  tokensController.listTransactions
);

router.get(
  '/transactions/:id',
  verifyToken,
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  tokensController.getTransaction
);

router.post(
  '/admin/deduct',
  verifyToken,
  roleGuard('admin'),
  [
    body('target').isIn(['company', 'employee']).withMessage('target must be "company" or "employee"'),
    body('company_id').isUUID().withMessage('company_id must be a valid UUID'),
    body('user_id').optional({ nullable: true }).isUUID().withMessage('user_id must be a valid UUID'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('reason').optional().isString().trim(),
    validate,
  ],
  tokensController.adminDeduct
);

// Raw body required — express.raw() applied in server.js before express.json()
router.post('/webhook', tokensController.stripeWebhook);

router.post(
  '/subscribe',
  verifyToken,
  roleGuard('employer'),
  [body('planId').isIn(['starter', 'growth', 'scale']).withMessage('Invalid planId'), validate],
  tokensController.subscribe
);

router.get('/subscription', verifyToken, roleGuard('employer'), tokensController.getSubscription);

module.exports = router;
