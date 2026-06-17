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

router.patch(
  '/employees/:id/role',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('role').isIn(['manager', 'employee']).withMessage('role must be manager or employee'),
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

module.exports = router;
