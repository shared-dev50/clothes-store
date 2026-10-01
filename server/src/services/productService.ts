import prisma from '../config/db';
import { Prisma } from '@prisma/client';
import { ProductDTO, ProductColor, ProductQueryFilters, ProductWithRelations } from '../types';

const HEX_MAP: Record<string, string> = {
  'Cream': '#F9F8F6',
  'Washed Black': '#2A2A2A',
  'Heather Grey': '#D3D3D3',
  'Dark Navy': '#1C2841',
  'Charcoal': '#36454F',
  'Sage Green': '#8A9A86',
  'Stone': '#E5E2DD',
  'White': '#FFFFFF',
  'Black': '#000000',
  'Tan': '#D2B48C',
  'Light Blue': '#ADD8E6',
  'Vintage Blue': '#4A648C',
  'Forest Green': '#228B22',
  'Navy': '#000080',
  'Oatmeal': '#EAE0C8',
  'Grey': '#808080',
  'Orange': '#FFA500',
  'Emerald': '#50C878',
  'Olive': '#808000',
  'Pink': '#FFC0CB',
  'Natural Black': '#1B1B1B',
  'Champagne': '#F7E7CE',
  'Blue': '#0000FF',
  'Burgundy': '#800020',
};

const mapProductToFrontend = (dbProduct: ProductWithRelations): ProductDTO => {
  const images = [...dbProduct.images]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((img) => img.imageUrl);

  const uniqueColorsMap = new Map<string, ProductColor>();
  const uniqueSizesSet = new Set<string>();
  let totalStock = 0;

  dbProduct.variants.forEach((v) => {
    totalStock += v.stock;

    if (v.size) {
      uniqueSizesSet.add(v.size);
    }

    if (v.color && !uniqueColorsMap.has(v.color)) {
      uniqueColorsMap.set(v.color, {
        name: v.color,
        hex: v.colorHex || HEX_MAP[v.color] || '#000000',
      });
    }
  });

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    slug: dbProduct.slug,
    description: dbProduct.description,
    details: dbProduct.details,
    price: Number(dbProduct.price),
    category: dbProduct.category.name,
    images,
    colors: Array.from(uniqueColorsMap.values()),
    sizes: Array.from(uniqueSizesSet),
    variants: dbProduct.variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      color: v.color,
      size: v.size,
      stock: v.stock,
      sku: v.sku,
    })),
    stock: totalStock,
    featured: dbProduct.featured,
    newArrival: dbProduct.newArrival,
  };
};

export const getProducts = async (filters: ProductQueryFilters): Promise<ProductDTO[]> => {
  const where: Prisma.ProductWhereInput = {};

  if (filters.category && filters.category !== 'All') {
    where.category = {
      OR: [
        { name: filters.category },
        { parent: { name: filters.category } },
      ],
    };
  }

  if (filters.featured === 'true') {
    where.featured = true;
  }

  if (filters.newArrival === 'true') {
    where.newArrival = true;
  }

  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      images: true,
      variants: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return products.map(mapProductToFrontend);
};

export const getProductBySlug = async (slug: string): Promise<ProductDTO | null> => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: true,
      variants: true,
    },
  });

  if (!product) return null;
  return mapProductToFrontend(product);
};

