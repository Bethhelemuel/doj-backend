const express = require('express');
const { registerUser, verifyOTP, loginUser, resendOTP, requestPasswordReset } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/resend-otp', resendOTP);
router.post('/password-reset', requestPasswordReset); // Optional

module.exports = router;
