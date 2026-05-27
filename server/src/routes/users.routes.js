const { Router } = require('express');
const usersController = require('../controllers/users.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');

const router = Router();

router.get('/', verifyToken, roleGuard('employer', 'admin'), usersController.list);
router.get('/:id', verifyToken, usersController.getById);
router.put('/:id', verifyToken, usersController.update);
router.delete('/:id', verifyToken, roleGuard('admin'), usersController.remove);
router.get('/:id/history', verifyToken, usersController.history);

module.exports = router;
