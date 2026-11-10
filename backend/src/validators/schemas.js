const Joi = require('joi');

const loginSchema = Joi.object({
  role: Joi.string().valid('Customer', 'Driver', 'Admin').required().messages({
    'any.only': 'Vai trò (role) phải là Customer, Driver hoặc Admin.',
    'any.required': 'Vui lòng chọn vai trò đăng nhập.'
  }),
  fullName: Joi.when('role', {
    is: 'Customer',
    then: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Khách hàng bắt buộc nhập họ và tên.',
      'string.min': 'Họ và tên tối thiểu 2 ký tự.'
    }),
    otherwise: Joi.string().allow(null, '').optional()
  }),
  phoneNumber: Joi.string().trim().pattern(/(84|0[3|5|7|8|9])+([0-9]{8})\b/).required().messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam (10 chữ số).',
    'any.required': 'Vui lòng nhập số điện thoại.'
  }),
  email: Joi.when('role', {
    is: 'Customer',
    then: Joi.string().trim().email().required().messages({
      'string.email': 'Email không hợp lệ.',
      'any.required': 'Khách hàng bắt buộc nhập email nhận vé.'
    }),
    otherwise: Joi.string().allow(null, '').optional()
  }),
  password: Joi.when('role', {
    is: Joi.valid('Driver', 'Admin'),
    then: Joi.string().min(6).required().messages({
      'string.min': 'Mật khẩu phải có tối thiểu 6 ký tự.',
      'any.required': 'Vui lòng nhập mật khẩu.'
    }),
    otherwise: Joi.string().allow(null, '').optional()
  })
});

const searchTripSchema = Joi.object({
  origin: Joi.string().trim().allow('').optional(),
  destination: Joi.string().trim().allow('').optional(),
  departureDate: Joi.string().isoDate().allow('').optional(),
  seatQuantity: Joi.number().integer().min(1).max(10).default(1).messages({
    'number.min': 'Số lượng ghế tìm kiếm tối thiểu là 1.',
    'number.max': 'Số lượng ghế tìm kiếm tối đa là 10.'
  })
});

const createBookingSchema = Joi.object({
  tripId: Joi.number().integer().positive().required().messages({
    'any.required': 'Vui lòng chọn chuyến xe cần đặt.'
  }),
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Họ và tên hành khách là bắt buộc.'
  }),
  phoneNumber: Joi.string().trim().pattern(/(84|0[3|5|7|8|9])+([0-9]{8})\b/).required().messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng (10 chữ số).'
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Địa chỉ email không đúng định dạng.'
  }),
  seatQuantity: Joi.number().integer().min(1).max(10).required().messages({
    'number.min': 'Số lượng ghế tối thiểu là 1.',
    'number.max': 'Chỉ được đặt tối đa 10 ghế trong một đơn.',
    'any.required': 'Vui lòng chọn số lượng ghế cần đặt.'
  })
});

const driverUpdateTicketSchema = Joi.object({
  status: Joi.string().valid('Confirmed', 'Cancelled').required().messages({
    'any.only': 'Trạng thái cập nhật phải là Confirmed hoặc Cancelled.'
  }),
  reason: Joi.string().trim().max(200).allow(null, '').optional()
});

const paymentWebhookSchema = Joi.object({
  bookingCode: Joi.string().trim().required().messages({
    'any.required': 'Mã đơn vé (bookingCode) là bắt buộc trong nội dung chuyển khoản.'
  }),
  amount: Joi.number().positive().optional(),
  transactionRef: Joi.string().trim().optional(),
  bankName: Joi.string().trim().optional()
});

module.exports = {
  loginSchema,
  searchTripSchema,
  createBookingSchema,
  driverUpdateTicketSchema,
  paymentWebhookSchema
};

