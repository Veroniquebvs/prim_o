const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const tokensRoutes = require('./tokens.routes');
const marketplaceRoutes = require('./marketplace.routes');
const companiesRoutes = require('./companies.routes');
const uploadRoutes = require('./upload.routes');
const favoritesRoutes = require('./favorites.routes');
const scheduledRoutes = require('./scheduled.routes');
const managerRoutes = require('./manager.routes');
const employerRoutes = require('./employer.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/tokens', tokensRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/companies', companiesRoutes);
router.use('/upload', uploadRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/scheduled-allocations', scheduledRoutes);
router.use('/manager', managerRoutes);
router.use('/employer', employerRoutes);

module.exports = router;
