import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
  const response = await fetch(`${API_URL}/admin/categories`, { headers: getHeaders() });
  return handleAdminResponse(response, 'Failed to fetch admin categories');
};

export const fetchAdminProducts = async () => {
  const response = await fetch(`${API_URL}/admin/products`, { headers: getHeaders() });
  return handleAdminResponse(response, 'Failed to fetch admin products');
};

export const fetchAdminProductById = async (id: string) => {
  const response = await fetch(`${API_URL}/admin/products/${id}`, { headers: getHeaders() });
  return handleAdminResponse(response, 'Failed to fetch admin product');
};

export const createAdminProduct = async (productData: any) => {
  const response = await fetch(`${API_URL}/admin/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(productData),
  });
  return handleAdminResponse(response, 'Failed to create product');
};

export const updateAdminProduct = async (id: string, productData: any) => {
  const response = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(productData),
  });
  return handleAdminResponse(response, 'Failed to update product');
};

export const deleteAdminProduct = async (id: string) => {
  const response = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Unauthorized: Session expired or invalid token. Please log in again.');
  }
  if (!response.ok) throw new Error('Failed to delete product');
  return true;
};

export const fetchAdminOrders = async () => {
  const response = await fetch(`${API_URL}/admin/orders`, { headers: getHeaders() });
  return handleAdminResponse(response, 'Failed to fetch admin orders');
};

export const fetchAdminOrderById = async (id: string) => {
  const response = await fetch(`${API_URL}/admin/orders/${id}`, { headers: getHeaders() });
  return handleAdminResponse(response, 'Failed to fetch admin order');
};

export const updateAdminOrderStatus = async (id: string, status: string) => {
  const response = await fetch(`${API_URL}/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  return handleAdminResponse(response, 'Failed to update order status');
};

export const getCloudinaryConfig = async () => {
  const response = await fetch(`${API_URL}/admin/uploads/cloudinary/signature`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  });
  return handleAdminResponse(response, 'Failed to get Cloudinary config');
};

export const generateCloudinarySignature = async (callback: Function, paramsToSign: any) => {
  try {
    const response = await fetch(`${API_URL}/admin/uploads/cloudinary/signature`, {
      method: 'POST',
      headers: getHeaders(),
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
  const response = await fetch(`${API_URL}/admin/homepage-settings`, {
    headers: getHeaders(),
  });
  return handleAdminResponse(response, 'Failed to fetch homepage settings');
};

export const updateHomepageSettingsAdmin = async (data: any) => {
  const response = await fetch(`${API_URL}/admin/homepage-settings`, {
    method: 'PUT',
    headers: getHeaders(),
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

