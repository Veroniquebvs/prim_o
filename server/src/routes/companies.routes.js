/**
 * companies.routes.js — Route definitions for company management.
 *
 * POST   /            — public; create a company (employer self-onboarding step 1)
 * GET    /:id/public  — public; minimal company info for QR-code registration
 * GET    /            — admin only; list all companies
 * GET    /:id         — any authenticated user; fetch one company
 * PUT    /:id         — employer (own company) or admin; update company fields
 * POST   /:id/tokens  — admin only; grant tokens to a company without Stripe
 * DELETE /:id         — admin only; delete company and all its data
 */
const { Router } = require('express');
const { body, param } = require('express-validator');
const companiesController = require('../controllers/companies.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const router = Router();

const companyBodyRules = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('valid email is required'),
  body('street').trim().notEmpty().withMessage('street must not be empty'),
  body('zip_code')
    .isNumeric()
    .isLength({ min: 5, max: 5 })
    .withMessage('zip_code must be 5 digits'),
  body('city').trim().notEmpty().withMessage('city must not be empty'),
  body('siret')
    .isNumeric()
    .isLength({ min: 14, max: 14 })
    .withMessage('siret must be 14 digits'),
];

// Public — employer self-onboarding: create company first, then POST /auth/register with returned id
router.post('/', companyBodyRules, validate, companiesController.create);

// Admin only — create a company and its employer atomically
router.post(
  '/admin',
  verifyToken,
  roleGuard('admin'),
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('street').trim().notEmpty().withMessage('street must not be empty'),
    body('zip_code')
      .isNumeric()
      .isLength({ min: 5, max: 5 })
      .withMessage('zip_code must be 5 digits'),
    body('city').trim().notEmpty().withMessage('city must not be empty'),
    body('siret')
      .isNumeric()
      .isLength({ min: 14, max: 14 })
      .withMessage('siret must be 14 digits'),
    body('employer_name').trim().notEmpty().withMessage('employer_name is required'),
    body('employer_first_name').trim().notEmpty().withMessage('employer_first_name is required'),
    body('employer_email').isEmail().withMessage('valid employer_email is required'),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
    validate,
  ],
  companiesController.adminCreate
);

// Public — minimal company info (name) for the QR-code registration flow
router.get(
  '/:id/public',
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  companiesController.getPublicById
);

// Admin only — list all companies
router.get('/', verifyToken, roleGuard('admin'), companiesController.list);

// Authenticated — get one company
router.get(
  '/:id',
  verifyToken,
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  companiesController.getById
);

// Employer (own company) or admin — update
router.put(
  '/:id',
  verifyToken,
  roleGuard('employer', 'admin'),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('name').optional().trim().notEmpty().withMessage('name must not be empty'),
    body('email').optional().isEmail().withMessage('valid email is required'),
    body('street').optional().trim().notEmpty().withMessage('street must not be empty'),
    body('zip_code')
      .optional()
      .isNumeric()
      .isLength({ min: 5, max: 5 })
      .withMessage('zip_code must be 5 digits'),
    body('city').optional().trim().notEmpty().withMessage('city must not be empty'),
    body('siret')
      .optional()
      .isNumeric()
      .isLength({ min: 14, max: 14 })
      .withMessage('siret must be 14 digits'),
    body('feedback_enabled')
      .optional()
      .isBoolean()
      .withMessage('feedback_enabled must be a boolean'),
    validate,
  ],
  companiesController.update
);

// Admin only — grant tokens to a company
router.post(
  '/:id/tokens',
  verifyToken,
  roleGuard('admin'),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer'),
    validate,
  ],
  companiesController.grantTokens
);

// Admin only — delete a company and cascade its users/transactions
router.delete(
  '/:id',
  verifyToken,
  roleGuard('admin'),
  [param('id').isUUID().withMessage('id must be a valid UUID'), validate],
  companiesController.remove
);

module.exports = router;
