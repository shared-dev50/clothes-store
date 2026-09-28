export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
  sku: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
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
  variants: ProductVariant[];
  stock: number;
  featured: boolean;
  newArrival: boolean;
}

export interface CartItem {
  id: string; // usually variant.id or product.id + variant combo
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
  image: string;
}
