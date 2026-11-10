const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/TicketController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/v1/tickets/my/list - Lấy toàn bộ danh sách vé của khách hàng đang đăng nhập
router.get('/my/list', authMiddleware(['Customer']), TicketController.getMyTickets);

// GET /api/v1/tickets/:ticketCode - Yêu cầu đăng nhập để xem chi tiết vé
router.get('/:ticketCode', authMiddleware(['Customer', 'Driver', 'Admin']), TicketController.getByCode);

// POST /api/v1/tickets/:ticketCode/cancel - Chỉ khách hàng sở hữu vé mới có quyền hủy
router.post(
  '/:ticketCode/cancel',
  authMiddleware(['Customer']),
  TicketController.cancel
);

// GET /api/v1/tickets/confirm/:token?action=go|cancel (Link bảo mật từ nút bấm trong Gmail)
router.get('/confirm/:token', TicketController.confirmByGmailToken);

module.exports = router;
