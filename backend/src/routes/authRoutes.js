const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const validate = require('../middlewares/validateMiddleware');
const { loginSchema } = require('../validators/schemas');

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), AuthController.login);

module.exports = router;
