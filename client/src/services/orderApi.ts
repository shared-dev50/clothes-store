const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const createOrder = async (payload: CreateOrderPayload) => {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create order');
  }

  return response.json();
};

export const getOrder = async (orderNumber: string) => {
  const response = await fetch(`${API_URL}/orders/${orderNumber}`, {
    headers: {
      ...getAuthHeaders(),
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch order');
  }

  return response.json();
};

export const initiateMpesa = async (orderNumber: string, phoneNumber: string) => {
  const response = await fetch(`${API_URL}/payments/mpesa/stk-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ orderNumber, phoneNumber })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to initiate M-Pesa payment');
  }
  return response.json();
};

export const createStripePayment = async (orderNumber: string) => {
  const response = await fetch(`${API_URL}/payments/stripe/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ orderNumber })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create Stripe payment');
  }
  return response.json();
};

export const getPaymentStatus = async (orderNumber: string) => {
  const response = await fetch(`${API_URL}/payments/order/${orderNumber}/status`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch payment status');
  }
  return response.json();
};
