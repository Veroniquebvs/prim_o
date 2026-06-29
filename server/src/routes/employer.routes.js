/**
 * employer.routes.js — Route definitions for employer-only management features.
 * All routes require a valid JWT with role 'employer' (applied via router-level middleware).
 *
 * GET    /managers/:id/team      — view a manager's profile and active team
 * PATCH  /employees/:id/role     — promote an employee to manager or demote a manager to employee
 * GET    /allocations            — list all employer_to_manager scheduled allocation rules
 * POST   /allocations            — create a new scheduled allocation to a manager
 * PATCH  /allocations/:id        — update an existing allocation rule (amount, active, day_of_month)
 */
const { Router } = require('express');
const { body, param, query } = require('express-validator');
const employerController = require('../controllers/employer.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(verifyToken, roleGuard('employer'));

router.get(
  '/managers/:id/team',
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  employerController.getManagerTeam
);

router.get('/teams', employerController.listTeams);

router.patch(
  '/employees/:id/role',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('role').isIn(['manager', 'employee']).withMessage('role must be manager or employee'),
    body('teamName').if(body('role').equals('manager')).notEmpty().withMessage('teamName is required when promoting to manager'),
    validate,
  ],
  employerController.changeRole
);

router.get('/allocations', employerController.listAllocations);

router.post(
  '/allocations',
  [
    body('receiver_id').isUUID().withMessage('receiver_id must be a valid UUID'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('day_of_month')
      .optional()
      .isInt({ min: 1, max: 28 })
      .withMessage('day_of_month must be between 1 and 28'),
    body('frequency')
      .optional()
      .isIn(['monthly', 'annual'])
      .withMessage('frequency must be monthly or annual'),
    body('month')
      .if(body('frequency').equals('annual'))
      .isInt({ min: 1, max: 12 })
      .withMessage('month must be between 1 and 12'),
    body('immediate').optional().isBoolean(),
    validate,
  ],
  employerController.createAllocation
);

router.patch(
  '/allocations/:id',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('amount').optional().isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    body('active').optional().isBoolean().withMessage('active must be a boolean'),
    validate,
  ],
  employerController.updateAllocation
);

router.patch(
  '/teams/:teamId/retribution-rate',
  [
    param('teamId').isUUID().withMessage('teamId must be a valid UUID'),
    body('rate').isFloat({ min: 0, max: 100 }).withMessage('rate must be a number between 0 and 100'),
    validate,
  ],
  employerController.updateRetributionRate
);

module.exports = router;
