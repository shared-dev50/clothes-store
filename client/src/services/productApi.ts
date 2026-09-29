import type { Product } from '../types';
import { mockProducts } from '../data/mockProducts';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getProducts = async (category?: string): Promise<Product[]> => {
  await delay(500);
  if (category && category !== 'All') {
    return mockProducts.filter((p) => p.category === category);
  }
  return mockProducts;
};

export const getProductById = async (idOrSlug: string): Promise<Product | undefined> => {
  await delay(400);
  return mockProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
};

export const getFeaturedProducts = async (): Promise<Product[]> => {
  await delay(300);
  return mockProducts.filter((p) => p.featured);
};

export const getNewArrivals = async (): Promise<Product[]> => {
  await delay(300);
  return mockProducts.filter((p) => p.newArrival);
};

export const getCategories = async (): Promise<string[]> => {
  await delay(200);
  const categories = new Set(mockProducts.map((p) => p.category));
  return ['All', ...Array.from(categories)];
};
