const express = require('express');
const router = express.Router();
const { setWebhook, handleWebhook } = require('../controllers/telegramWordController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

router.get('/set-webhook', auth, requireAdmin, setWebhook);
router.post('/set-webhook', auth, requireAdmin, setWebhook);
router.post('/webhook', handleWebhook);

module.exports = router;
