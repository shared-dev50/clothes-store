const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'HBS Wear <onboarding@resend.dev>';
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const CLIENT_URL = rawClientUrl.replace(/\/+$/, '');

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email using the Resend API if configured, or logs safely in development/test.
 * In production, secret tokens and links are NEVER written to the logs.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<{ success: boolean; error?: string }> => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!RESEND_API_KEY || process.env.NODE_ENV === 'test') {
    if (!isProduction) {
      console.log(`[EmailService:Dev] Simulation email sent to ${options.to}: Subject="${options.subject}"`);
      if (process.env.NODE_ENV === 'development') {
        // Safe hint in local development so developer knows email was triggered
        console.log(`[EmailService:Dev] (Set RESEND_API_KEY in .env for real email delivery via Resend)`);
      }
      return { success: true };
    }

    console.warn(`[EmailService] RESEND_API_KEY is not configured in production. Failed to deliver email to ${options.to}`);
    return { success: false, error: 'Email service is not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Resend API returned status ${response.status}`;
      console.error(`[EmailService] Resend delivery failure: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[EmailService] Network or provider error during email send:', err.message || err);
    return { success: false, error: err.message || 'Failed to dispatch email' };
  }
};

/**
 * Sends a single-use email verification link to the customer.
 */
export const sendVerificationEmail = async (
  email: string,
  rawToken: string,
  name?: string
): Promise<{ success: boolean; error?: string }> => {
  const verificationUrl = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const greeting = name ? `Hello ${name},` : 'Hello,';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAFA; color: #121212; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E2DD; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; color: #121212; }
          .content { font-size: 15px; line-height: 1.6; color: #333333; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #121212; color: #FAFAFA !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E2DD; font-size: 12px; color: #7A7571; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">HBS WEAR</h1>
          </div>
          <div class="content">
            <p>${greeting}</p>
            <p>Thank you for creating an account with HBS Wear. To complete your registration and activate your account, please verify your email address below.</p>
            <div class="btn-container">
              <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
            </div>
            <p>This verification link is valid for 24 hours and can only be used once.</p>
            <p>If you did not sign up for an HBS Wear account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HBS Wear. Nairobi, Kenya.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify your HBS Wear account',
    html,
    text: `${greeting}\n\nPlease verify your email for HBS Wear by visiting the following link:\n${verificationUrl}\n\nThis link is valid for 24 hours.`,
  });
};

/**
 * Sends a single-use password recovery link to the user.
 */
export const sendPasswordResetEmail = async (
  email: string,
  rawToken: string,
  name?: string
): Promise<{ success: boolean; error?: string }> => {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const greeting = name ? `Hello ${name},` : 'Hello,';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAFA; color: #121212; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E2DD; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; color: #121212; }
          .content { font-size: 15px; line-height: 1.6; color: #333333; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #121212; color: #FAFAFA !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E2DD; font-size: 12px; color: #7A7571; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">HBS WEAR</h1>
          </div>
          <div class="content">
            <p>${greeting}</p>
            <p>We received a request to reset the password for your HBS Wear account. Click the button below to choose a new password:</p>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p>For your security, this password reset link is valid for 30 minutes and can only be used once.</p>
            <p>If you did not request this password reset, please ignore this email or contact support if you suspect unauthorized activity.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HBS Wear. Nairobi, Kenya.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset your HBS Wear password',
    html,
    text: `${greeting}\n\nReset your HBS Wear password by visiting this link:\n${resetUrl}\n\nThis link is valid for 30 minutes. If you did not request this, you can ignore this email.`,
  });
};
