const express = require('express');
const router = express.Router();
const TripController = require('../controllers/TripController');
const validate = require('../middlewares/validateMiddleware');
const { searchTripSchema } = require('../validators/schemas');

// GET /api/v1/trips/search
router.get('/search', validate(searchTripSchema, 'query'), TripController.search);

// POST /api/v1/trips/reset (Dev/Demo utility)
router.post('/reset', async (req, res, next) => {
  try {
    const { getPool } = require('../config/database');
    const pool = getPool();
    await pool.request().query(`
      UPDATE dbo.Trips 
      SET AvailableSeats = 16, 
          DepartureTime = DATEADD(HOUR, 2, SYSUTCDATETIME()),
          ArrivalTime = DATEADD(HOUR, 3, SYSUTCDATETIME()),
          Status = 'Scheduled'
      WHERE TripID = 1;

      UPDATE dbo.Trips 
      SET AvailableSeats = 16, 
          DepartureTime = DATEADD(HOUR, 5, SYSUTCDATETIME()),
          ArrivalTime = DATEADD(HOUR, 6, SYSUTCDATETIME()),
          Status = 'Scheduled'
      WHERE TripID = 2;
    `);
    res.json({ success: true, message: 'Đã reset 2 chuyến xe về trạng thái khả dụng' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
