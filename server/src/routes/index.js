const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const tokensRoutes = require('./tokens.routes');
const marketplaceRoutes = require('./marketplace.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/tokens', tokensRoutes);
router.use('/marketplace', marketplaceRoutes);

module.exports = router;
