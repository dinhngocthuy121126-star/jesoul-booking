const cron = require('node-cron');
const EmailService = require('../services/EmailService');
const logger = require('../utils/logger');

/**
 * Lập lịch tự động gửi Gmail xác nhận cho các chuyến xe trước giờ xuất phát 30 phút (BPMN GW-3 & Giai đoạn 4)
 */
function initEmailDispatchJob() {
  // Chạy định kỳ mỗi 1 phút
  cron.schedule('*/1 * * * *', async () => {
    try {
      const result = await EmailService.dispatchUpcomingDepartureEmails();
      if (result.sent > 0 || result.failed > 0) {
        logger.info(`[EmailDispatchJob] Kết quả gửi email: ${result.sent} thành công, ${result.failed} thất bại, ${result.skipped} bỏ qua.`);
      }
    } catch (error) {
      logger.error(`[EmailDispatchJob] Lỗi quét và gửi email: ${error.message}`);
    }
  });

  logger.info('[Scheduler] EmailDispatchJob (30-min departure confirmation email) initialized.');
}

module.exports = { initEmailDispatchJob };

