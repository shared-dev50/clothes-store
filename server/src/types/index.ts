import { Prisma } from '@prisma/client';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  color: string | null;
  size: string | null;
  stock: number;
  sku: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  details: string[];
  price: number;
  category: string;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  variants: ProductVariantDTO[];
  stock: number;
  featured: boolean;
  newArrival: boolean;
}

export interface ProductQueryFilters {
  category?: string;
  featured?: string;
  newArrival?: string;
  search?: string;
}

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
    variants: true;
  };
}>;
