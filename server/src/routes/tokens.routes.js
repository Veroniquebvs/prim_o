const { Router } = require('express');
const tokensController = require('../controllers/tokens.controller');
const { verifyToken } = require('../middleware/verifyToken');
const { roleGuard } = require('../middleware/roleGuard');

const router = Router();

router.post('/allocate', verifyToken, roleGuard('employer'), tokensController.allocate);
router.get('/balance/:userId', verifyToken, tokensController.getBalance);
router.get('/transactions', verifyToken, tokensController.listTransactions);
router.get('/transactions/:id', verifyToken, tokensController.getTransaction);
router.post('/webhook', tokensController.stripeWebhook);

module.exports = router;
