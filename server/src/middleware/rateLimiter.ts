import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;

  constructor(options: { windowMs: number; maxRequests: number; message: string }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message = options.message;

    // Periodically clean up stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter(t => now - t < this.windowMs);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  public middleware(keyExtractor?: (req: Request, clientIp: string) => string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // In automated test mode, bypass unless explicitly testing rate limits
      if (process.env.NODE_ENV === 'test' && req.headers['x-test-enforce-rate-limit'] !== 'true') {
        next();
        return;
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown-ip';
      const customKey = keyExtractor ? keyExtractor(req, ip) : '';
      const key = `${customKey || ip}`;

      const now = Date.now();
      let record = this.store.get(key);
      if (!record) {
        record = { timestamps: [] };
        this.store.set(key, record);
      }

      // Filter out timestamps outside the active window
      record.timestamps = record.timestamps.filter(t => now - t < this.windowMs);

      if (record.timestamps.length >= this.maxRequests) {
        const oldest = record.timestamps[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((this.windowMs - (now - oldest)) / 1000));
        res.setHeader('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
          error: this.message,
          retryAfter: retryAfterSeconds,
        });
        return;
      }

      record.timestamps.push(now);
      next();
    };
  }
}

// 1. Login rate limit: 10 attempts per 15 minutes per IP or email
export const loginLimiterInstance = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});
export const loginRateLimiter = loginLimiterInstance.middleware(
  (req, ip) => `login:${req.body?.email ? String(req.body.email).toLowerCase().trim() : ''}:${ip}`
);

// 2. Registration rate limit: 10 accounts per hour per IP
export const registerLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many accounts created from this IP. Please try again later.',
});
export const registerRateLimiter = registerLimiterInstance.middleware();

// 3. Resend verification rate limit: 3 requests per 15 minutes per email
export const resendVerificationLimiterInstance = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
  message: 'Too many verification email requests. Please wait a few minutes before trying again.',
});
export const resendVerificationRateLimiter = resendVerificationLimiterInstance.middleware(
  (req, ip) => `resend:${req.body?.email ? String(req.body.email).toLowerCase().trim() : ''}:${ip}`
);

// 4. Forgot password rate limit: 5 requests per hour per email
export const forgotPasswordLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many password reset requests. Please check your inbox or wait before trying again.',
});
export const forgotPasswordRateLimiter = forgotPasswordLimiterInstance.middleware(
  (req, ip) => `forgot:${req.body?.email ? String(req.body.email).toLowerCase().trim() : ''}:${ip}`
);

// 5. Reset password rate limit: 10 attempts per 15 minutes
export const resetPasswordLimiterInstance = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many password reset attempts. Please try again later.',
});
export const resetPasswordRateLimiter = resetPasswordLimiterInstance.middleware();

// 6. Email verification link rate limit: 15 attempts per 15 minutes
export const verifyEmailLimiterInstance = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many email verification attempts. Please try again later.',
});
export const verifyEmailRateLimiter = verifyEmailLimiterInstance.middleware();

// 7. Refresh session rate limit: 30 requests per minute per IP
export const refreshLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many session refresh attempts. Please try again shortly.',
});
export const refreshRateLimiter = refreshLimiterInstance.middleware();
