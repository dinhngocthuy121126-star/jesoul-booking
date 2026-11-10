const AuthService = require('../services/AuthService');

class AuthController {
  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Đăng nhập thành công.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;

