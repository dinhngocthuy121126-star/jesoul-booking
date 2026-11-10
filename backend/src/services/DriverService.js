const { getPool, sql } = require('../config/database');
const TripModel = require('../models/TripModel');
const TicketModel = require('../models/TicketModel');

class DriverService {
  static async getTodayTrip(userParam, requestedTripId = null) {
    const isAdmin = typeof userParam === 'object' ? userParam.role === 'Admin' : false;
    const driverId = typeof userParam === 'object' ? userParam.userId : userParam;

    // 1. Lấy toàn bộ danh sách chuyến xe được phân công (hoặc toàn bộ chuyến nếu là Chủ xe/Admin)
    const tripsList = await TripModel.findTripsList(driverId, isAdmin);

    let trip = null;
    const tripId = requestedTripId ? parseInt(requestedTripId, 10) : null;

    if (tripId) {
      trip = tripsList.find(t => t.TripID === tripId) || 
             (isAdmin ? await TripModel.findTripById(tripId) : await TripModel.findTripByIdAndDriver(tripId, driverId));
    }

    // Nếu không chỉ định tripId cụ thể:
    // Tự động chọn chuyến có khách đặt vé gần đây nhất hoặc chuyến đầu tiên
    if (!trip) {
      const tripWithPassengers = tripsList.find(t => t.PassengerCount > 0);
      trip = tripWithPassengers || tripsList[0] || null;
    }

    if (!trip) {
      return {
        trip: null,
        tripsList: [],
        passengers: []
      };
    }

    // 2. Lấy danh sách hành khách theo chuyến đang chọn
    const passengers = await TicketModel.findPassengersByTrip(trip.TripID);

    return {
      trip,
      tripsList,
      passengers
    };
  }

  static async updatePassengerStatus(userParam, ticketCode, status, reason = null) {
    const isAdmin = typeof userParam === 'object' ? userParam.role === 'Admin' : false;
    const driverId = typeof userParam === 'object' ? userParam.userId : userParam;
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const ticket = await TicketModel.findByCode(ticketCode, transaction);
      if (!ticket) {
        const error = new Error('Vé xe không tồn tại.');
        error.statusCode = 404;
        throw error;
      }

      // Kiểm tra xem vé có thuộc chuyến xe của tài xế này hay không (Admin có toàn quyền)
      if (!isAdmin) {
        let trip = await TripModel.findTripByIdAndDriver(ticket.TripID, driverId, transaction);
        if (!trip) {
          trip = await TripModel.findTripByDriver(driverId, transaction);
          if (!trip || trip.TripID !== ticket.TripID) {
            const error = new Error('Tài xế không có quyền quản lý vé của chuyến xe khác.');
            error.statusCode = 403;
            throw error;
          }
        }
      }

      const defaultReason = reason || (status === 'Cancelled' ? 'Tài xế hủy do khách báo không đi hoặc không nghe máy' : null);

      if (status === 'Confirmed') {
        // Cập nhật trạng thái thành 'Confirmed' (Đã xác nhận)
        await TicketModel.updateStatus(ticketCode, 'Confirmed', null, transaction);
      } else {
        // Cập nhật trạng thái thành 'Cancelled' (Đã hủy) & hoàn lại 1 ghế trống
        await TicketModel.updateStatus(ticketCode, 'Cancelled', defaultReason, transaction);
        await TripModel.adjustAvailableSeats(ticket.TripID, 1, transaction);
      }

      await transaction.commit();

      return {
        ticketCode,
        status,
        reason: defaultReason
      };

    } catch (error) {
      if (transaction && transaction._acquiredConfig) {
        try { await transaction.rollback(); } catch (_) { }
      }
      throw error;
    }
  }
}

module.exports = DriverService;
