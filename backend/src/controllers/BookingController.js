const BookingService = require('../services/BookingService');

class BookingController {
  static async create(req, res, next) {
    try {
      const result = await BookingService.createBooking(req.body);
      return res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Đặt vé và tạm giữ chỗ thành công. Vui lòng chuyển khoản trong 10 phút.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByCode(req, res, next) {
    try {
      const { bookingCode } = req.params;
      const result = await BookingService.getBookingByCode(bookingCode);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Lấy thông tin hóa đơn thành công.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BookingController;

