import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Check, Mail } from 'lucide-react';
import { register, resendVerification } from '../services/authApi';
import { checkPasswordRules, validateClientPassword } from '../utils/passwordPolicy';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Success state when registration completes
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const passwordRules = checkPasswordRules(password);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const passwordValidation = validateClientPassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await register(name.trim(), email.trim(), password);
      setRegisteredEmail(email.trim());
      setIsRegistered(true);
      if (res.emailDeliveryFailed) {
        setEmailDeliveryFailed(true);
        toast.error('Account created, but verification email could not be sent. Please resend below.');
      } else {
        toast.success('Account created! Please check your email.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      await resendVerification(registeredEmail);
      toast.success('Verification link resent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 bg-brand-white p-8 border border-brand-stone shadow-sm text-center">
          <div className="w-16 h-16 bg-brand-stone/30 rounded-full flex items-center justify-center mx-auto text-brand-black">
            <Mail size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
              Verify your email
            </h2>
            {emailDeliveryFailed ? (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left space-y-1">
                <p className="font-semibold">⚠️ Automatic email delivery failed</p>
                <p>We created your account, but our email provider could not deliver the activation link immediately. Please click below to resend, or contact support if the issue persists.</p>
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
                  We've sent a one-time verification link to{' '}
                  <strong className="text-brand-black">{registeredEmail}</strong>.
                </p>
                <p className="mt-2 text-xs text-brand-taupe leading-relaxed">
                  Please click the link in your email to activate your account and start shopping.
                </p>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-brand-stone/60 space-y-4">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-xs font-semibold uppercase tracking-widest text-brand-black hover:text-brand-taupe underline underline-offset-4 disabled:opacity-50"
            >
              {isResending ? 'Resending verification...' : "Didn't receive the email? Resend link"}
            </button>

            <div>
              <Link
                to="/login"
                className="inline-block w-full py-3 px-4 text-center text-sm font-medium uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors"
              >
                Proceed to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-brand-white p-8 border border-brand-stone shadow-sm">
        <div>
          <h2 className="mt-2 text-center text-3xl font-display font-medium uppercase tracking-widest text-brand-black">
            Create an account
          </h2>
          <p className="mt-2 text-center text-xs text-brand-taupe uppercase tracking-wider">
            Join HBS Wear for streamlined orders & exclusive drops
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 text-center border border-red-200">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="full-name" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
              Full Name
            </label>
            <input
              id="full-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className={`appearance-none block w-full px-3 py-3 border ${
                fieldErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-brand-stone focus:ring-brand-black'
              } bg-transparent text-brand-black placeholder-brand-taupe/60 focus:outline-none focus:ring-1 sm:text-sm`}
              placeholder="e.g. Amani Mwangi"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
              }}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
              Email Address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`appearance-none block w-full px-3 py-3 border ${
                fieldErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-brand-stone focus:ring-brand-black'
              } bg-transparent text-brand-black placeholder-brand-taupe/60 focus:outline-none focus:ring-1 sm:text-sm`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
              }}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`appearance-none block w-full px-3 py-3 pr-10 border ${
                  fieldErrors.password ? 'border-red-400 focus:ring-red-400' : 'border-brand-stone focus:ring-brand-black'
                } bg-transparent text-brand-black placeholder-brand-taupe/60 focus:outline-none focus:ring-1 sm:text-sm`}
                placeholder="Create password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                }}
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
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}

            {/* Inline Password Policy Feedback */}
            <div className="mt-2.5 p-3 bg-brand-stone/15 border border-brand-stone/40 text-xs space-y-1.5">
              <span className="font-semibold text-brand-taupe uppercase tracking-wider block mb-1">
                Password Requirements:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${passwordRules.minLength ? 'text-green-700 font-medium' : 'text-brand-taupe'}`}>
                  {passwordRules.minLength ? <Check size={13} className="text-green-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-brand-stone flex-shrink-0" />}
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasLetter ? 'text-green-700 font-medium' : 'text-brand-taupe'}`}>
                  {passwordRules.hasLetter ? <Check size={13} className="text-green-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-brand-stone flex-shrink-0" />}
                  At least 1 letter
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasNumber ? 'text-green-700 font-medium' : 'text-brand-taupe'}`}>
                  {passwordRules.hasNumber ? <Check size={13} className="text-green-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-brand-stone flex-shrink-0" />}
                  At least 1 number
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasSpecial ? 'text-green-700 font-medium' : 'text-brand-taupe'}`}>
                  {passwordRules.hasSpecial ? <Check size={13} className="text-green-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-brand-stone flex-shrink-0" />}
                  Special char (!@#$...)
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`appearance-none block w-full px-3 py-3 pr-10 border ${
                  fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-brand-stone focus:ring-brand-black'
                } bg-transparent text-brand-black placeholder-brand-taupe/60 focus:outline-none focus:ring-1 sm:text-sm`}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-taupe hover:text-brand-black"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center mt-4">
            <span className="text-sm text-brand-taupe">
              Already have an account?{' '}
            </span>
            <Link
              to="/login"
              className="text-sm font-semibold text-brand-black hover:text-brand-gold uppercase tracking-wider underline underline-offset-4"
            >
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
