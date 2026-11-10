const { getPool, sql } = require('../config/database');
const TicketModel = require('../models/TicketModel');
const TripModel = require('../models/TripModel');
const EmailLogModel = require('../models/EmailLogModel');

class TicketService {
  static async getTicketByCode(ticketCode, user = null) {
    if (!user) {
      const error = new Error('Tính năng tra cứu vé yêu cầu đăng nhập tài khoản Khách hàng để bảo vệ dữ liệu cá nhân.');
      error.statusCode = 401;
      throw error;
    }

    const ticket = await TicketModel.findByCode(ticketCode);
    if (!ticket) {
      const error = new Error('Vé xe không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    // Nếu người dùng là Khách hàng, chỉ được xem vé do chính mình đặt
    if (user.role === 'Customer' && ticket.UserID !== user.userId && ticket.PhoneNumber !== user.phoneNumber) {
      const error = new Error('Bạn không có quyền truy cập thông tin vé của hành khách khác.');
      error.statusCode = 403;
      throw error;
    }

    return ticket;
  }

  static async getMyTickets(userId) {
    return await TicketModel.findTicketsByUserId(userId);
  }

  // UC-06: Khách hàng chủ động hủy vé trên Website (Không hoàn tiền - BR-05)
  static async cancelTicketByCustomer(ticketCode, user = null) {
    if (!user) {
      const error = new Error('Vui lòng đăng nhập tài khoản Khách hàng để thực hiện hủy vé.');
      error.statusCode = 401;
      throw error;
    }

    if (user.role !== 'Customer') {
      const error = new Error('Thao tác hủy vé tự phục vụ chỉ dành cho khách hàng sở hữu vé.');
      error.statusCode = 403;
      throw error;
    }

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

      // Xác thực chủ quyền: Chỉ khách hàng sở hữu vé mới có quyền hủy
      if (ticket.UserID !== user.userId && ticket.PhoneNumber !== user.phoneNumber) {
        const error = new Error('Bạn không phải là chủ sở hữu chiếc vé này nên không có quyền hủy.');
        error.statusCode = 403;
        throw error;
      }

      if (ticket.TicketStatus === 'Cancelled') {
        const error = new Error('Vé này đã được hủy trước đó.');
        error.statusCode = 400;
        throw error;
      }

      // Kiểm tra quy định: chỉ cho hủy trước giờ xuất phát > 30 phút
      const now = new Date();
      const departure = new Date(ticket.DepartureTime);
      const minutesDiff = (departure - now) / (1000 * 60);

      if (minutesDiff <= 30) {
        const error = new Error('Không thể hủy vé khi chuyến xe còn dưới 30 phút khởi hành.');
        error.statusCode = 400;
        throw error;
      }

      // 1. Cập nhật trạng thái vé thành 'Cancelled'
      await TicketModel.updateStatus(ticketCode, 'Cancelled', 'Khách hàng chủ động hủy trên Website', transaction);

      // 2. Hoàn lại 1 ghế trống cho chuyến xe
      await TripModel.adjustAvailableSeats(ticket.TripID, 1, transaction);

      await transaction.commit();

      return {
        ticketCode,
        status: 'Cancelled',
        refundPolicy: 'Không hoàn tiền theo chính sách quy định của JESOUL.'
      };

    } catch (error) {
      if (transaction && transaction._acquiredConfig) {
        try { await transaction.rollback(); } catch (_) {}
      }
      throw error;
    }
  }

  // UC-07: Tiếp nhận tương tác từ nút bấm trong Gmail ('go' | 'cancel')
  static async handleGmailConfirmation(token, action) {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const ticket = await TicketModel.findByConfirmationToken(token, transaction);
      if (!ticket) {
        const error = new Error('Token xác nhận không hợp lệ hoặc không tồn tại.');
        error.statusCode = 404;
        throw error;
      }

      if (ticket.Status === 'Cancelled') {
        const error = new Error('Vé này đã ở trạng thái Đã hủy.');
        error.statusCode = 400;
        throw error;
      }

      // Ghi nhận tương tác click vào dbo.EmailLogs
      await EmailLogModel.recordClick(ticket.TicketID, action, transaction);

      if (action === 'go') {
        // Cập nhật trạng thái vé thành 'Confirmed' (Đã xác nhận)
        await TicketModel.updateStatus(ticket.TicketCode, 'Confirmed', null, transaction);
        await transaction.commit();
        return {
          action: 'go',
          status: 'Confirmed',
          ticketCode: ticket.TicketCode,
          message: 'Xác nhận chuyến đi thành công.'
        };
      } else {
        // Cập nhật trạng thái vé thành 'Cancelled' (Đã hủy) & hoàn lại ghế trống
        await TicketModel.updateStatus(ticket.TicketCode, 'Cancelled', 'Khách bấm nút Không đi qua Gmail', transaction);
        await TripModel.adjustAvailableSeats(ticket.TripID, 1, transaction);
        await transaction.commit();
        return {
          action: 'cancel',
          status: 'Cancelled',
          ticketCode: ticket.TicketCode,
          message: 'Đã hủy chuyến đi theo yêu cầu của quý khách qua email. Không áp dụng hoàn tiền.'
        };
      }

    } catch (error) {
      if (transaction && transaction._acquiredConfig) {
        try { await transaction.rollback(); } catch (_) {}
      }
      throw error;
    }
  }
}

module.exports = TicketService;
