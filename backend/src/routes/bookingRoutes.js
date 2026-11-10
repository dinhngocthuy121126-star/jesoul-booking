const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/BookingController');
const validate = require('../middlewares/validateMiddleware');
const { rejectInternalRoles } = require('../middlewares/authMiddleware');
const { createBookingSchema } = require('../validators/schemas');

// POST /api/v1/bookings - Chặn tài khoản nội bộ (Tài xế / Chủ xe) đặt vé
router.post(
  '/',
  rejectInternalRoles('Tài khoản nội bộ doanh nghiệp (Tài xế / Chủ xe) không được phép tạo đơn đặt vé khách hàng.'),
  validate(createBookingSchema),
  BookingController.create
);

// GET /api/v1/bookings/:bookingCode
router.get('/:bookingCode', BookingController.getByCode);

module.exports = router;
