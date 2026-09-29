import prisma from '../config/db';

const mapProductToFrontend = (dbProduct: any) => {
  const images = dbProduct.images.sort((a: any, b: any) => a.displayOrder - b.displayOrder).map((img: any) => img.imageUrl);

  // Extract unique colors and sizes from variants
  const uniqueColorsMap = new Map();
  const uniqueSizesSet = new Set<string>();
  let totalStock = 0;

  dbProduct.variants.forEach((v: any) => {
    totalStock += v.stock;
    uniqueSizesSet.add(v.size);
    if (!uniqueColorsMap.has(v.color)) {
      const hexMap: Record<string, string> = {
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
        'Orange': '#FFA500'
      };

      uniqueColorsMap.set(v.color, {
        name: v.color,
        hex: hexMap[v.color] || '#000000'
      });
    }
  });

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    slug: dbProduct.slug,
    description: dbProduct.description,
    details: [],
    price: dbProduct.price,
    category: dbProduct.category.name,
    images: images,
    colors: Array.from(uniqueColorsMap.values()),
    sizes: Array.from(uniqueSizesSet),
    variants: dbProduct.variants,
    stock: totalStock,
    featured: dbProduct.featured,
    newArrival: dbProduct.newArrival
  };
};

export const getProducts = async (filters: { category?: string, featured?: string, newArrival?: string, search?: string }) => {
  const where: any = {};

  if (filters.category && filters.category !== 'All') {
    where.category = { name: filters.category };
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
    }
  });

  return products.map(mapProductToFrontend);
};

export const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: true,
      variants: true,
    }
  });

  if (!product) return null;
  return mapProductToFrontend(product);
};
