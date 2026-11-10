const { getPool, sql } = require('../config/database');

class EmailLogModel {
  static async findByTicketId(ticketId, emailType = 'DepartureConfirmation', transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('ticketId', sql.Int, ticketId);
    request.input('emailType', sql.VarChar, emailType);

    const result = await request.query(`
      SELECT TOP 1 LogID, TicketID, RecipientEmail, EmailType, Status, ActionClicked, SentAt, ClickedAt, ErrorMessage
      FROM dbo.EmailLogs
      WHERE TicketID = @ticketId AND EmailType = @emailType
      ORDER BY LogID DESC;
    `);
    return result.recordset[0] || null;
  }

  static async createLog({ ticketId, recipientEmail, emailType = 'DepartureConfirmation', status = 'Pending' }, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('ticketId', sql.Int, ticketId);
    request.input('recipientEmail', sql.VarChar, recipientEmail);
    request.input('emailType', sql.VarChar, emailType);
    request.input('status', sql.VarChar, status);

    const result = await request.query(`
      INSERT INTO dbo.EmailLogs (TicketID, RecipientEmail, EmailType, Status, SentAt)
      OUTPUT INSERTED.LogID, INSERTED.TicketID, INSERTED.RecipientEmail, INSERTED.EmailType, INSERTED.Status, INSERTED.SentAt
      VALUES (@ticketId, @recipientEmail, @emailType, @status, CASE WHEN @status = 'Sent' THEN SYSUTCDATETIME() ELSE NULL END);
    `);
    return result.recordset[0];
  }

  static async markSent(logId, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('logId', sql.Int, logId);

    await request.query(`
      UPDATE dbo.EmailLogs
      SET Status = 'Sent', SentAt = SYSUTCDATETIME(), ErrorMessage = NULL
      WHERE LogID = @logId;
    `);
  }

  static async markFailed(logId, errorMessage, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('logId', sql.Int, logId);
    request.input('errorMessage', sql.NVarChar, errorMessage ? String(errorMessage).substring(0, 500) : 'Lỗi không xác định');

    await request.query(`
      UPDATE dbo.EmailLogs
      SET Status = 'Failed', ErrorMessage = @errorMessage
      WHERE LogID = @logId;
    `);
  }

  static async recordClick(ticketId, action, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('ticketId', sql.Int, ticketId);
    request.input('action', sql.VarChar, action === 'go' ? 'Go' : 'Cancel');

    await request.query(`
      UPDATE dbo.EmailLogs
      SET Status = 'Clicked', ActionClicked = @action, ClickedAt = SYSUTCDATETIME()
      WHERE TicketID = @ticketId AND Status IN ('Sent', 'Clicked');
    `);
  }

  static async findPendingTicketsForDepartureEmail() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        tk.TicketID, tk.TicketCode, tk.ConfirmationToken, tk.Status AS TicketStatus,
        u.UserID, u.FullName AS CustomerName, u.Email AS CustomerEmail, u.PhoneNumber AS CustomerPhone,
        t.TripID, t.DepartureTime, t.ArrivalTime, t.BasePrice,
        r.Origin, r.Destination,
        b.PlateNumber, b.BusType,
        d.FullName AS DriverName, d.PhoneNumber AS DriverPhone
      FROM dbo.Tickets tk
      JOIN dbo.Bookings bk ON tk.BookingID = bk.BookingID
      JOIN dbo.Users u ON bk.UserID = u.UserID
      JOIN dbo.Trips t ON bk.TripID = t.TripID
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses b ON t.BusID = b.BusID
      JOIN dbo.Users d ON t.DriverID = d.UserID
      WHERE tk.Status = 'Paid'
        AND t.DepartureTime > SYSUTCDATETIME()
        AND t.DepartureTime <= DATEADD(MINUTE, 30, SYSUTCDATETIME())
        AND NOT EXISTS (
          SELECT 1 FROM dbo.EmailLogs el
          WHERE el.TicketID = tk.TicketID 
            AND el.EmailType = 'DepartureConfirmation'
            AND el.Status IN ('Sent', 'Clicked')
        );
    `);
    return result.recordset;
  }
}

module.exports = EmailLogModel;

