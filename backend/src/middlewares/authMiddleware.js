const jwt = require('jsonwebtoken');
const config = require('../config/environment');

function authMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Yêu cầu token xác thực (Bearer Token).'
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'Bạn không có quyền thực hiện thao tác này.'
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Token không hợp lệ hoặc đã hết hạn.'
      });
    }
  };
}

function rejectInternalRoles(message = 'Tài khoản nội bộ doanh nghiệp (Tài xế / Chủ xe) không được phép thực hiện thao tác của khách hàng.') {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        if (['Driver', 'Admin'].includes(decoded.role)) {
          return res.status(403).json({
            success: false,
            statusCode: 403,
            message
          });
        }
      } catch (err) {
        // Token không hợp lệ thì bỏ qua đối với luồng khách vãng lai
      }
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.rejectInternalRoles = rejectInternalRoles;

