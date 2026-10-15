import request from 'supertest';
import app from '../src/index';
import prisma from '../src/config/db';
import { hashToken } from '../src/utils/authUtils';
import * as emailService from '../src/services/emailService';
import { resendVerificationLimiterInstance } from '../src/middleware/rateLimiter';

describe('HBS Wear — Authentication, Registration & Account Security', () => {
  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@example.com`;
  const testAdminEmail = `admin_${timestamp}@example.com`;
  const strongPassword = 'StrongP@ssw0rd123!';

  beforeAll(async () => {
    // Clean up any test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testCustomerEmail, testAdminEmail, `dup_${timestamp}@example.com`],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testCustomerEmail, testAdminEmail, `dup_${timestamp}@example.com`],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('1. Registration and Password Policy', () => {
    it('enforces minimum 8 characters password policy', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: `short_${timestamp}@example.com`,
          password: 'Sh0rt!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 8 characters/i);
    });

    it('enforces at least one letter in password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Letter',
          email: `noletter_${timestamp}@example.com`,
          password: '12345678!@#$',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least one letter/i);
    });

    it('enforces at least one number in password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Number',
          email: `nonumber_${timestamp}@example.com`,
          password: 'Password!@#$',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least one number/i);
    });

    it('enforces at least one special character in password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Special',
          email: `nospecial_${timestamp}@example.com`,
          password: 'Password1234',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/special character/i);
    });

    it('successfully registers with a valid strong password and creates unverified account', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Amani Mwangi',
          email: testCustomerEmail,
          password: strongPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testCustomerEmail);
      expect(res.body.user.isEmailVerified).toBe(false);
      expect(res.body.user.name).toBe('Amani Mwangi');

      // Verify token created in database
      const user = await prisma.user.findUnique({
        where: { email: testCustomerEmail },
        include: { emailVerifications: true },
      });
      expect(user).toBeDefined();
      expect(user?.isEmailVerified).toBe(false);
      expect(user?.emailVerifications.length).toBe(1);
      expect(user?.emailVerifications[0].usedAt).toBeNull();
    });

    it('prevents duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Attempt',
          email: testCustomerEmail,
          password: strongPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('prevents privilege escalation by ignoring role parameter on registration', async () => {
      const email = `attacker_${timestamp}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Privilege Attacker',
          email,
          password: strongPassword,
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('CUSTOMER');

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.role).toBe('CUSTOMER');
    });

    it('reports emailDeliveryFailed when email dispatch fails', async () => {
      const email = `undelivered_${timestamp}@example.com`;
      const sendEmailSpy = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValueOnce({
        success: false,
        error: 'Resend API key rejected in simulation',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Undelivered Customer',
          email,
          password: strongPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.emailDeliveryFailed).toBe(true);
      expect(res.body.message).toMatch(/could not be delivered/i);
      sendEmailSpy.mockRestore();
    });
  });

  describe('2. Login and Unverified Account Handling', () => {
    it('rejects invalid password with generic error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('rejects non-existent email with generic error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `ghost_${timestamp}@example.com`,
          password: strongPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('blocks login for unverified customer and prompts verification', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: strongPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.needsEmailVerification).toBe(true);
      expect(res.body.email).toBe(testCustomerEmail);
    });

    it('allows admin user to log in even if unverified (prevents lockout)', async () => {
      // Create admin user directly
      await prisma.user.create({
        data: {
          email: testAdminEmail,
          name: 'System Admin',
          passwordHash: await require('bcryptjs').hash(strongPassword, 10),
          role: 'ADMIN',
          isEmailVerified: false,
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdminEmail,
          password: strongPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('hbs_refresh_token');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    });
  });

  describe('3. Email Verification Flow', () => {
    let rawToken: string;

    beforeAll(async () => {
      // Create a specific verification token to test with known raw value
      rawToken = 'test_raw_verification_token_' + timestamp;
      const user = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
      await prisma.emailVerificationToken.create({
        data: {
          tokenHash: hashToken(rawToken),
          userId: user!.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });

    it('rejects an invalid verification token', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'non_existent_token_12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid or has already been consumed/i);
    });

    it('rejects an expired verification token', async () => {
      const expiredRawToken = 'expired_raw_token_' + timestamp;
      const user = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
      await prisma.emailVerificationToken.create({
        data: {
          tokenHash: hashToken(expiredRawToken),
          userId: user!.id,
          expiresAt: new Date(Date.now() - 10000), // Expired in past
        },
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: expiredRawToken });

      expect(res.status).toBe(400);
      expect(res.body.expired).toBe(true);
    });

    it('successfully verifies email with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/verified successfully/i);

      const user = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerifiedAt).toBeDefined();
    });

    it('rejects token reuse once consumed', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(400);
      expect(res.body.alreadyVerified).toBe(true);
    });

    it('resends verification link and enforces rate limit', async () => {
      // Set unverified temporarily to test resend
      await prisma.user.update({
        where: { email: testCustomerEmail },
        data: { isEmailVerified: false },
      });

      try {
        const makeReq = () =>
          request(app)
            .post('/api/auth/resend-verification')
            .set('x-test-enforce-rate-limit', 'true')
            .send({ email: testCustomerEmail });

        resendVerificationLimiterInstance.reset();

        // Attempts 1, 2, 3 should succeed
        const res1 = await makeReq();
        expect(res1.status).toBe(200);
        const res2 = await makeReq();
        expect(res2.status).toBe(200);
        const res3 = await makeReq();
        expect(res3.status).toBe(200);

        // Attempt 4 should be throttled with 429
        const res4 = await makeReq();
        expect(res4.status).toBe(429);
        expect(res4.body.error).toMatch(/too many verification email requests/i);
      } finally {
        resendVerificationLimiterInstance.reset();
        await prisma.user.update({
          where: { email: testCustomerEmail },
          data: { isEmailVerified: true },
        });
      }
    });
  });

  describe('4. Session Management, Refresh Rotation & Logout', () => {
    let refreshCookie: string;
    let accessToken: string;

    it('logs in verified customer and returns short-lived token + HttpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: strongPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      accessToken = res.body.token;

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      refreshCookie = cookies[0];
      expect(refreshCookie).toContain('hbs_refresh_token=');
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('authenticates with Bearer token on /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testCustomerEmail);
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('rotates refresh token and issues new access token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.token).not.toBe(accessToken); // Fresh token
      expect(res.headers['set-cookie']).toBeDefined();

      const newCookie = res.headers['set-cookie'][0];
      expect(newCookie).not.toBe(refreshCookie); // Rotated cookie

      // Verify the old token record is marked revoked in DB
      const oldRaw = refreshCookie.split('hbs_refresh_token=')[1].split(';')[0];
      const oldRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(oldRaw) },
      });
      expect(oldRecord?.revokedAt).not.toBeNull();

      // Test Concurrency Grace Period: Presenting the just-revoked token within 15s grace window
      // simulates a race condition between two simultaneous client requests.
      const concurrentRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);

      expect(concurrentRes.status).toBe(200);
      expect(concurrentRes.body.token).toBeDefined();

      // Verify active sessions are NOT wiped due to the concurrent request
      const activeTokens = await prisma.refreshToken.findMany({
        where: { user: { email: testCustomerEmail }, revokedAt: null },
      });
      expect(activeTokens.length).toBeGreaterThan(0);

      // Test Reuse Detection AFTER grace window (simulating malicious replay of old token)
      await prisma.refreshToken.update({
        where: { id: oldRecord!.id },
        data: { revokedAt: new Date(Date.now() - 30 * 1000) }, // 30 seconds ago (beyond 15s grace period)
      });

      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error).toMatch(/compromised/i);

      // Verify ALL active refresh tokens for this user were revoked due to genuine reuse
      const userTokens = await prisma.refreshToken.findMany({
        where: { user: { email: testCustomerEmail }, revokedAt: null },
      });
      expect(userTokens.length).toBe(0);
    });

    it('logout revokes refresh session and clears cookie', async () => {
      // Log in again to get fresh session
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testCustomerEmail, password: strongPassword });

      const cookie = loginRes.headers['set-cookie'][0];

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [cookie]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.headers['set-cookie'][0]).toMatch(/hbs_refresh_token=;/);

      // Attempting to refresh with the logged out cookie fails
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [cookie]);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('5. Password Recovery (Forgot & Reset Password)', () => {
    let resetToken: string;

    it('returns generic success for non-existent email on forgot-password', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: `phantom_${timestamp}@example.com` });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset instructions have been sent/i);
    });

    it('generates a password reset token for valid user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testCustomerEmail });

      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({
        where: { email: testCustomerEmail },
        include: { passwordResetTokens: true },
      });

      expect(user?.passwordResetTokens.length).toBeGreaterThan(0);
      const latestToken = user?.passwordResetTokens[user.passwordResetTokens.length - 1];
      expect(latestToken?.usedAt).toBeNull();
    });

    it('enforces password policy on reset-password', async () => {
      resetToken = 'test_raw_reset_token_' + timestamp;
      const user = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(resetToken),
          userId: user!.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 8 characters/i);
    });

    it('resets password successfully and invalidates active refresh sessions', async () => {
      // First, create an active refresh token for user
      const user = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
      await prisma.refreshToken.create({
        data: {
          tokenHash: hashToken('some_active_refresh_token_' + timestamp),
          userId: user!.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const newPassword = 'BrandNewP@ssw0rd2026!';
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset successful/i);

      // Verify all refresh tokens are revoked
      const activeSessions = await prisma.refreshToken.findMany({
        where: { userId: user!.id, revokedAt: null },
      });
      expect(activeSessions.length).toBe(0);

      // Verify old password fails
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testCustomerEmail, password: strongPassword });
      expect(oldLoginRes.status).toBe(401);

      // Verify new password succeeds
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testCustomerEmail, password: newPassword });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.token).toBeDefined();
    });

    it('rejects reuse of a consumed password reset token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'AnotherP@ssw0rd999!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already been used/i);
    });
  });

  describe('6. Role-Based Authorization and Route Protection', () => {
    let customerToken: string;
    let adminToken: string;

    beforeAll(async () => {
      const custLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testCustomerEmail, password: 'BrandNewP@ssw0rd2026!' });
      customerToken = custLogin.body.token;

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testAdminEmail, password: strongPassword });
      adminToken = adminLogin.body.token;
    });

    it('denies customer access to admin routes (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin access required/i);
    });

    it('allows admin access to admin routes (200 OK)', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects unauthenticated requests on admin routes (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/admin/products');
      expect(res.status).toBe(401);
    });
  });

  describe('7. Guest Checkout and Order Access Security', () => {
    let guestOrderNumber: string;
    let guestAccessToken: string;
    const guestEmail = `guest_${timestamp}@example.com`;

    it('allows creating an order without any authentication header and returns guestAccessToken', async () => {
      // Create a category and product for checkout
      const category = await prisma.category.create({
        data: { name: 'Guest Category ' + timestamp, slug: 'guest-cat-' + timestamp },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Guest Product ' + timestamp,
          slug: 'guest-prod-' + timestamp,
          description: 'Guest test description',
          price: 1500,
          categoryId: category.id,
          variants: {
            create: [
              { color: 'Black', size: 'M', sku: 'GST-BLK-M-' + timestamp, stock: 10 },
            ],
          },
        },
        include: { variants: true },
      });

      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [
            { productId: product.id, variantId: product.variants[0].id, quantity: 1 },
          ],
          customerName: 'Guest Customer',
          customerEmail: guestEmail,
          customerPhone: '0712345678',
          deliveryAddress: 'Kilimani, Nairobi',
          county: 'Nairobi',
        });

      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toBeDefined();
      expect(res.body.userId).toBeNull();
      expect(res.body.guestAccessToken).toBeDefined();

      guestOrderNumber = res.body.orderNumber;
      guestAccessToken = res.body.guestAccessToken;
    });

    it('rejects unauthorized guest order lookup by order number alone (403 Forbidden)', async () => {
      const res = await request(app).get(`/api/orders/${guestOrderNumber}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    it('allows guest order lookup when valid x-guest-token header is provided', async () => {
      const res = await request(app)
        .get(`/api/orders/${guestOrderNumber}`)
        .set('x-guest-token', guestAccessToken);

      expect(res.status).toBe(200);
      expect(res.body.orderNumber).toBe(guestOrderNumber);
      expect(res.body.customerName).toBe('Guest Customer');
      expect(res.body.customerEmail).toBe(guestEmail);
      expect(res.body.deliveryAddress).toBe('Kilimani, Nairobi');
    });

    it('allows guest order lookup when matching customer email query parameter is provided', async () => {
      const res = await request(app)
        .get(`/api/orders/${guestOrderNumber}`)
        .query({ email: guestEmail });

      expect(res.status).toBe(200);
      expect(res.body.orderNumber).toBe(guestOrderNumber);
      expect(res.body.customerName).toBe('Guest Customer');
    });

    it('rejects guest order cancellation without guest token or matching email (403 Forbidden)', async () => {
      const res = await request(app).post(`/api/orders/${guestOrderNumber}/cancel`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('allows guest order cancellation with valid x-guest-token header', async () => {
      const res = await request(app)
        .post(`/api/orders/${guestOrderNumber}/cancel`)
        .set('x-guest-token', guestAccessToken);

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('CANCELLED');
    });

    it('redacts sensitive payment metadata on payment status lookup for unauthorized guest requests', async () => {
      // Create a test payment record with sensitive metadata and phone number
      const order = await prisma.order.findUnique({ where: { orderNumber: guestOrderNumber } });
      await prisma.payment.create({
        data: {
          orderId: order!.id,
          provider: 'MPESA',
          status: 'PENDING',
          amount: order!.total,
          currency: 'KES',
          phoneNumber: '254712345678',
          metadata: { secretField: 'secret-card-ref' },
        },
      });

      // Unauthorized request: without guest token
      const res = await request(app).get(`/api/payments/order/${guestOrderNumber}/status`);
      expect(res.status).toBe(200);
      expect(res.body.paymentStatus).toBeDefined();
      expect(res.body.latestPayment).toBeDefined();
      expect(res.body.latestPayment.status).toBe('PENDING');
      expect(res.body.latestPayment.phoneNumber).toBeNull();
      expect(res.body.latestPayment.metadata).toBeNull();

      // Authorized request: with x-guest-token receives full payment info
      const authRes = await request(app)
        .get(`/api/payments/order/${guestOrderNumber}/status`)
        .set('x-guest-token', guestAccessToken);
      expect(authRes.status).toBe(200);
      expect(authRes.body.latestPayment.phoneNumber).toBe('254712345678');
    });
  });
});
