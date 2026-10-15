import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {
  loginRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  verifyEmailRateLimiter,
} from '../middleware/rateLimiter';

const router = Router();

// Registration & Login
router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);

// Session Management
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Email Verification
router.post('/verify-email', verifyEmailRateLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationRateLimiter, resendVerification);

// Password Recovery
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, resetPassword);

export default router;
