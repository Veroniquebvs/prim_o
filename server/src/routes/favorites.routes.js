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
