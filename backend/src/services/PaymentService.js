const { getPool, sql } = require('../config/database');
const BookingModel = require('../models/BookingModel');
const TicketModel = require('../models/TicketModel');
const PaymentModel = require('../models/PaymentModel');

class PaymentService {
  static async processBankWebhook({ bookingCode, amount, transactionRef, bankName }) {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const booking = await BookingModel.findByCode(bookingCode, transaction);
      if (!booking) {
        const error = new Error(`Mã đơn vé ${bookingCode} không tồn tại.`);
        error.statusCode = 404;
        throw error;
      }

      if (booking.Status === 'Paid') {
        await transaction.rollback();
        return {
          bookingCode,
          status: 'Paid',
          message: 'Đơn đặt vé này đã được thanh toán trước đó.'
        };
      }

      if (booking.Status === 'Cancelled') {
        const error = new Error(`Đơn đặt vé ${bookingCode} đã bị hủy do quá hạn thanh toán 10 phút.`);
        error.statusCode = 400;
        throw error;
      }

      // 1. Cập nhật Booking -> 'Paid'
      await BookingModel.updateStatus(booking.BookingID, 'Paid', transaction);

      // 2. Cập nhật các vé (Tickets) từ 'Hold' -> 'Paid'
      await TicketModel.updateStatusByBookingId(booking.BookingID, 'Hold', 'Paid', transaction);

      // 3. Ghi nhận giao dịch chuyển khoản vào PaymentTransactions
      const ref = transactionRef || `BANK-TX-${Date.now()}`;
      const actualAmount = amount || booking.TotalAmount;

      const record = await PaymentModel.recordTransaction({
        bookingId: booking.BookingID,
        paymentMethod: 'BankTransfer',
        transactionRef: ref,
        amount: actualAmount,
        status: 'Success',
        bankName: bankName || 'MB Bank'
      }, transaction);

      await transaction.commit();

      return {
        bookingCode,
        status: 'Paid',
        totalAmount: actualAmount,
        transactionRef: record.TransactionRef,
        paidAt: record.PaidAt,
        message: 'Ghi nhận thanh toán chuyển khoản thành công. Đơn vé chuyển sang trạng thái Đã thanh toán.'
      };

    } catch (error) {
      if (transaction && transaction._acquiredConfig) {
        try { await transaction.rollback(); } catch (_) {}
      }
      throw error;
    }
  }
}

module.exports = PaymentService;
