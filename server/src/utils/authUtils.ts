import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CookieOptions } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Enforces the HBS Wear password policy:
 * - Minimum 8 characters
 * - At least one letter (a-z, A-Z)
 * - At least one number (0-9)
 * - At least one special character
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Common special characters: !@#$%^&*()_+-=[]{};':"|,.<>/?`~
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character (e.g. !@#$%^&*)',
    };
  }

  return { isValid: true };
};

export const normalizeEmail = (email: string): string => {
  return email ? email.trim().toLowerCase() : '';
};

export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const generateSecureToken = (byteLength = 32): string => {
  return crypto.randomBytes(byteLength).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateAccessToken = (user: { id: string; email: string; role: string }): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti: generateSecureToken(16),
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

export const generateGuestOrderToken = (orderNumber: string): string => {
  return jwt.sign(
    {
      orderNumber,
      kind: 'guest_order_access',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};
