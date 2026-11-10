const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const config = require('../config/environment');

class AuthService {
  static async login({ role, fullName, phoneNumber, email, password }) {
    if (role === 'Customer') {
      // Khách hàng đăng nhập nhanh bằng Họ tên, SĐT, Email (Q-10)
      const user = await UserModel.upsertCustomer({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase()
      });

      const token = this.generateToken(user);
      return { token, user };
    }

    // Tài xế hoặc Chủ xe/Admin
    const user = await UserModel.findByPhoneAndRole(phoneNumber.trim(), role);
    if (!user) {
      const error = new Error('Tài khoản không tồn tại hoặc không đúng vai trò.');
      error.statusCode = 401;
      throw error;
    }

    // Nếu tài xế có mật khẩu, so sánh
    if (user.PasswordHash && password) {
      // Đối với tài khoản test ban đầu nếu là placeholder thì chấp nhận hoặc bcrypt compare
      const isMatch = await bcrypt.compare(password, user.PasswordHash).catch(() => false);
      if (!isMatch && password !== '123456') { // Hỗ trợ mật khẩu mặc định dev 123456
        const error = new Error('Mật khẩu không chính xác.');
        error.statusCode = 401;
        throw error;
      }
    }

    const token = this.generateToken(user);
    delete user.PasswordHash;
    return { token, user };
  }

  static generateToken(user) {
    return jwt.sign(
      {
        userId: user.UserID,
        role: user.Role,
        phoneNumber: user.PhoneNumber,
        email: user.Email
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }
}

module.exports = AuthService;

