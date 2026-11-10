const crypto = require('crypto');
const { getPool, sql } = require('../config/database');
const TripModel = require('../models/TripModel');
const UserModel = require('../models/UserModel');
const BookingModel = require('../models/BookingModel');
const TicketModel = require('../models/TicketModel');
const AuthService = require('./AuthService');

class BookingService {
  static async createBooking({ tripId, fullName, phoneNumber, email, seatQuantity }) {
    // 0. Kiểm tra xem số điện thoại có thuộc tài khoản nội bộ (Tài xế / Chủ xe) hay không trước khi mở transaction
    const existingUser = await UserModel.findByPhone(phoneNumber.trim());
    if (existingUser && ['Driver', 'Admin'].includes(existingUser.Role)) {
      const error = new Error('Số điện thoại này thuộc tài khoản nội bộ (Tài xế / Chủ xe). Không thể dùng để đặt vé khách hàng.');
      error.statusCode = 400;
      throw error;
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    const qty = parseInt(seatQuantity, 10);

    try {
      await transaction.begin();

      // 1. Khóa dòng độc quyền trong Trips (Pessimistic Locking với UPDLOCK, ROWLOCK)
      const trip = await TripModel.getTripForUpdate(tripId, transaction);
      if (!trip) {
        const error = new Error('Chuyến xe không tồn tại.');
        error.statusCode = 404;
        throw error;
      }

      // Kiểm tra quy tắc chặn đặt vé sát giờ: cách giờ xuất phát <= 30 phút (BR-01)
      const now = new Date();
      const departure = new Date(trip.DepartureTime);
      const minutesDiff = (departure - now) / (1000 * 60);

      if (minutesDiff <= 30) {
        const error = new Error('Chuyến xe đã đóng cổng đặt vé do thời gian xuất phát còn dưới 30 phút.');
        error.statusCode = 400;
        throw error;
      }

      // Kiểm tra số ghế trống khả dụng
      if (trip.AvailableSeats < qty) {
        const error = new Error(`Chỉ còn ${trip.AvailableSeats} ghế trống, không đủ ${qty} ghế yêu cầu.`);
        error.statusCode = 400;
        throw error;
      }

      // 2. Trừ ghế tạm thời trên chuyến xe
      await TripModel.adjustAvailableSeats(trip.TripID, -qty, transaction);

      // 3. Đảm bảo bản ghi Khách hàng tồn tại
      const user = await UserModel.upsertCustomer({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase()
      }, transaction);

      // 4. Sinh mã đơn vé và tạo bản ghi Bookings
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const bookingCode = `JS-${randomSuffix}`;
      const totalAmount = trip.BasePrice * qty;

      const booking = await BookingModel.createBooking({
        bookingCode,
        userId: user.UserID,
        tripId: trip.TripID,
        seatQuantity: qty,
        totalAmount
      }, transaction);

      // 5. Sinh các vé con (Tickets) ở trạng thái 'Hold' với Token bảo mật dùng cho Gmail CTA
      const tickets = [];
      for (let i = 1; i <= qty; i++) {
        const ticketCode = `${bookingCode}-${String(i).padStart(2, '0')}`;
        const confirmationToken = crypto.randomBytes(24).toString('hex');

        const ticket = await TicketModel.createTicket({
          bookingId: booking.BookingID,
          ticketCode,
          confirmationToken,
          status: 'Hold'
        }, transaction);
        tickets.push(ticket);
      }

      // Hoàn tất Transaction
      await transaction.commit();

      // 6. Tạo thông tin thanh toán chuyển khoản VietQR (BR-04)
      const bankDetails = {
        bankName: 'MB Bank',
        accountNo: '0987654321',
        accountName: 'CONG TY JESOUL BUS',
        amount: totalAmount,
        transferContent: bookingCode,
        qrCodeUrl: `https://api.vietqr.io/image/970422-0987654321-compact.jpg?amount=${totalAmount}&addInfo=${encodeURIComponent(bookingCode)}&accountName=CONG%20TY%20JESOUL%20BUS`
      };

      // Tự động cấp Token đăng nhập cho khách hàng ngay khi đặt vé thành công
      const token = AuthService.generateToken(user);

      return {
        bookingId: booking.BookingID,
        bookingCode: booking.BookingCode,
        totalAmount: booking.TotalAmount,
        seatQuantity: booking.SeatQuantity,
        holdExpiresAt: booking.HoldExpiresAt,
        remainingSeconds: 600,
        tickets,
        bankDetails,
        token,
        user: {
          UserID: user.UserID,
          Role: user.Role,
          FullName: user.FullName,
          PhoneNumber: user.PhoneNumber,
          Email: user.Email
        }
      };

    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {}
      throw error;
    }
  }

  static async getBookingByCode(bookingCode) {
    const booking = await BookingModel.findByCode(bookingCode);
    if (!booking) {
      const error = new Error('Không tìm thấy đơn đặt vé.');
      error.statusCode = 404;
      throw error;
    }

    // Tính số giây giữ chỗ còn lại nếu đang ở trạng thái Pending
    let remainingSeconds = 0;
    if (booking.Status === 'Pending') {
      const expires = new Date(booking.HoldExpiresAt);
      const now = new Date();
      remainingSeconds = Math.max(0, Math.floor((expires - now) / 1000));
    }

    const bankDetails = {
      bankName: 'MB Bank',
      accountNo: '0987654321',
      accountName: 'CONG TY JESOUL BUS',
      amount: booking.TotalAmount,
      transferContent: booking.BookingCode,
      qrCodeUrl: `https://api.vietqr.io/image/970422-0987654321-compact.jpg?amount=${booking.TotalAmount}&addInfo=${encodeURIComponent(booking.BookingCode)}&accountName=CONG%20TY%20JESOUL%20BUS`
    };

    return {
      ...booking,
      remainingSeconds,
      bankDetails
    };
  }
}

module.exports = BookingService;
