import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../services/authApi';
import toast from 'react-hot-toast';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      setIsSubmitted(true);
      toast.success('Password reset instructions sent');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-brand-white p-8 border border-brand-stone shadow-sm">
        {isSubmitted ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-brand-stone/30 rounded-full flex items-center justify-center mx-auto text-brand-black">
              <Mail size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
                Check your inbox
              </h2>
              <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
                If an account exists with <strong className="text-brand-black">{email}</strong>, we have sent a link to reset your password.
              </p>
              <p className="mt-2 text-xs text-brand-taupe leading-relaxed">
                The link is valid for 30 minutes. Please check your spam folder if you do not see it within a few minutes.
              </p>
            </div>
            <div className="pt-4 border-t border-brand-stone/60">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors"
              >
                <ArrowLeft size={16} /> Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
                Reset Password
              </h2>
              <p className="mt-2 text-xs text-brand-taupe uppercase tracking-wider">
                Enter your email address and we'll send you a recovery link
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 text-center border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="recovery-email" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
                  Email Address
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="appearance-none block w-full px-3 py-3 border border-brand-stone bg-transparent text-brand-black placeholder-brand-taupe/60 text-sm focus:outline-none focus:ring-1 focus:ring-brand-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Sending Link...' : 'Send Recovery Link'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand-black hover:text-brand-taupe underline underline-offset-4"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
