import type { Product } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getProducts = async (category?: string): Promise<Product[]> => {
  let url = `${API_URL}/products`;
  if (category && category !== 'All') {
    url += `?category=${encodeURIComponent(category)}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};

export const getProductById = async (idOrSlug: string): Promise<Product | undefined> => {
  const response = await fetch(`${API_URL}/products/${encodeURIComponent(idOrSlug)}`);
  if (!response.ok) {
    if (response.status === 404) return undefined;
    throw new Error('Failed to fetch product');
  }
  return response.json();
};

export const getFeaturedProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_URL}/products?featured=true`);
  if (!response.ok) throw new Error('Failed to fetch featured products');
  return response.json();
};

export const getNewArrivals = async (): Promise<Product[]> => {
  const response = await fetch(`${API_URL}/products?newArrival=true`);
  if (!response.ok) throw new Error('Failed to fetch new arrivals');
  return response.json();
};

export const getCategories = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  const categories: string[] = await response.json();
  return categories.includes('All') ? categories : ['All', ...categories];
};
