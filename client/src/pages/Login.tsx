import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login, resendVerification } from '../services/authApi';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail(null);
    setIsLoading(true);

    try {
      const response = await login(email.trim(), password);
      if (response.token && response.user) {
        setAuth(response.user, response.token);
        toast.success(`Welcome back${response.user.name ? `, ${response.user.name}` : ''}!`);
        if (response.user.role === 'ADMIN' && from === '/') {
          navigate('/admin');
        } else {
          navigate(from);
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      if (err.needsEmailVerification) {
        setUnverifiedEmail(err.email || email.trim());
        setError(err.message || 'Please verify your email address to log in.');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || email.trim();
    if (!targetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      await resendVerification(targetEmail);
      toast.success('Verification link sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-brand-white p-8 border border-brand-stone shadow-sm">
        <div>
          <h2 className="mt-2 text-center text-3xl font-display font-medium uppercase tracking-widest text-brand-black">
            Log in to your account
          </h2>
          <p className="mt-2 text-center text-xs text-brand-taupe uppercase tracking-wider">
            Access your orders, saved addresses and wishlist
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
                <div className="space-y-2">
                  <p>{error}</p>
                  {unverifiedEmail && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="text-xs font-semibold uppercase tracking-wider text-brand-black underline underline-offset-4 hover:text-brand-taupe disabled:opacity-50 block"
                    >
                      {isResending ? 'Sending...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-3 border border-brand-stone bg-transparent text-brand-black placeholder-brand-taupe/60 focus:outline-none focus:ring-1 focus:ring-brand-black sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-brand-black">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-taupe hover:text-brand-black uppercase tracking-wider underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-3 pr-10 border border-brand-stone bg-transparent text-brand-black placeholder-brand-taupe/60 focus:outline-none focus:ring-1 focus:ring-brand-black sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-taupe hover:text-brand-black"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center mt-4">
            <span className="text-sm text-brand-taupe">
              Don't have an account?{' '}
            </span>
            <Link
              to="/register"
              className="text-sm font-semibold text-brand-black hover:text-brand-gold uppercase tracking-wider underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
