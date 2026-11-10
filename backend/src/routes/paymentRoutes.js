const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');
const validate = require('../middlewares/validateMiddleware');
const { paymentWebhookSchema } = require('../validators/schemas');

// POST /api/v1/payments/webhook
router.post('/webhook', validate(paymentWebhookSchema), PaymentController.handleWebhook);

module.exports = router;
