const DriverService = require('../services/DriverService');

class DriverController {
  static async getTodayTrip(req, res, next) {
    try {
      const user = req.user;
      const tripId = req.query.tripId ? parseInt(req.query.tripId) : null;
      const result = await DriverService.getTodayTrip(user, tripId);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Lấy danh sách hành khách chuyến xe thành công.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const user = req.user;
      const { ticketCode } = req.params;
      const { status, reason } = req.body;

      const result = await DriverService.updatePassengerStatus(user, ticketCode, status, reason);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: `Đã cập nhật vé sang trạng thái: ${status}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DriverController;

