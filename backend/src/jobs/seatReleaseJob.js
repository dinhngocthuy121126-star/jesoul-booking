const cron = require('node-cron');
const { getPool, sql } = require('../config/database');
const logger = require('../utils/logger');

// UC-12: Tự động hủy giữ chỗ quá 10 phút (Quét mỗi phút)
function initSeatReleaseJob() {
  cron.schedule('*/1 * * * *', async () => {
    try {
      const pool = getPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      const request = new sql.Request(transaction);

      // Tìm các đơn quá 10 phút
      const expiredRes = await request.query(`
        SELECT BookingID, TripID, SeatQuantity
        FROM dbo.Bookings WITH (UPDLOCK)
        WHERE Status = 'Pending' AND HoldExpiresAt <= SYSUTCDATETIME();
      `);

      if (expiredRes.recordset.length > 0) {
        logger.info(`[SeatReleaseJob] Phát hiện ${expiredRes.recordset.length} đơn giữ chỗ quá 10 phút. Đang xử lý hoàn trả ghế...`);

        for (const row of expiredRes.recordset) {
          // Hủy đơn
          await request.query(`
            UPDATE dbo.Bookings 
            SET Status = 'Cancelled', UpdatedAt = SYSUTCDATETIME()
            WHERE BookingID = ${row.BookingID};

            UPDATE dbo.Tickets
            SET Status = 'Cancelled', CancelReason = N'Quá 10 phút không thanh toán (Timeout)', CancelledAt = SYSUTCDATETIME()
            WHERE BookingID = ${row.BookingID};

            UPDATE dbo.Trips
            SET AvailableSeats = AvailableSeats + ${row.SeatQuantity}
            WHERE TripID = ${row.TripID};
          `);
        }
      }

      await transaction.commit();
    } catch (error) {
      logger.error(`[SeatReleaseJob] Lỗi quét giữ chỗ: ${error.message}`);
    }
  });

  logger.info('[Scheduler] SeatReleaseJob (10-min countdown) initialized.');
}

module.exports = { initSeatReleaseJob };

