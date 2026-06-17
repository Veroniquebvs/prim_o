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
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
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
