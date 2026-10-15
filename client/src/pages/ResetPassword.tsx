import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '../services/authApi';
import { checkPasswordRules, validateClientPassword } from '../utils/passwordPolicy';
import toast from 'react-hot-toast';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordRules = checkPasswordRules(password);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    const passwordValidation = validateClientPassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please check your reset link.');
      return;
    }

    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      await resetPassword(token, password);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-brand-white p-8 border border-brand-stone shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
            <AlertCircle size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
              Invalid Reset Link
            </h2>
            <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
              No reset token was found in this link. Please request a new password reset link.
            </p>
          </div>
          <div>
            <Link
              to="/forgot-password"
              className="inline-block w-full py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-brand-white p-8 border border-brand-stone shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
              Password Reset!
            </h2>
            <p className="mt-3 text-sm text-brand-taupe leading-relaxed">
              Your password has been successfully updated. All previous active sessions have been signed out for security.
            </p>
          </div>
          <div>
            <Link
              to="/login"
              className="inline-block w-full py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors"
            >
              Log In With New Password
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-brand-white p-8 border border-brand-stone shadow-sm space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-display font-medium uppercase tracking-widest text-brand-black">
            Choose New Password
          </h2>
          <p className="mt-2 text-xs text-brand-taupe uppercase tracking-wider">
            Create a strong, secure password for your account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 border border-red-200 space-y-2">
            <p>{error}</p>
            <Link
              to="/forgot-password"
              className="inline-block text-xs font-semibold uppercase tracking-wider underline underline-offset-4 text-brand-black hover:text-brand-taupe"
            >
              Request a new reset link &rarr;
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`appearance-none block w-full px-3 py-3 pr-10 border ${
                  fieldErrors.password ? 'border-red-400 focus:ring-red-400' : 'border-brand-stone focus:ring-brand-black'
                } bg-transparent text-brand-black placeholder-brand-taupe/60 text-sm focus:outline-none focus:ring-1`}
                placeholder="Enter new password"
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

            {/* Inline Password Rules */}
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
                  Special character
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-new-password" className="block text-xs font-semibold uppercase tracking-wider text-brand-black mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`appearance-none block w-full px-3 py-3 pr-10 border ${
                  fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-brand-stone focus:ring-brand-black'
                } bg-transparent text-brand-black placeholder-brand-taupe/60 text-sm focus:outline-none focus:ring-1`}
                placeholder="Confirm new password"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 text-sm font-semibold uppercase tracking-widest text-brand-white bg-brand-black hover:bg-brand-taupe transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Resetting Password...' : 'Save New Password'}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs uppercase tracking-widest text-brand-black hover:text-brand-taupe underline underline-offset-4 font-semibold"
            >
              Cancel and Return to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
