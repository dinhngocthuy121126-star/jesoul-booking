const PaymentService = require('../services/PaymentService');

class PaymentController {
  static async handleWebhook(req, res, next) {
    try {
      const result = await PaymentService.processBankWebhook(req.body);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;

