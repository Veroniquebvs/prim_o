/**
 * manager.routes.js — Route definitions for manager-only features.
 * All routes require a valid JWT with role 'manager' and an active team
 * (enforced by the requireManager middleware applied at the router level).
 *
 * GET    /team                    — view active team and members
 * POST   /employees               — create a new employee account and add them to the team
 * POST   /team/members            — add an existing unassigned employee to the team
 * POST   /tokens/give             — transfer tokens to an employee (requireTeamScope guards the target)
 * GET    /tokens/balance          — read manager's own token balance
 * GET    /available-collaborators — list company employees not yet assigned to any team
 * GET    /scheduled               — list manager's recurring allocation rules
 * POST   /scheduled               — create a new recurring rule
 * PATCH  /scheduled/:id/toggle    — pause or resume a rule
 * DELETE /scheduled/:id           — delete a rule
 */
const { Router } = require('express');
const { body, param } = require('express-validator');
const managerController = require('../controllers/manager.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { requireManager } = require('../middleware/roleGuard');
const { requireTeamScope } = require('../middleware/teamScope');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(verifyToken, requireManager);

router.get('/team', managerController.getTeam);

router.post(
  '/employees',
  [
    body('email').isEmail().withMessage('email must be a valid email address'),
    body('first_name').trim().notEmpty().withMessage('first_name is required'),
    body('name').trim().notEmpty().withMessage('name is required'),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
    body('entry_date').optional({ nullable: true }).isISO8601().withMessage('entry_date must be a valid ISO 8601 date'),
    validate,
  ],
  managerController.createEmployee
);

router.post(
  '/team/members',
  [
    body('employee_id').isUUID().withMessage('employee_id must be a valid UUID'),
    validate,
  ],
  managerController.addTeamMember
);

router.post(
  '/tokens/give',
  [
    body('employee_id').isUUID().withMessage('employee_id must be a valid UUID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('amount must be a positive number'),
    body('reason').optional().isString().trim().withMessage('reason must be a string'),
    validate,
  ],
  requireTeamScope,
  managerController.giveTokens
);

router.get('/tokens/balance', managerController.getBalance);

router.get('/available-collaborators', managerController.getUnassignedCollaborators);

router.get('/scheduled', managerController.listScheduled);

router.post(
  '/scheduled',
  [
    body('receiver_id').isUUID().withMessage('receiver_id must be a valid UUID'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('day_of_month').optional().isInt({ min: 1, max: 28 }).withMessage('day_of_month must be 1-28'),
    body('frequency').optional().isIn(['monthly', 'annual']).withMessage('frequency must be monthly or annual'),
    body('month').if(body('frequency').equals('annual')).isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
    body('label').optional().isString().trim(),
    validate,
  ],
  managerController.createScheduled
);

router.patch(
  '/scheduled/:id/toggle',
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  managerController.toggleScheduled
);

router.delete(
  '/scheduled/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  managerController.deleteScheduled
);

module.exports = router;
