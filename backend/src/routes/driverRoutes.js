const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { driverUpdateTicketSchema } = require('../validators/schemas');

// Yêu cầu xác thực tài xế hoặc quản trị viên/chủ xe cho tất cả route driver
router.use(authMiddleware(['Driver', 'Admin']));

// GET /api/v1/driver/trips/today
router.get('/trips/today', DriverController.getTodayTrip);

// PATCH /api/v1/driver/tickets/:ticketCode/status
router.patch('/tickets/:ticketCode/status', validate(driverUpdateTicketSchema), DriverController.updateStatus);

module.exports = router;
