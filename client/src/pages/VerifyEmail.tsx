import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { verifyEmail, resendVerification } from '../services/authApi';
import toast from 'react-hot-toast';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'already-verified' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async (tokenToVerify: string) => {
    setStatus('verifying');
    setErrorMessage('');

    try {
      const response = await verifyEmail(tokenToVerify);
      if (response.email) {
        setVerifiedEmail(response.email);
      }
      setStatus('success');
      toast.success('Email successfully verified!');
    } catch (err: any) {
      if (err.alreadyVerified) {
        setStatus('already-verified');
      } else {
        setStatus('error');
        setErrorMessage(err.message || 'Verification link is invalid or expired.');
      }
    }
  };

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      await resendVerification(resendEmail.trim());
      setResendSuccess(true);
      toast.success('New verification link sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-brand-white p-8 border border-brand-stone shadow-sm text-center">
        {/* Missing Token State */}
        {!token && status === 'idle' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-brand-stone/30 rounded-full flex items-center justify-center mx-auto text-brand-black">
              <Mail size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
                Email Verification
              </h2>
              <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
                No verification token was found in the link. If your link expired or is incomplete, enter your email below to receive a new link.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-4 pt-2 text-left">
              <div>
                <label htmlFor="resend-email" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
                  Email address
                </label>
                <input
                  id="resend-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="block w-full px-3 py-3 border border-brand-stone bg-transparent text-brand-black text-sm focus:outline-none focus:ring-1 focus:ring-brand-black"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isResending}
                className="w-full py-3 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Send Verification Link'}
              </button>
            </form>

            <div className="pt-4 border-t border-brand-stone/60">
              <Link to="/login" className="text-xs uppercase tracking-widest text-brand-black hover:text-brand-taupe underline underline-offset-4">
                Return to Login
              </Link>
            </div>
          </div>
        )}

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="py-8 space-y-4">
            <div className="w-12 h-12 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-display uppercase tracking-widest text-brand-black">
              Verifying your email...
            </h2>
            <p className="text-xs text-brand-taupe">Please wait while we validate your link.</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
                Email Verified!
              </h2>
              <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
                Thank you{verifiedEmail ? ` (${verifiedEmail})` : ''}. Your email address has been confirmed and your HBS Wear account is now active.
              </p>
            </div>
            <div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors"
              >
                Sign In to Your Account <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* Already Verified State */}
        {status === 'already-verified' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
                Already Verified
              </h2>
              <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
                This email address is already verified. You can log in directly with your password.
              </p>
            </div>
            <div>
              <Link
                to="/login"
                className="inline-block w-full py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors"
              >
                Proceed to Login
              </Link>
            </div>
          </div>
        )}

        {/* Error / Expired State */}
        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
                Verification Failed
              </h2>
              <p className="mt-3 text-sm text-red-600 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {/* Resend Form */}
            <div className="pt-4 border-t border-brand-stone/60 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-black mb-2 text-center">
                Request a new link
              </h3>
              {resendSuccess ? (
                <div className="p-4 bg-green-50 text-green-700 text-xs border border-green-200 text-center">
                  A fresh verification link has been sent. Please check your inbox.
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    className="block w-full px-3 py-2.5 border border-brand-stone bg-transparent text-brand-black text-sm focus:outline-none focus:ring-1 focus:ring-brand-black"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={isResending}
                    className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Link'}
                  </button>
                </form>
              )}
            </div>

            <div className="pt-2">
              <Link to="/login" className="text-xs uppercase tracking-widest text-brand-black hover:text-brand-taupe underline underline-offset-4">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
