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

export const uploadImageToCloudinary = async (file: File) => {
  // 1. Get signature from backend
  const sigResponse = await fetch(`${API_URL}/admin/uploads/cloudinary/signature`, {
    method: 'POST',
    headers: getHeaders(),
  });
  
  if (!sigResponse.ok) {
    const err = await sigResponse.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get upload signature');
  }

  const { timestamp, signature, cloudName, apiKey, folder } = await sigResponse.json();

  // 2. Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    const err = await uploadResponse.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload image to Cloudinary');
  }

  const uploadData = await uploadResponse.json();
  return uploadData.secure_url;
};
