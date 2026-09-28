import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mockProducts = [
  {
    id: 'p-1',
    name: 'Oversized Heavyweight Tee',
    slug: 'oversized-heavyweight-tee',
    description: 'Crafted from 300gsm luxury cotton, this oversized tee offers a structured, boxy fit perfect for modern streetwear.',
    price: 3500,
    category: 'T-Shirts',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-1-c-s', color: 'Cream', size: 'S', stock: 10, sku: 'TEE-CR-S' },
      { id: 'v-1-c-m', color: 'Cream', size: 'M', stock: 15, sku: 'TEE-CR-M' },
      { id: 'v-1-c-l', color: 'Cream', size: 'L', stock: 0, sku: 'TEE-CR-L' },
      { id: 'v-1-b-m', color: 'Washed Black', size: 'M', stock: 20, sku: 'TEE-WB-M' },
    ],
    featured: true,
    newArrival: true,
  },
  {
    id: 'p-2',
    name: 'Boxy Washed Hoodie',
    slug: 'boxy-washed-hoodie',
    description: 'Our signature heavyweight hoodie featuring a dropped shoulder design, slightly cropped length, and a vintage wash finish.',
    price: 6500,
    category: 'Hoodies',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-2-b-m', color: 'Washed Black', size: 'M', stock: 5, sku: 'HD-WB-M' },
      { id: 'v-2-b-l', color: 'Washed Black', size: 'L', stock: 12, sku: 'HD-WB-L' },
    ],
    featured: true,
    newArrival: false,
  },
  {
    id: 'p-3',
    name: 'Tailored Wide Leg Trousers',
    slug: 'tailored-wide-leg-trousers',
    description: 'Contemporary wide-leg trousers designed for a relaxed yet refined silhouette. Features single pleats and a high-rise waist.',
    price: 8500,
    category: 'Trousers',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-3-n-30', color: 'Dark Navy', size: '30', stock: 8, sku: 'TR-DN-30' },
      { id: 'v-3-n-32', color: 'Dark Navy', size: '32', stock: 14, sku: 'TR-DN-32' },
      { id: 'v-3-c-32', color: 'Charcoal', size: '32', stock: 0, sku: 'TR-CH-32' },
    ],
    featured: false,
    newArrival: true,
  },
  {
    id: 'p-4',
    name: 'Minimalist Utility Jacket',
    slug: 'minimalist-utility-jacket',
    description: 'A versatile layer constructed from durable cotton canvas. Features oversized patch pockets and a clean hidden placket.',
    price: 12500,
    category: 'Jackets',
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520975954732-57dd22299614?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-4-s-m', color: 'Sage Green', size: 'M', stock: 4, sku: 'JK-SG-M' },
      { id: 'v-4-s-l', color: 'Sage Green', size: 'L', stock: 6, sku: 'JK-SG-L' },
    ],
    featured: true,
    newArrival: true,
  },
  {
    id: 'p-5',
    name: 'Essential Ribbed Tank',
    slug: 'essential-ribbed-tank',
    description: 'A daily essential cut from premium ribbed cotton with a flattering fitted silhouette and subtle branding.',
    price: 2000,
    category: 'T-Shirts',
    images: [
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-5-w-m', color: 'White', size: 'M', stock: 25, sku: 'TK-WH-M' },
    ],
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-6',
    name: 'Structured Leather Tote',
    slug: 'structured-leather-tote',
    description: 'An everyday essential tote crafted from premium vegan leather. Spacious enough for a 15" laptop.',
    price: 9500,
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-6-b-os', color: 'Black', size: 'One Size', stock: 8, sku: 'BG-BK-OS' },
    ],
    featured: true,
    newArrival: false,
  },
  {
    id: 'p-7',
    name: 'Classic Oxford Shirt',
    slug: 'classic-oxford-shirt',
    description: 'A timeless staple, cut from heavy oxford cloth that softens beautifully over time. Relaxed fit.',
    price: 5500,
    category: 'Shirts',
    images: [
      'https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-7-b-m', color: 'Light Blue', size: 'M', stock: 12, sku: 'SH-LB-M' },
      { id: 'v-7-w-l', color: 'White', size: 'L', stock: 10, sku: 'SH-WH-L' }
    ],
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-8',
    name: 'Straight Leg Denim',
    slug: 'straight-leg-denim',
    description: 'Vintage-inspired straight leg jeans washed to a perfect medium blue fade. Made from rigid 14oz denim.',
    price: 7800,
    category: 'Trousers',
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1604176354204-9268737828e4?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-8-v-32', color: 'Vintage Blue', size: '32', stock: 18, sku: 'DN-VB-32' },
      { id: 'v-8-v-34', color: 'Vintage Blue', size: '34', stock: 15, sku: 'DN-VB-34' }
    ],
    featured: false,
    newArrival: true,
  },
  {
    id: 'p-9',
    name: 'Signature Cap',
    slug: 'signature-cap',
    description: 'Classic 6-panel baseball cap in washed cotton twill with subtle tonal embroidery.',
    price: 2500,
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-9-f-os', color: 'Forest Green', size: 'One Size', stock: 30, sku: 'CP-FG-OS' },
    ],
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-10',
    name: 'Cropped Wool Jacket',
    slug: 'cropped-wool-jacket',
    description: 'A sharp, modern silhouette. This cropped jacket is fully lined and crafted from a heavy wool blend.',
    price: 14500,
    category: 'Jackets',
    images: [
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-10-c-m', color: 'Charcoal', size: 'M', stock: 5, sku: 'WJ-CH-M' },
    ],
    featured: false,
    newArrival: true,
  },
  {
    id: 'p-11',
    name: 'Knit Polo',
    slug: 'knit-polo',
    description: 'A textured knit polo shirt that bridges the gap between casual and dressed up. Extremely soft hand-feel.',
    price: 4800,
    category: 'Shirts',
    images: [
      'https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-11-o-m', color: 'Oatmeal', size: 'M', stock: 12, sku: 'KP-OT-M' },
    ],
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-12',
    name: 'Chunky Knit Beanie',
    slug: 'chunky-knit-beanie',
    description: 'Stay warm in style. A heavy ribbed beanie made from a soft wool blend.',
    price: 2200,
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { id: 'v-12-g-os', color: 'Grey', size: 'One Size', stock: 40, sku: 'BN-GR-OS' },
    ],
    featured: false,
    newArrival: false,
  }
];

async function main() {
  console.log('Start seeding...');

  // Create categories
  const categoriesToCreate = Array.from(new Set(mockProducts.map(p => p.category)));
  const categoryMap = new Map<string, string>();

  for (const catName of categoriesToCreate) {
    const category = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: {
        name: catName,
        slug: catName.toLowerCase().replace(/ /g, '-'),
      },
    });
    categoryMap.set(catName, category.id);
  }

  // Create products
  for (const product of mockProducts) {
    const categoryId = categoryMap.get(product.category)!;

    const createdProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        categoryId: categoryId,
        featured: product.featured,
        newArrival: product.newArrival,
      },
    });

    // Images
    for (let i = 0; i < product.images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          imageUrl: product.images[i],
          displayOrder: i,
        },
      });
    }

    // Variants
    for (const variant of product.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {},
        create: {
          id: variant.id,
          productId: createdProduct.id,
          color: variant.color,
          size: variant.size,
          stock: variant.stock,
          sku: variant.sku,
        },
      });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
