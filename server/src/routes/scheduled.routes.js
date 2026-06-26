/**
 * scheduled.routes.js — Route definitions for employer-level scheduled allocation management.
 * All routes require a valid JWT with role 'employer'.
 *
 * GET    /          — list all allocation rules for the employer's company
 * POST   /          — create a new rule (targeting a specific user or all active employees)
 * PUT    /:id       — replace an existing rule's schedule and target
 * PATCH  /:id/toggle — pause or resume a rule
 * DELETE /:id       — permanently delete a rule
 */
const { Router } = require('express');
const { body, param } = require('express-validator');
const scheduledController = require('../controllers/scheduled.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(verifyToken, roleGuard('employer'));

router.get('/', scheduledController.list);

router.post(
  '/',
  [
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('frequency').isIn(['monthly', 'annual']).withMessage('frequency must be monthly or annual'),
    body('day_of_month').isInt({ min: 1, max: 28 }).withMessage('day_of_month must be between 1 and 28'),
    body('month').if(body('frequency').equals('annual')).isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
    body('receiver_id').optional({ nullable: true }).isUUID().withMessage('receiver_id must be a valid UUID'),
    body('label').optional().isString().trim(),
    validate,
  ],
  scheduledController.create
);

router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('frequency').isIn(['monthly', 'annual']).withMessage('frequency must be monthly or annual'),
    body('day_of_month').isInt({ min: 1, max: 28 }).withMessage('day_of_month must be between 1 and 28'),
    body('month').if(body('frequency').equals('annual')).isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
    body('receiver_id').optional({ nullable: true }).isUUID().withMessage('receiver_id must be a valid UUID'),
    body('label').optional().isString().trim(),
    body('excluded_user_ids').optional().isArray().withMessage('excluded_user_ids must be an array'),
    validate,
  ],
  scheduledController.update
);

router.patch(
  '/:id/toggle',
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  scheduledController.toggle
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  scheduledController.remove
);

module.exports = router;
