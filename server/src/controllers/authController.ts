import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import {
  validatePassword,
  normalizeEmail,
  isValidEmail,
  generateSecureToken,
  hashToken,
  generateAccessToken,
  getRefreshTokenCookieOptions,
} from '../utils/authUtils';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService';
import { AuthRequest } from '../middleware/auth';

/**
 * Register a new customer account
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address' });
      return;
    }

    const cleanName = typeof name === 'string' ? name.trim() : '';

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ error: passwordValidation.message });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and email verification token atomically
    const rawVerificationToken = generateSecureToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName || null,
        passwordHash,
        role: 'CUSTOMER',
        isEmailVerified: false,
        emailVerifications: {
          create: {
            tokenHash: verificationTokenHash,
            expiresAt: verificationExpiresAt,
          },
        },
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, rawVerificationToken, user.name || undefined);

    res.status(201).json({
      message: emailResult.success
        ? 'Account created successfully. Please check your email to verify your account.'
        : 'Account created, but verification email could not be delivered. Please use resend verification or contact support.',
      emailDeliveryFailed: !emailResult.success,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: false,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

/**
 * Log in with email and password
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check email verification status for customers 
    if (user.role !== 'ADMIN' && !user.isEmailVerified) {
      res.status(403).json({
        error: 'Please verify your email address before logging in.',
        needsEmailVerification: true,
        email: user.email,
      });
      return;
    }

    // Generate short-lived access token
    const token = generateAccessToken(user);

    // Generate rotating refresh token (7 days)
    const rawRefreshToken = generateSecureToken(40);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    // Set HttpOnly refresh cookie
    res.cookie('hbs_refresh_token', rawRefreshToken, getRefreshTokenCookieOptions());

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

/**
 * Rotate refresh token and issue a fresh access token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.cookies?.hbs_refresh_token;

    if (!rawToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const currentHash = hashToken(rawToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: currentHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      res.clearCookie('hbs_refresh_token', getRefreshTokenCookieOptions());
      res.status(401).json({ error: 'Invalid session. Please log in again.' });
      return;
    }

    // Refresh Token Reuse Detection & Concurrency Grace Period
    if (tokenRecord.revokedAt !== null) {
      const elapsedSinceRevocation = Date.now() - tokenRecord.revokedAt.getTime();
      const ROTATION_GRACE_PERIOD_MS = 15 * 1000;

      // If the token was revoked within the grace window and was replaced by an active successor token
      if (elapsedSinceRevocation <= ROTATION_GRACE_PERIOD_MS && tokenRecord.replacedByTokenHash) {
        const replacementRecord = await prisma.refreshToken.findUnique({
          where: { tokenHash: tokenRecord.replacedByTokenHash },
        });

        if (replacementRecord && replacementRecord.revokedAt === null && replacementRecord.expiresAt > new Date()) {
          // Concurrent request during rotation: issue fresh access token without invalidating sessions
          const accessToken = generateAccessToken(tokenRecord.user);
          res.json({
            token: accessToken,
            user: {
              id: tokenRecord.user.id,
              email: tokenRecord.user.email,
              name: tokenRecord.user.name,
              role: tokenRecord.user.role,
              isEmailVerified: tokenRecord.user.isEmailVerified,
            },
          });
          return;
        }
      }

      console.warn(`[Security Alert] Refresh token reuse detected for user ${tokenRecord.userId}! Revoking all active sessions.`);
      // Invalidate all refresh tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      res.clearCookie('hbs_refresh_token', getRefreshTokenCookieOptions());
      res.status(401).json({ error: 'Security alert: Session compromised. All sessions revoked. Please log in again.' });
      return;
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      res.clearCookie('hbs_refresh_token', getRefreshTokenCookieOptions());
      res.status(401).json({ error: 'Session expired. Please log in again.' });
      return;
    }

    const user = tokenRecord.user;

    // Rotate refresh token
    const newRawRefreshToken = generateSecureToken(40);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenHash: newRefreshTokenHash,
        },
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newRefreshTokenHash,
          userId: user.id,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    // Issue new access token
    const newAccessToken = generateAccessToken(user);

    // Set new rotated refresh cookie
    res.cookie('hbs_refresh_token', newRawRefreshToken, getRefreshTokenCookieOptions());

    res.json({
      token: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error refreshing token' });
  }
};

/**
 * Log out and revoke current refresh session
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.cookies?.hbs_refresh_token;

    if (rawToken) {
      const currentHash = hashToken(rawToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: currentHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('hbs_refresh_token', getRefreshTokenCookieOptions());
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
};

/**
 * Get current authenticated user profile
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify email using one-time token link
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const currentHash = hashToken(token.trim());

    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: currentHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      res.status(400).json({
        error: 'Verification link is invalid or has already been consumed. Please request a new verification link.',
      });
      return;
    }

    if (tokenRecord.usedAt !== null) {
      res.status(400).json({
        error: 'This verification link has already been used. Please log in to your account.',
        alreadyVerified: true,
      });
      return;
    }

    if (tokenRecord.expiresAt < new Date()) {
      res.status(400).json({
        error: 'This verification link has expired. Please request a new verification link.',
        expired: true,
      });
      return;
    }

    // Mark token as consumed and user as verified atomically
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    res.json({
      message: 'Email verified successfully! You can now log in to your account.',
      email: tokenRecord.user.email,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error during email verification' });
  }
};

/**
 * Resend email verification link
 */
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Prevent email enumeration: return generic success if account does not exist
    if (!user) {
      res.json({
        message: 'If an account exists with this email, a verification link has been sent.',
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        error: 'This email address is already verified. Please log in.',
        alreadyVerified: true,
      });
      return;
    }

    // Invalidate existing active verification tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new token
    const rawVerificationToken = generateSecureToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: verificationTokenHash,
        userId: user.id,
        expiresAt: verificationExpiresAt,
      },
    });

    await sendVerificationEmail(user.email, rawVerificationToken, user.name || undefined);

    res.json({
      message: 'If an account exists with this email, a verification link has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error resending verification' });
  }
};

/**
 * Initiate password recovery (forgot password)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const cleanEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Prevent email enumeration: return generic success message if user does not exist
    if (!user) {
      res.json({
        message: 'If an account exists with this email address, password reset instructions have been sent.',
      });
      return;
    }

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create single-use token (30-minute expiry)
    const rawResetToken = generateSecureToken(32);
    const resetTokenHash = hashToken(rawResetToken);
    const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: resetTokenHash,
        userId: user.id,
        expiresAt: resetExpiresAt,
      },
    });

    await sendPasswordResetEmail(user.email, rawResetToken, user.name || undefined);

    res.json({
      message: 'If an account exists with this email address, password reset instructions have been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error processing password recovery' });
  }
};

/**
 * Complete password reset with new password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Reset token and new password are required' });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ error: passwordValidation.message });
      return;
    }

    const currentHash = hashToken(token.trim());
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: currentHash },
      include: { user: true },
    });

    if (!resetRecord) {
      res.status(400).json({
        error: 'Password reset link is invalid or has already been used. Please request a new link.',
      });
      return;
    }

    if (resetRecord.usedAt !== null) {
      res.status(400).json({
        error: 'This password reset link has already been used. Please request a new link if needed.',
      });
      return;
    }

    if (resetRecord.expiresAt < new Date()) {
      res.status(400).json({
        error: 'This password reset link has expired (links are valid for 30 minutes). Please request a new link.',
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Atomically consume token, update password, and revoke all active refresh sessions for security
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Clear any active session cookie on this browser
    res.clearCookie('hbs_refresh_token', getRefreshTokenCookieOptions());

    res.json({
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error resetting password' });
  }
};
