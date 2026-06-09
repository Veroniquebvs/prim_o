const { Router } = require('express');
const { param, query, body } = require('express-validator');
const usersController = require('../controllers/users.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

router.get(
  '/',
  verifyToken,
  roleGuard('employer', 'admin'),
  [
    query('role')
      .optional()
      .isIn(['employer', 'employee', 'admin'])
      .withMessage('role must be employer, employee or admin'),
    query('companyId').optional().isUUID().withMessage('companyId must be a valid UUID'),
    validate,
  ],
  usersController.list
);

// Route to get pending employees (for the dashboard)
router.get(
  '/pending',
  verifyToken,
  roleGuard('employer', 'admin'),
  usersController.getPendingUsers
);

router.get(
  '/:id',
  verifyToken,
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  usersController.getById
);

router.put(
  '/:id',
  verifyToken,
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('name').optional().trim().notEmpty().withMessage('name must not be empty'),
    body('first_name').optional().trim().notEmpty().withMessage('first_name must not be empty'),
    validate,
  ],
  usersController.update
);

router.delete(
  '/:id',
  verifyToken,
  roleGuard('admin'),
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  usersController.remove
);

router.get(
  '/:id/history',
  verifyToken,
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  usersController.history
);

// Route to activate an employee (the validation button)
router.patch(
  '/:id/activate',
  verifyToken,
  roleGuard('employer', 'admin'),
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  usersController.activateUser
);

module.exports = router;
