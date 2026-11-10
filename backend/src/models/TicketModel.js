const { getPool, sql } = require('../config/database');

class TicketModel {
  static async createTicket({ bookingId, ticketCode, confirmationToken, status = 'Hold' }, transaction) {
    const request = new sql.Request(transaction);
    request.input('bookingId', sql.Int, bookingId);
    request.input('ticketCode', sql.VarChar, ticketCode);
    request.input('confirmationToken', sql.VarChar, confirmationToken);
    request.input('status', sql.VarChar, status);

    const result = await request.query(`
      INSERT INTO dbo.Tickets (BookingID, TicketCode, ConfirmationToken, Status)
      OUTPUT INSERTED.TicketID, INSERTED.TicketCode, INSERTED.ConfirmationToken, INSERTED.Status
      VALUES (@bookingId, @ticketCode, @confirmationToken, @status);
    `);
    return result.recordset[0];
  }

  static async findByCode(ticketCode, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('ticketCode', sql.VarChar, ticketCode);

    const result = await request.query(`
      SELECT 
        tk.TicketID, tk.TicketCode, tk.Status AS TicketStatus, tk.ConfirmationToken,
        tk.ConfirmedAt, tk.CancelledAt, tk.CancelReason,
        b.BookingID, b.BookingCode, b.TotalAmount, b.SeatQuantity,
        u.UserID, u.FullName, u.PhoneNumber, u.Email,
        t.TripID, t.DepartureTime, t.ArrivalTime,
        r.Origin, r.Destination,
        bs.PlateNumber, bs.BusType,
        d.FullName AS DriverName
      FROM dbo.Tickets tk
      JOIN dbo.Bookings b ON tk.BookingID = b.BookingID
      JOIN dbo.Users u ON b.UserID = u.UserID
      JOIN dbo.Trips t ON b.TripID = t.TripID
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses bs ON t.BusID = bs.BusID
      JOIN dbo.Users d ON t.DriverID = d.UserID
      WHERE tk.TicketCode = @ticketCode;
    `);
    return result.recordset[0] || null;
  }

  static async findTicketsByUserId(userId) {
    const pool = getPool();
    const request = pool.request();
    request.input('userId', sql.Int, userId);

    const result = await request.query(`
      SELECT 
        tk.TicketID, tk.TicketCode, tk.Status AS TicketStatus,
        tk.ConfirmedAt, tk.CancelledAt, tk.CancelReason,
        b.BookingID, b.BookingCode, b.TotalAmount, b.SeatQuantity,
        u.FullName, u.PhoneNumber, u.Email,
        t.TripID, t.DepartureTime, t.ArrivalTime,
        r.Origin, r.Destination,
        bs.PlateNumber, bs.BusType,
        d.FullName AS DriverName
      FROM dbo.Tickets tk
      JOIN dbo.Bookings b ON tk.BookingID = b.BookingID
      JOIN dbo.Users u ON b.UserID = u.UserID
      JOIN dbo.Trips t ON b.TripID = t.TripID
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses bs ON t.BusID = bs.BusID
      JOIN dbo.Users d ON t.DriverID = d.UserID
      WHERE b.UserID = @userId
      ORDER BY tk.TicketID DESC;
    `);
    return result.recordset;
  }

  static async findByConfirmationToken(token, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('token', sql.VarChar, token);

    const result = await request.query(`
      SELECT 
        tk.TicketID, tk.TicketCode, tk.Status, tk.ConfirmationToken,
        b.BookingID, b.BookingCode,
        t.TripID, t.DepartureTime
      FROM dbo.Tickets tk
      JOIN dbo.Bookings b ON tk.BookingID = b.BookingID
      JOIN dbo.Trips t ON b.TripID = t.TripID
      WHERE tk.ConfirmationToken = @token;
    `);
    return result.recordset[0] || null;
  }

  static async findPassengersByTrip(tripId) {
    const pool = getPool();
    const request = pool.request();
    request.input('tripId', sql.Int, tripId);

    const result = await request.query(`
      SELECT 
        tk.TicketID, tk.TicketCode, tk.Status AS TicketStatus, tk.CancelReason, tk.ConfirmedAt,
        b.BookingCode,
        u.FullName AS PassengerName, u.PhoneNumber AS PassengerPhone, u.Email AS PassengerEmail
      FROM dbo.Tickets tk
      JOIN dbo.Bookings b ON tk.BookingID = b.BookingID
      JOIN dbo.Users u ON b.UserID = u.UserID
      WHERE b.TripID = @tripId
      ORDER BY 
        CASE WHEN tk.Status = 'NoReply' THEN 1 ELSE 2 END,
        tk.TicketID ASC;
    `);
    return result.recordset;
  }

  static async updateStatus(ticketCode, status, reason = null, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('ticketCode', sql.VarChar, ticketCode);
    request.input('status', sql.VarChar, status);
    request.input('reason', sql.NVarChar, reason);

    let query = `
      UPDATE dbo.Tickets
      SET Status = @status
    `;

    if (status === 'Confirmed') {
      query += `, ConfirmedAt = SYSUTCDATETIME()`;
    } else if (status === 'Cancelled') {
      query += `, CancelReason = @reason, CancelledAt = SYSUTCDATETIME()`;
    }

    query += ` WHERE TicketCode = @ticketCode;`;

    await request.query(query);
  }

  static async updateStatusByBookingId(bookingId, fromStatus, toStatus, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('bookingId', sql.Int, bookingId);
    request.input('fromStatus', sql.VarChar, fromStatus);
    request.input('toStatus', sql.VarChar, toStatus);

    await request.query(`
      UPDATE dbo.Tickets
      SET Status = @toStatus
      WHERE BookingID = @bookingId AND Status = @fromStatus;
    `);
  }
}

module.exports = TicketModel;
