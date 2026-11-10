const { google } = require('googleapis');
const env = require('../config/environment');
const logger = require('../utils/logger');
const EmailLogModel = require('../models/EmailLogModel');

class EmailService {
  /**
   * Khởi tạo OAuth 2.0 Client cho Google Gmail API
   */
  static getOAuth2Client() {
    const { clientId, clientSecret, redirectUri, refreshToken } = env.gmail;

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri || 'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    return oauth2Client;
  }

  /**
   * Tạo chuỗi MIME RFC 2822 mã hóa Base64URL tương thích Gmail API
   */
  static createMimeMessage({ to, subject, htmlContent, senderEmail }) {
    const from = senderEmail || env.gmail.senderEmail || 'noreply.jesoul@gmail.com';
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    const messageParts = [
      `From: "JESOUL Bus Lines" <${from}>`,
      `To: <${to}>`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      htmlContent
    ];

    const message = messageParts.join('\r\n');
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Tạo nội dung HTML email xác nhận chuyến xe kèm 2 nút bấm CTA (BR-07 & BPMN)
   */
  static buildDepartureConfirmationHtml(ticket) {
    const baseUrl = `http://localhost:${env.port}/api/v1`;
    const goUrl = `${baseUrl}/tickets/confirm/${ticket.ConfirmationToken}?action=go`;
    const cancelUrl = `${baseUrl}/tickets/confirm/${ticket.ConfirmationToken}?action=cancel`;

    const departureDate = new Date(ticket.DepartureTime).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const departureTime = new Date(ticket.DepartureTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; }
    .badge { display: inline-block; background: rgba(255,255,255,0.25); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .content { padding: 30px 24px; }
    .alert-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 12px; font-size: 13px; line-height: 1.5; color: #92400e; margin-bottom: 24px; }
    .trip-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px; font-size: 13px; }
    .trip-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .trip-row:last-child { margin-bottom: 0; }
    .label { color: #64748b; }
    .value { font-weight: bold; color: #0f172a; }
    .actions { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 6px; }
    .btn-go { background: #10b981; color: #ffffff; box-shadow: 0 4px 10px rgba(16,185,129,0.3); }
    .btn-cancel { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
    .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Xác nhận chuyến xe trước giờ khởi hành 30 phút</div>
      <h1>JESOUL BUS LINES</h1>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Hành trình của quý khách sắp bắt đầu!</p>
    </div>

    <div class="content">
      <div class="alert-box">
        <strong>⏱ Thông báo quan trọng:</strong> Chuyến xe của quý khách sẽ khởi hành trong <strong>30 phút nữa</strong>. Quý khách vui lòng xác nhận trong vòng <strong>10 phút</strong> bằng cách nhấn vào một trong 2 nút bên dưới để tài xế chuẩn bị đón.
      </div>

      <div class="trip-card">
        <div style="font-size: 15px; font-weight: bold; color: #ea580c; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
          Vé xe: #${ticket.TicketCode}
        </div>
        <div class="trip-row">
          <span class="label">Hành khách:</span>
          <span class="value">${ticket.CustomerName}</span>
        </div>
        <div class="trip-row">
          <span class="label">Tuyến đường:</span>
          <span class="value">${ticket.Origin} ➔ ${ticket.Destination}</span>
        </div>
        <div class="trip-row">
          <span class="label">Thời gian xuất phát:</span>
          <span class="value">${departureTime} - Ngày ${departureDate}</span>
        </div>
        <div class="trip-row">
          <span class="label">Phương tiện:</span>
          <span class="value">${ticket.BusType} (Biển số: ${ticket.PlateNumber})</span>
        </div>
        <div class="trip-row">
          <span class="label">Tài xế phụ trách:</span>
          <span class="value">${ticket.DriverName} (SĐT: ${ticket.DriverPhone})</span>
        </div>
      </div>

      <div class="actions">
        <p style="font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 14px;">Quý khách có tham gia chuyến xe này không?</p>
        <a href="${goUrl}" class="btn btn-go">✓ XÁC NHẬN ĐI</a>
        <a href="${cancelUrl}" class="btn btn-cancel">✕ TÔI KHÔNG ĐI NỮA</a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
        * Lưu ý: Nếu chọn "Tôi không đi nữa", vé sẽ bị thu hồi và áp dụng chính sách <strong>Không hoàn tiền</strong>.<br/>
        Nếu không phản hồi sau 10 phút, tài xế sẽ gọi điện trực tiếp tới số điện thoại của quý khách.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px;">Công ty Cổ phần Vận tải Du lịch JESOUL • Hotline 24/7: 1900 6868</p>
      <p style="margin: 0;">Email này được gửi tự động từ hệ thống quản lý chuyến xe theo quy trình chuẩn hóa BPMN To-Be.</p>
    </div>
  </div>
</body>
</html>
`;
  }

  /**
   * Gửi email xác nhận chuyến xe tới khách hàng (Có ghi nhận EmailLogs và cơ chế Chống gửi trùng)
   */
  static async sendDepartureConfirmationEmail(ticket) {
    const recipientEmail = ticket.CustomerEmail;
    const ticketId = ticket.TicketID;

    // 1. Kiểm tra Idempotency chống gửi trùng: nếu đã có bản ghi Sent hoặc Pending
    const existingLog = await EmailLogModel.findByTicketId(ticketId, 'DepartureConfirmation');
    if (existingLog && (existingLog.Status === 'Sent' || existingLog.Status === 'Clicked')) {
      logger.info(`[EmailService] Bỏ qua gửi email cho vé #${ticket.TicketCode}: Đã gửi trước đó lúc ${existingLog.SentAt}.`);
      return {
        success: true,
        skipped: true,
        logId: existingLog.LogID,
        message: 'Đã gửi trước đó.'
      };
    }

    // 2. Ghi nhận bản ghi Pending vào dbo.EmailLogs
    const emailLog = await EmailLogModel.createLog({
      ticketId,
      recipientEmail,
      emailType: 'DepartureConfirmation',
      status: 'Pending'
    });

    const subject = `[JESOUL BUS] Xác nhận chuyến xe ${ticket.Origin} - ${ticket.Destination} (${ticket.TicketCode})`;
    const htmlContent = this.buildDepartureConfirmationHtml(ticket);

    try {
      const oauth2Client = this.getOAuth2Client();
      const isDryRun = env.gmail.dryRun || !oauth2Client;

      if (isDryRun) {
        // Chế độ Dry-Run / Test Mode: Mô phỏng gửi thành công an toàn, không spam email thật
        logger.info(`[EmailService] [DRY RUN] Đã mô phỏng gửi email xác nhận thành công tới: ${recipientEmail} cho vé #${ticket.TicketCode}.`);
        await EmailLogModel.markSent(emailLog.LogID);

        return {
          success: true,
          dryRun: true,
          logId: emailLog.LogID,
          recipientEmail,
          ticketCode: ticket.TicketCode
        };
      }

      // 3. Gửi thật qua Google Gmail API OAuth 2.0
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const rawMessage = this.createMimeMessage({
        to: recipientEmail,
        subject,
        htmlContent,
        senderEmail: env.gmail.senderEmail
      });

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage
        }
      });

      // 4. Cập nhật trạng thái 'Sent' vào Database
      await EmailLogModel.markSent(emailLog.LogID);
      logger.info(`[EmailService] [GMAIL API] Gửi email thành công tới ${recipientEmail}. Gmail MessageId: ${response.data.id}`);

      return {
        success: true,
        dryRun: false,
        messageId: response.data.id,
        logId: emailLog.LogID,
        recipientEmail,
        ticketCode: ticket.TicketCode
      };

    } catch (error) {
      // 5. Ghi nhận lỗi chi tiết vào dbo.EmailLogs
      const errorMsg = `[Gmail Error] ${error.message}`;
      await EmailLogModel.markFailed(emailLog.LogID, errorMsg);
      logger.error(`[EmailService] Gửi email thất bại cho vé #${ticket.TicketCode}: ${error.message}`);

      return {
        success: false,
        error: error.message,
        logId: emailLog.LogID
      };
    }
  }

  /**
   * Quét và kích hoạt gửi email cho toàn bộ chuyến xe trong mốc 30 phút xuất phát
   */
  static async dispatchUpcomingDepartureEmails() {
    const pendingTickets = await EmailLogModel.findPendingTicketsForDepartureEmail();
    logger.info(`[EmailService] Tìm thấy ${pendingTickets.length} vé đến mốc 30 phút cần gửi email xác nhận.`);

    const results = {
      total: pendingTickets.length,
      sent: 0,
      failed: 0,
      skipped: 0
    };

    for (const ticket of pendingTickets) {
      try {
        const sendResult = await this.sendDepartureConfirmationEmail(ticket);
        if (sendResult.skipped) {
          results.skipped++;
        } else if (sendResult.success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (err) {
        results.failed++;
        logger.error(`[EmailService] Lỗi gửi email cho vé #${ticket.TicketCode}: ${err.message}`);
      }
    }

    return results;
  }
}

module.exports = EmailService;

