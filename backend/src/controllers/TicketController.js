const TicketService = require('../services/TicketService');

class TicketController {
  static async getByCode(req, res, next) {
    try {
      const { ticketCode } = req.params;
      const ticket = await TicketService.getTicketByCode(ticketCode, req.user);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Lấy thông tin vé thành công.',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyTickets(req, res, next) {
    try {
      const userId = req.user.userId;
      const tickets = await TicketService.getMyTickets(userId);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Lấy danh sách vé của bạn thành công.',
        data: tickets
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      const { ticketCode } = req.params;
      const result = await TicketService.cancelTicketByCustomer(ticketCode, req.user);
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Hủy vé thành công. Ghế đã được hoàn trả vào hệ thống. Áp dụng chính sách không hoàn tiền.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmByGmailToken(req, res, next) {
    try {
      const { token } = req.params;
      const { action } = req.query; // 'go' | 'cancel'

      if (!action || !['go', 'cancel'].includes(action)) {
        return res.status(400).send('Hành động không hợp lệ (yêu cầu ?action=go hoặc ?action=cancel).');
      }

      const result = await TicketService.handleGmailConfirmation(token, action);

      if (result.action === 'go') {
        return res.send(`
          <!DOCTYPE html>
          <html lang="vi">
            <head><meta charset="UTF-8"><title>Xác nhận thành công</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc;">
              <div style="background: white; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h1 style="color: #10b981; margin-bottom: 10px;">✓ XÁC NHẬN CHUYẾN ĐI THÀNH CÔNG!</h1>
                <p style="color: #334155;">Mã vé: <strong>${result.ticketCode}</strong> đã được chuyển sang trạng thái <strong>ĐÃ XÁC NHẬN</strong>.</p>
                <p style="color: #64748b; font-size: 14px;">Chúc quý khách có một chuyến đi vui vẻ và an toàn cùng JESOUL!</p>
              </div>
            </body>
          </html>
        `);
      } else {
        return res.send(`
          <!DOCTYPE html>
          <html lang="vi">
            <head><meta charset="UTF-8"><title>Đã hủy chuyến</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc;">
              <div style="background: white; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h1 style="color: #e11d48; margin-bottom: 10px;">✕ ĐÃ GHI NHẬN HỦY CHUYẾN</h1>
                <p style="color: #334155;">Mã vé: <strong>${result.ticketCode}</strong> đã chuyển sang trạng thái <strong>ĐÃ HỦY</strong> và ghế đã được giải phóng.</p>
                <p style="color: #e11d48; font-size: 13px; font-weight: bold;">Lưu ý: Không áp dụng hoàn tiền theo quy định của JESOUL.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TicketController;

