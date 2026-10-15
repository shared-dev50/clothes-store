import { useAuthStore } from '../store/authStore';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');

export interface OrderItemPayload {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  county: string;
  deliveryNotes?: string;
  items: OrderItemPayload[];
  replaceOrderNumber?: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = useAuthStore.getState().token;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const createOrder = async (payload: CreateOrderPayload) => {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create order');
  }

  const data = await response.json();
  if (data.guestAccessToken && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(`guest_token_${data.orderNumber}`, data.guestAccessToken);
    } catch {}
  }

  return data;
};

export const getOrder = async (orderNumber: string, guestToken?: string, email?: string) => {
  const token =
    guestToken ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`guest_token_${orderNumber}`) : null);

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  if (token) {
    headers['x-guest-token'] = token;
  }

  let url = `${API_URL}/orders/${orderNumber}`;
  if (!token && email) {
    url += `?email=${encodeURIComponent(email)}`;
  }

  const response = await fetch(url, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch order');
  }

  return response.json();
};

export const initiateMpesa = async (orderNumber: string, phoneNumber: string) => {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`guest_token_${orderNumber}`) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
  if (token) headers['x-guest-token'] = token;

  const response = await fetch(`${API_URL}/payments/mpesa/stk-push`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ orderNumber, phoneNumber })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to initiate M-Pesa payment');
  }
  return response.json();
};

export const createStripePayment = async (orderNumber: string) => {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`guest_token_${orderNumber}`) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
  if (token) headers['x-guest-token'] = token;

  const response = await fetch(`${API_URL}/payments/stripe/create`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ orderNumber })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create Stripe payment');
  }
  return response.json();
};

export const getPaymentStatus = async (orderNumber: string, guestToken?: string) => {
  const token =
    guestToken ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`guest_token_${orderNumber}`) : null);

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  if (token) {
    headers['x-guest-token'] = token;
  }

  const response = await fetch(`${API_URL}/payments/order/${orderNumber}/status`, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch payment status');
  }
  return response.json();
};

export const getStripeConfig = async (): Promise<{ publishableKey: string }> => {
  const response = await fetch(`${API_URL}/payments/stripe/config`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    return { publishableKey: '' };
  }
  return response.json();
};

export const cancelOrder = async (orderNumber: string, guestToken?: string) => {
  const token =
    guestToken ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`guest_token_${orderNumber}`) : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
  if (token) {
    headers['x-guest-token'] = token;
  }

  const response = await fetch(`${API_URL}/orders/${orderNumber}/cancel`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to cancel order');
  }
  return response.json();
};

export interface CustomerOrderItem {
  id?: string;
  productName: string;
  variantInfo?: string | null;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
}

export interface CustomerOrder {
  orderNumber: string;
  createdAt: string;
  subtotal: number | string;
  deliveryFee: number | string;
  total: number | string;
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  county: string;
  deliveryNotes?: string | null;
  items: CustomerOrderItem[];
}

/**
 * Retrieve authenticated customer's order history
 */
export const getMyOrders = async (): Promise<CustomerOrder[]> => {
  let token = useAuthStore.getState().token;

  const fetchWithToken = (t: string | null) =>
    fetch(`${API_URL}/orders/my-orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      credentials: 'include',
    });

  let response = await fetchWithToken(token);

  if (response.status === 401) {
    // Attempt session refresh if token expired
    const newToken = await useAuthStore.getState().refreshSession();
    if (newToken) {
      response = await fetchWithToken(newToken);
    }
  }

  if (response.status === 401) {
    throw new Error('Please log in to view your orders.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch your orders');
  }

  return response.json();
};

