const TripModel = require('../models/TripModel');

class TripService {
  static async searchTrips({ origin, destination, seatQuantity = 1, departureDate = null }) {
    const qty = parseInt(seatQuantity, 10) || 1;
    const trips = await TripModel.searchAvailableTrips({
      origin: origin ? origin.trim() : null,
      destination: destination ? destination.trim() : null,
      seatQuantity: qty,
      departureDate: departureDate || null
    });

    return trips;
  }
}

module.exports = TripService;

