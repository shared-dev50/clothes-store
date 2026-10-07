import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const fetchAdminCategories = async () => {
  const response = await fetch(`${API_URL}/admin/categories`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch admin categories');
  return response.json();
};

export const fetchAdminProducts = async () => {
  const response = await fetch(`${API_URL}/admin/products`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch admin products');
  return response.json();
};

export const fetchAdminProductById = async (id: string) => {
  const response = await fetch(`${API_URL}/admin/products/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch admin product');
  return response.json();
};

export const createAdminProduct = async (productData: any) => {
  const response = await fetch(`${API_URL}/admin/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(productData),
  });
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
};

export const updateAdminProduct = async (id: string, productData: any) => {
  const response = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(productData),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
};

export const deleteAdminProduct = async (id: string) => {
  const response = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete product');
  return true;
};

export const fetchAdminOrders = async () => {
  const response = await fetch(`${API_URL}/admin/orders`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch admin orders');
  return response.json();
};

export const fetchAdminOrderById = async (id: string) => {
  const response = await fetch(`${API_URL}/admin/orders/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch admin order');
  return response.json();
};

export const updateAdminOrderStatus = async (id: string, status: string) => {
  const response = await fetch(`${API_URL}/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update order status');
  return response.json();
};

export const getCloudinaryConfig = async () => {
  const response = await fetch(`${API_URL}/admin/uploads/cloudinary/signature`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get Cloudinary config');
  }
  
  return response.json();
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
