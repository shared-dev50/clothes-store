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
  refreshRateLimiter,
} from '../middleware/rateLimiter';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// CSRF Defense-in-depth: Reject cross-site simple navigation submissions targeting cookie-authenticated routes
const cookieCsrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (req.headers['sec-fetch-mode'] === 'navigate') {
    res.status(403).json({ error: 'Cross-site form navigation rejected' });
    return;
  }
  next();
};

// Registration & Login
router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);

// Session Management
router.post('/refresh', cookieCsrfProtection, refreshRateLimiter, refreshToken);
router.post('/logout', cookieCsrfProtection, logout);
router.get('/me', authenticate, getMe);

// Email Verification
router.post('/verify-email', verifyEmailRateLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationRateLimiter, resendVerification);

// Password Recovery
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, resetPassword);

export default router;
