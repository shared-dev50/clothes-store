const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  isEmailVerified?: boolean;
}

export interface AuthResponse {
  message?: string;
  token?: string;
  user?: User;
  error?: string;
  needsEmailVerification?: boolean;
  email?: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data.error || 'Failed to login');
    error.needsEmailVerification = data.needsEmailVerification;
    error.email = data.email;
    throw error;
  }
  return data;
};

export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to register');
  }
  return data;
};

export const refreshToken = async (): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to refresh session');
  }
  return data;
};

export const logout = async (): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to logout');
  }
  return data;
};

export const getMe = async (token?: string): Promise<{ user: User }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user');
  }
  return data;
};

export const verifyEmail = async (token: string): Promise<{ message: string; email?: string }> => {
  const response = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data.error || 'Failed to verify email');
    error.alreadyVerified = data.alreadyVerified;
    error.expired = data.expired;
    throw error;
  }
  return data;
};

export const resendVerification = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to resend verification email');
  }
  return data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send password reset request');
  }
  return data;
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
};
