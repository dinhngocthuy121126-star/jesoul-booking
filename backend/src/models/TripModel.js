const { getPool, sql } = require('../config/database');

class TripModel {
  static async searchAvailableTrips({ origin, destination, seatQuantity = 1, departureDate = null }) {
    const pool = getPool();
    const request = pool.request();
    request.input('seatQuantity', sql.Int, seatQuantity);

    let query = `
      SELECT 
        t.TripID,
        r.Origin,
        r.Destination,
        t.DepartureTime,
        t.ArrivalTime,
        t.BasePrice,
        t.AvailableSeats,
        b.PlateNumber,
        b.BusType,
        b.TotalSeats,
        u.FullName AS DriverName,
        t.Status
      FROM dbo.Trips t
      INNER JOIN dbo.Routes r ON t.RouteID = r.RouteID
      INNER JOIN dbo.Buses b ON t.BusID = b.BusID
      INNER JOIN dbo.Users u ON t.DriverID = u.UserID
      WHERE t.Status = 'Scheduled'
        AND t.DepartureTime > DATEADD(MINUTE, 30, SYSUTCDATETIME())
        AND t.AvailableSeats >= @seatQuantity
    `;

    if (origin) {
      query += ` AND r.Origin LIKE @origin`;
      request.input('origin', sql.NVarChar, `%${origin}%`);
    }

    if (destination) {
      query += ` AND r.Destination LIKE @destination`;
      request.input('destination', sql.NVarChar, `%${destination}%`);
    }

    if (departureDate) {
      query += ` AND CAST(t.DepartureTime AS DATE) = @departureDate`;
      request.input('departureDate', sql.Date, departureDate);
    }

    query += ` ORDER BY t.DepartureTime ASC;`;

    const result = await request.query(query);
    return result.recordset;
  }

  // Khóa hàng bi quan (Pessimistic Lock) chống Race Condition
  static async getTripForUpdate(tripId, transaction) {
    const request = new sql.Request(transaction);
    request.input('tripId', sql.Int, tripId);

    const result = await request.query(`
      SELECT TripID, RouteID, BusID, DriverID, DepartureTime, ArrivalTime, BasePrice, AvailableSeats, Status
      FROM dbo.Trips WITH (UPDLOCK, ROWLOCK)
      WHERE TripID = @tripId;
    `);
    return result.recordset[0] || null;
  }

  static async adjustAvailableSeats(tripId, delta, transaction) {
    const request = new sql.Request(transaction);
    request.input('tripId', sql.Int, tripId);
    request.input('delta', sql.Int, delta);

    await request.query(`
      UPDATE dbo.Trips
      SET AvailableSeats = AvailableSeats + @delta
      WHERE TripID = @tripId;
    `);
  }

  static async findTripByDriver(driverId, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('driverId', sql.Int, driverId);

    const result = await request.query(`
      SELECT TOP 1
        t.TripID, t.DepartureTime, t.ArrivalTime, t.BasePrice, t.AvailableSeats, t.Status,
        r.Origin, r.Destination,
        b.PlateNumber, b.BusType, b.TotalSeats
      FROM dbo.Trips t
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses b ON t.BusID = b.BusID
      WHERE t.DriverID = @driverId
      ORDER BY t.DepartureTime ASC;
    `);
    return result.recordset[0] || null;
  }

  static async findFirstTrip(transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    const result = await request.query(`
      SELECT TOP 1
        t.TripID, t.DepartureTime, t.ArrivalTime, t.BasePrice, t.AvailableSeats, t.Status,
        r.Origin, r.Destination,
        b.PlateNumber, b.BusType, b.TotalSeats
      FROM dbo.Trips t
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses b ON t.BusID = b.BusID
      WHERE t.Status = 'Scheduled'
      ORDER BY t.DepartureTime ASC;
    `);
    return result.recordset[0] || null;
  }

  static async findTripById(tripId, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('tripId', sql.Int, tripId);
    const result = await request.query(`
      SELECT t.TripID, t.DepartureTime, t.ArrivalTime, t.BasePrice, t.AvailableSeats, t.Status,
             r.Origin, r.Destination,
             b.PlateNumber, b.BusType, b.TotalSeats
      FROM dbo.Trips t
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses b ON t.BusID = b.BusID
      WHERE t.TripID = @tripId;
    `);
    return result.recordset[0] || null;
  }

  static async findTripByIdAndDriver(tripId, driverId, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('tripId', sql.Int, tripId);
    request.input('driverId', sql.Int, driverId);

    const result = await request.query(`
      SELECT t.TripID, t.DepartureTime, t.ArrivalTime, t.BasePrice, t.AvailableSeats, t.Status,
             r.Origin, r.Destination,
             b.PlateNumber, b.BusType, b.TotalSeats
      FROM dbo.Trips t
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses b ON t.BusID = b.BusID
      WHERE t.TripID = @tripId AND t.DriverID = @driverId;
    `);
    return result.recordset[0] || null;
  }

  static async findTripsList(driverId = null, isAdmin = false) {
    const pool = getPool();
    const request = pool.request();
    let query = `
      SELECT 
        t.TripID, t.DepartureTime, t.ArrivalTime, t.BasePrice, t.AvailableSeats, t.Status,
        r.Origin, r.Destination,
        b.PlateNumber, b.BusType, b.TotalSeats,
        u.FullName AS DriverName,
        (
          SELECT COUNT(*) 
          FROM dbo.Tickets tk 
          JOIN dbo.Bookings bk ON tk.BookingID = bk.BookingID 
          WHERE bk.TripID = t.TripID AND tk.Status != 'Cancelled'
        ) AS PassengerCount
      FROM dbo.Trips t
      JOIN dbo.Routes r ON t.RouteID = r.RouteID
      JOIN dbo.Buses b ON t.BusID = b.BusID
      JOIN dbo.Users u ON t.DriverID = u.UserID
      WHERE t.Status = 'Scheduled'
    `;

    if (!isAdmin && driverId) {
      query += ` AND t.DriverID = @driverId`;
      request.input('driverId', sql.Int, driverId);
    }

    query += ` ORDER BY t.DepartureTime ASC;`;

    const result = await request.query(query);
    return result.recordset;
  }
}

module.exports = TripModel;
