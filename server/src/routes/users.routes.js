/**
 * users.routes.js — Route definitions for user management.
 *
 * GET    /              — employer or admin; list users with optional role/companyId filter
 * GET    /pending       — employer or admin; list employees awaiting activation
 * GET    /:id           — any authenticated user; fetch one user (scoped to company)
 * PUT    /:id           — any authenticated user; update name/first_name
 * DELETE /:id           — admin only; permanently delete a user
 * GET    /:id/history   — any authenticated user; token transaction history
 * PATCH  /:id/activate  — employer or admin; activate a pending employee
 * PATCH  /:id/entry-date — employer or admin; update an employee's entry date
 */
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
      .isIn(['employer', 'employee', 'admin', 'manager'])
      .withMessage('role must be employer, employee, admin or manager'),
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
  (req, res, next) => {
    const isSelf = req.params.id === req.user.id;
    const isAdminOrEmployer = ['admin', 'employer'].includes(req.user.role);
    if (!isSelf && !isAdminOrEmployer) {
      return res.status(403).json({ error: 'Forbidden', code: 403 });
    }
    next();
  },
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
  (req, res, next) => {
    const isSelf = req.params.id === req.user.id;
    const canSeeOthers = ['employer', 'manager', 'admin'].includes(req.user.role);
    if (!isSelf && !canSeeOthers) return res.status(403).json({ error: 'Forbidden', code: 403 });
    next();
  },
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  usersController.history
);

// Route to activate an employee (the validation button)
router.patch(
  '/:id/activate',
  verifyToken,
  roleGuard('employer', 'admin'),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),

    body('entry_date').optional().isISO8601().withMessage('entry_date must be a valid date'),

    validate,
  ],
  usersController.activateUser
);

router.patch(
  '/:id/password',
  verifyToken,
  (req, res, next) => {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 403 });
    }
    next();
  },
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('current_password').notEmpty().withMessage('current_password is required'),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
    validate,
  ],
  usersController.changePassword
);

router.patch(
  '/:id/avatar',
  verifyToken,
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('avatar_index').isInt({ min: 1, max: 6 }).withMessage('avatar_index must be between 1 and 6'),
    validate,
  ],
  usersController.updateAvatar
);

router.patch(
  '/:id/entry-date',
  verifyToken,
  roleGuard('employer', 'admin', 'manager'),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('entry_date').optional().isISO8601().withMessage('entry_date must be a valid date'),
    validate,
  ],
  usersController.updateEntryDate
);

router.get('/me/team', verifyToken, usersController.getMyTeam);

module.exports = router;
