const TripService = require('../services/TripService');

class TripController {
  static async search(req, res, next) {
    try {
      const trips = await TripService.searchTrips(req.query);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: `Tìm thấy ${trips.length} chuyến xe phù hợp.`,
        data: trips
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TripController;

