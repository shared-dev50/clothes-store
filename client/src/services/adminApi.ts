import { useAuthStore } from '../store/authStore';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');

const getHeaders = (token?: string | null) => {
  const currentToken = token ?? useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  };
};

/**
 * Authenticated fetch with automatic token refresh on 401
 */
const adminFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let token = useAuthStore.getState().token;

  const makeRequest = (t: string | null) =>
    fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(t),
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

  let response = await makeRequest(token);

  if (response.status === 401) {
    // Attempt automatic session refresh
    const newToken = await useAuthStore.getState().refreshSession();
    if (newToken) {
      response = await makeRequest(newToken);
    }
  }

  return response;
};

const handleAdminResponse = async (response: Response, defaultError: string) => {
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized: Session expired or invalid token. Please log in again.');
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || defaultError);
  }
  return response.json();
};

export const fetchAdminCategories = async () => {
  const response = await adminFetch('/admin/categories');
  return handleAdminResponse(response, 'Failed to fetch admin categories');
};

export const fetchAdminProducts = async () => {
  const response = await adminFetch('/admin/products');
  return handleAdminResponse(response, 'Failed to fetch admin products');
};

export const fetchAdminProductById = async (id: string) => {
  const response = await adminFetch(`/admin/products/${id}`);
  return handleAdminResponse(response, 'Failed to fetch admin product');
};

export const createAdminProduct = async (productData: any) => {
  const response = await adminFetch('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
  return handleAdminResponse(response, 'Failed to create product');
};

export const updateAdminProduct = async (id: string, productData: any) => {
  const response = await adminFetch(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
  return handleAdminResponse(response, 'Failed to update product');
};

export const deleteAdminProduct = async (id: string) => {
  const response = await adminFetch(`/admin/products/${id}`, {
    method: 'DELETE',
  });
  return handleAdminResponse(response, 'Failed to delete product');
};

export const fetchAdminOrders = async () => {
  const response = await adminFetch('/admin/orders');
  return handleAdminResponse(response, 'Failed to fetch admin orders');
};

export const fetchAdminOrderById = async (id: string) => {
  const response = await adminFetch(`/admin/orders/${id}`);
  return handleAdminResponse(response, 'Failed to fetch admin order');
};

export const updateAdminOrderStatus = async (id: string, status: string) => {
  const response = await adminFetch(`/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  return handleAdminResponse(response, 'Failed to update order status');
};

export const getCloudinaryConfig = async () => {
  const response = await adminFetch('/admin/uploads/cloudinary/signature', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return handleAdminResponse(response, 'Failed to get Cloudinary config');
};

export const generateCloudinarySignature = async (callback: Function, paramsToSign: any) => {
  try {
    const response = await adminFetch('/admin/uploads/cloudinary/signature', {
      method: 'POST',
      body: JSON.stringify(paramsToSign),
    });

    if (!response.ok) {
      throw new Error('Failed to get signature');
    }

    const data = await response.json();
    callback(data.signature);
  } catch (err) {
    console.error('Error generating signature:', err);
  }
};

export const fetchHomepageSettingsAdmin = async () => {
  const response = await adminFetch('/admin/homepage-settings');
  return handleAdminResponse(response, 'Failed to fetch homepage settings');
};

export const updateHomepageSettingsAdmin = async (data: any) => {
  const response = await adminFetch('/admin/homepage-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const updated = await handleAdminResponse(response, 'Failed to update homepage settings');
  try {
    if (typeof window !== 'undefined' && updated) {
      localStorage.setItem('hbs_homepage_settings', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to cache updated homepage settings:', err);
  }
  return updated;
};
