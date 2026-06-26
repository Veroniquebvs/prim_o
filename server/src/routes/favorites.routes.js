/**
 * favorites.routes.js — Route definitions for the voucher favourites feature.
 *
 * GET    /         — returns the authenticated user's list of favourited voucher IDs
 * POST   /toggle   — adds or removes a voucher from the user's favourites (idempotent toggle)
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { toggle, getUserFavorites } = require('../controllers/favorites.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { validate } = require('../middleware/validate');

const router = Router();

router.get('/', verifyToken, getUserFavorites);

router.post(
  '/toggle',
  verifyToken,
  [body('voucher_id').isUUID().withMessage('voucher_id must be a valid UUID'), validate],
  toggle
);

module.exports = router;
