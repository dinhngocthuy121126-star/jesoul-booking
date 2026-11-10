const cron = require('node-cron');
const { getPool, sql } = require('../config/database');
const logger = require('../utils/logger');

// UC-14: Tự động chuyển trạng thái "Chưa phản hồi" (NoReply) sau 10 phút kể từ lúc gửi Gmail
function initNoReplyTimeoutJob() {
  cron.schedule('*/1 * * * *', async () => {
    try {
      const pool = getPool();
      const request = pool.request();

      // Quét các vé có email đã gửi quá 10 phút mà vé vẫn ở trạng thái Paid (chưa phản hồi)
      const result = await request.query(`
        UPDATE tk
        SET tk.Status = 'NoReply'
        FROM dbo.Tickets tk
        JOIN dbo.EmailLogs el ON tk.TicketID = el.TicketID
        WHERE tk.Status = 'Paid'
          AND el.Status = 'Sent'
          AND el.SentAt <= DATEADD(MINUTE, -10, SYSUTCDATETIME());
      `);

      if (result.rowsAffected[0] > 0) {
        logger.info(`[NoReplyTimeoutJob] Đã tự động chuyển ${result.rowsAffected[0]} vé sang trạng thái 'NoReply' (Chưa phản hồi).`);
      }
    } catch (error) {
      logger.error(`[NoReplyTimeoutJob] Lỗi quét timeout phản hồi: ${error.message}`);
    }
  });

  logger.info('[Scheduler] NoReplyTimeoutJob (10-min Gmail timeout) initialized.');
}

module.exports = { initNoReplyTimeoutJob };

