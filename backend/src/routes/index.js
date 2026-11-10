const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const tripRoutes = require('./tripRoutes');
const bookingRoutes = require('./bookingRoutes');
const ticketRoutes = require('./ticketRoutes');
const driverRoutes = require('./driverRoutes');
const paymentRoutes = require('./paymentRoutes');

router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/bookings', bookingRoutes);
router.use('/tickets', ticketRoutes);
router.use('/driver', driverRoutes);
router.use('/payments', paymentRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    statusCode: 200,
    message: 'JESOUL Bus Booking API Gateway is healthy.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

