const { getPool, sql } = require('../config/database');

class BookingModel {
  static async createBooking({ bookingCode, userId, tripId, seatQuantity, totalAmount }, transaction) {
    const request = new sql.Request(transaction);
    request.input('bookingCode', sql.VarChar, bookingCode);
    request.input('userId', sql.Int, userId);
    request.input('tripId', sql.Int, tripId);
    request.input('seatQuantity', sql.Int, seatQuantity);
    request.input('totalAmount', sql.Decimal(18, 2), totalAmount);

    const result = await request.query(`
      INSERT INTO dbo.Bookings (BookingCode, UserID, TripID, SeatQuantity, TotalAmount, Status, HoldExpiresAt)
      OUTPUT INSERTED.BookingID, INSERTED.BookingCode, INSERTED.HoldExpiresAt, INSERTED.TotalAmount, INSERTED.SeatQuantity
      VALUES (@bookingCode, @userId, @tripId, @seatQuantity, @totalAmount, 'Pending', DATEADD(MINUTE, 10, SYSUTCDATETIME()));
    `);
    return result.recordset[0];
  }

  static async findByCode(bookingCode, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('bookingCode', sql.VarChar, bookingCode);

    const result = await request.query(`
      SELECT 
        b.BookingID, b.BookingCode, b.SeatQuantity, b.TotalAmount, b.Status, b.HoldExpiresAt, b.CreatedAt,
        u.FullName, u.PhoneNumber, u.Email,
        t.DepartureTime, t.ArrivalTime, t.BasePrice,
        r.Origin, r.Destination,
        bs.PlateNumber, bs.BusType,
        d.FullName AS DriverName
      FROM dbo.Bookings b
      JOIN dbo.Users u ON b.UserID = u.UserID
      JOIN dbo.Trips t ON b.TripID = t.TripID
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses bs ON t.BusID = bs.BusID
      JOIN dbo.Users d ON t.DriverID = d.UserID
      WHERE b.BookingCode = @bookingCode;
    `);
    return result.recordset[0] || null;
  }

  static async updateStatus(bookingId, status, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('bookingId', sql.Int, bookingId);
    request.input('status', sql.VarChar, status);

    await request.query(`
      UPDATE dbo.Bookings
      SET Status = @status, UpdatedAt = SYSUTCDATETIME()
      WHERE BookingID = @bookingId;
    `);
  }
}

module.exports = BookingModel;
