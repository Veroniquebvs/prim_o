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

// Raw body required — express.raw() applied in server.js before express.json()
router.post('/webhook', tokensController.stripeWebhook);

router.post(
  '/purchase',
  verifyToken,
  roleGuard('employer'),
  [body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'), validate],
  tokensController.createPurchaseIntent
);

module.exports = router;
