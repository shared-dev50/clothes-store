import type { Product, HomepageSettings } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawApiUrl.replace(/\/+$/, '');

export const getProducts = async (category?: string): Promise<Product[]> => {
  let url = `${API_URL}/products`;
  if (category && category !== 'All') {
    if (category.toLowerCase() === 'new') {
      url += `?newArrival=true`;
    } else {
      url += `?category=${encodeURIComponent(category)}`;
    }
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

const HOMEPAGE_SETTINGS_CACHE_KEY = 'hbs_homepage_settings';

export const getCachedHomepageSettings = (): HomepageSettings | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const cached = localStorage.getItem(HOMEPAGE_SETTINGS_CACHE_KEY);
    if (!cached) return undefined;
    const parsed = JSON.parse(cached);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
      return parsed as HomepageSettings;
    }
  } catch (err) {
    console.warn('Failed to parse cached homepage settings:', err);
  }
  return undefined;
};

export const setCachedHomepageSettings = (settings: HomepageSettings | null | undefined): void => {
  if (typeof window === 'undefined') return;
  try {
    if (settings) {
      localStorage.setItem(HOMEPAGE_SETTINGS_CACHE_KEY, JSON.stringify(settings));
    } else {
      localStorage.removeItem(HOMEPAGE_SETTINGS_CACHE_KEY);
    }
  } catch (err) {
    console.warn('Failed to cache homepage settings:', err);
  }
};

export const clearCachedHomepageSettings = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HOMEPAGE_SETTINGS_CACHE_KEY);
  } catch (err) {
    console.warn('Failed to clear cached homepage settings:', err);
  }
};

export const getHomepageSettings = async (): Promise<HomepageSettings> => {
  const response = await fetch(`${API_URL}/homepage-settings`);
  if (!response.ok) throw new Error('Failed to fetch homepage settings');
  const data: HomepageSettings = await response.json();
  setCachedHomepageSettings(data);
  return data;
};

