import { PrismaClient } from '@prisma/client';
type ProductVariantSeed = {
  color: string | null;
  size: string | null;
  stock: number;
  sku: string;
};

type ProductSeed = {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  variants: ProductVariantSeed[];
  featured: boolean;
  newArrival: boolean;
};

const prisma = new PrismaClient();

const products: ProductSeed[] = [
  // =========================================================
  // WOMEN'S CLOTHING
  // =========================================================
  {
    name: 'Satin Ruched Midi Dress',
    slug: 'satin-ruched-midi-dress',
    description:
      'A sophisticated satin midi dress with a flattering ruched silhouette, designed for evening occasions and special events.',
    price: 6500,
    category: "Women's Clothing",
    images: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Black', size: 'S', stock: 8, sku: 'DR-BK-S' },
      { color: 'Black', size: 'M', stock: 10, sku: 'DR-BK-M' },
      { color: 'Black', size: 'L', stock: 6, sku: 'DR-BK-L' },
      { color: 'Emerald', size: 'M', stock: 5, sku: 'DR-EM-M' },
    ],
    featured: true,
    newArrival: true,
  },
  {
    name: 'Oversized Graphic Tee',
    slug: 'oversized-graphic-tee',
    description:
      'Relaxed oversized cotton T-shirt with a contemporary graphic print and comfortable everyday fit.',
    price: 2800,
    category: "Women's Clothing",
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'White', size: 'S', stock: 12, sku: 'WT-WH-S' },
      { color: 'White', size: 'M', stock: 15, sku: 'WT-WH-M' },
      { color: 'Black', size: 'M', stock: 10, sku: 'WT-BK-M' },
      { color: 'Black', size: 'L', stock: 8, sku: 'WT-BK-L' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // MEN'S CLOTHING
  // =========================================================
  {
    name: 'Premium Oxford Shirt',
    slug: 'premium-oxford-shirt',
    description:
      'A versatile Oxford shirt with a relaxed contemporary fit, suitable for both casual and smart-casual looks.',
    price: 4500,
    category: "Men's Clothing",
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'White', size: 'M', stock: 10, sku: 'OS-WH-M' },
      { color: 'White', size: 'L', stock: 12, sku: 'OS-WH-L' },
      { color: 'Light Blue', size: 'M', stock: 8, sku: 'OS-LB-M' },
      { color: 'Light Blue', size: 'XL', stock: 5, sku: 'OS-LB-XL' },
    ],
    featured: true,
    newArrival: false,
  },
  {
    name: 'Relaxed Cargo Trousers',
    slug: 'relaxed-cargo-trousers',
    description:
      'Relaxed-fit cargo trousers with practical side pockets and a contemporary streetwear silhouette.',
    price: 5500,
    category: "Men's Clothing",
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Olive', size: '30', stock: 8, sku: 'CG-OL-30' },
      { color: 'Olive', size: '32', stock: 12, sku: 'CG-OL-32' },
      { color: 'Olive', size: '34', stock: 8, sku: 'CG-OL-34' },
      { color: 'Black', size: '32', stock: 10, sku: 'CG-BK-32' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // GIRLS' CLOTHING
  // =========================================================
  {
    name: 'Girls Floral Summer Dress',
    slug: 'girls-floral-summer-dress',
    description:
      'A lightweight floral dress designed for comfortable everyday wear and special occasions.',
    price: 3200,
    category: "Girls' Clothing",
    images: [
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Pink', size: '4Y', stock: 6, sku: 'GD-PK-4Y' },
      { color: 'Pink', size: '6Y', stock: 8, sku: 'GD-PK-6Y' },
      { color: 'Pink', size: '8Y', stock: 7, sku: 'GD-PK-8Y' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // BOYS' CLOTHING
  // =========================================================
  {
    name: 'Boys Casual Polo Set',
    slug: 'boys-casual-polo-set',
    description:
      'Comfortable two-piece polo and shorts set designed for everyday wear.',
    price: 3500,
    category: "Boys' Clothing",
    images: [
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Navy', size: '4Y', stock: 6, sku: 'BP-NV-4Y' },
      { color: 'Navy', size: '6Y', stock: 8, sku: 'BP-NV-6Y' },
      { color: 'Navy', size: '8Y', stock: 5, sku: 'BP-NV-8Y' },
    ],
    featured: false,
    newArrival: false,
  },

  // =========================================================
  // WIGS & HAIR
  // =========================================================
  {
    name: 'Body Wave Lace Front Wig',
    slug: 'body-wave-lace-front-wig',
    description:
      'Long body-wave lace front wig designed for a natural-looking finish and versatile styling.',
    price: 18500,
    category: 'Wigs & Hair',
    images: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Natural Black', size: '18 inch', stock: 4, sku: 'WG-BW-18' },
      { color: 'Natural Black', size: '22 inch', stock: 3, sku: 'WG-BW-22' },
    ],
    featured: true,
    newArrival: true,
  },
  {
    name: 'Straight Human Hair Wig',
    slug: 'straight-human-hair-wig',
    description:
      'Smooth straight-style wig with a natural finish suitable for everyday and occasion styling.',
    price: 22000,
    category: 'Wigs & Hair',
    images: [
      'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Natural Black', size: '18 inch', stock: 3, sku: 'WG-ST-18' },
      { color: 'Natural Black', size: '24 inch', stock: 2, sku: 'WG-ST-24' },
    ],
    featured: true,
    newArrival: false,
  },

  // =========================================================
  // WOMEN'S PAJAMAS
  // =========================================================
  {
    name: 'Satin Pajama Set',
    slug: 'satin-pajama-set',
    description:
      'Soft satin pajama set featuring a relaxed button-up top and matching trousers.',
    price: 4500,
    category: "Women's Pajamas",
    images: [
      'https://images.unsplash.com/photo-1578681994506-b8f463449011?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Champagne', size: 'S', stock: 6, sku: 'PJ-CH-S' },
      { color: 'Champagne', size: 'M', stock: 10, sku: 'PJ-CH-M' },
      { color: 'Champagne', size: 'L', stock: 8, sku: 'PJ-CH-L' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // MEN'S PAJAMAS
  // =========================================================
  {
    name: 'Men Cotton Lounge Set',
    slug: 'men-cotton-lounge-set',
    description:
      'Comfortable cotton lounge set designed for sleeping and relaxing at home.',
    price: 4200,
    category: "Men's Pajamas",
    images: [
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Navy', size: 'M', stock: 8, sku: 'MPJ-NV-M' },
      { color: 'Navy', size: 'L', stock: 10, sku: 'MPJ-NV-L' },
      { color: 'Grey', size: 'XL', stock: 6, sku: 'MPJ-GR-XL' },
    ],
    featured: false,
    newArrival: false,
  },

  // =========================================================
  // GIRLS' PAJAMAS
  // =========================================================
  {
    name: 'Girls Printed Pajama Set',
    slug: 'girls-printed-pajama-set',
    description:
      'Soft and comfortable printed pajama set designed for children.',
    price: 2800,
    category: "Girls' Pajamas",
    images: [
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Pink', size: '4Y', stock: 7, sku: 'GP-PK-4Y' },
      { color: 'Pink', size: '6Y', stock: 8, sku: 'GP-PK-6Y' },
      { color: 'Pink', size: '8Y', stock: 5, sku: 'GP-PK-8Y' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // BOYS' PAJAMAS
  // =========================================================
  {
    name: 'Boys Cotton Pajama Set',
    slug: 'boys-cotton-pajama-set',
    description:
      'Soft cotton pajama set designed for comfortable nights and relaxed mornings.',
    price: 2800,
    category: "Boys' Pajamas",
    images: [
      'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Blue', size: '4Y', stock: 7, sku: 'BPJ-BL-4Y' },
      { color: 'Blue', size: '6Y', stock: 8, sku: 'BPJ-BL-6Y' },
      { color: 'Blue', size: '8Y', stock: 6, sku: 'BPJ-BL-8Y' },
    ],
    featured: false,
    newArrival: false,
  },

  // =========================================================
  // HANDBAGS
  // =========================================================
  {
    name: 'Structured Everyday Handbag',
    slug: 'structured-everyday-handbag',
    description:
      'A structured everyday handbag with a spacious interior and versatile design.',
    price: 6500,
    category: 'Handbags',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Black', size: null, stock: 10, sku: 'HB-BK-01' },
      { color: 'Tan', size: null, stock: 7, sku: 'HB-TN-01' },
    ],
    featured: true,
    newArrival: false,
  },
  {
    name: 'Mini Crossbody Bag',
    slug: 'mini-crossbody-bag',
    description:
      'Compact crossbody handbag designed for everyday essentials.',
    price: 3800,
    category: 'Handbags',
    images: [
      'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Black', size: null, stock: 12, sku: 'CB-BK-01' },
      { color: 'Burgundy', size: null, stock: 6, sku: 'CB-BG-01' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // WOMEN'S SHOES
  // =========================================================
  {
    name: 'Minimal Leather Loafers',
    slug: 'minimal-leather-loafers',
    description:
      'Clean and versatile loafers designed to complement both casual and smart outfits.',
    price: 6500,
    category: "Women's Shoes",
    images: [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Black', size: '37', stock: 5, sku: 'WL-BK-37' },
      { color: 'Black', size: '38', stock: 7, sku: 'WL-BK-38' },
      { color: 'Black', size: '39', stock: 6, sku: 'WL-BK-39' },
      { color: 'Tan', size: '38', stock: 4, sku: 'WL-TN-38' },
    ],
    featured: true,
    newArrival: false,
  },

  // =========================================================
  // MEN'S SHOES
  // =========================================================
  {
    name: 'Classic Casual Sneakers',
    slug: 'classic-casual-sneakers',
    description:
      'Clean everyday sneakers designed for comfortable casual wear.',
    price: 7500,
    category: "Men's Shoes",
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'White', size: '40', stock: 5, sku: 'MS-WH-40' },
      { color: 'White', size: '41', stock: 8, sku: 'MS-WH-41' },
      { color: 'White', size: '42', stock: 10, sku: 'MS-WH-42' },
      { color: 'White', size: '43', stock: 7, sku: 'MS-WH-43' },
    ],
    featured: true,
    newArrival: true,
  },

  // =========================================================
  // GIRLS' SHOES
  // =========================================================
  {
    name: 'Girls Mary Jane Shoes',
    slug: 'girls-mary-jane-shoes',
    description:
      'Classic Mary Jane shoes designed for girls, suitable for school and special occasions.',
    price: 3500,
    category: "Girls' Shoes",
    images: [
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Black', size: '28', stock: 5, sku: 'GMJ-BK-28' },
      { color: 'Black', size: '30', stock: 7, sku: 'GMJ-BK-30' },
      { color: 'Black', size: '32', stock: 6, sku: 'GMJ-BK-32' },
    ],
    featured: false,
    newArrival: false,
  },

  // =========================================================
  // BOYS' SHOES
  // =========================================================
  {
    name: 'Boys Casual Sneakers',
    slug: 'boys-casual-sneakers',
    description:
      'Comfortable everyday sneakers designed for active boys.',
    price: 3800,
    category: "Boys' Shoes",
    images: [
      'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Black', size: '30', stock: 5, sku: 'BS-BK-30' },
      { color: 'Black', size: '32', stock: 7, sku: 'BS-BK-32' },
      { color: 'Black', size: '34', stock: 6, sku: 'BS-BK-34' },
    ],
    featured: false,
    newArrival: true,
  },

  // =========================================================
  // WELLNESS / WEIGHT MANAGEMENT
  // =========================================================
  {
    name: 'Daily Wellness Capsules',
    slug: 'daily-wellness-capsules',
    description:
      'A wellness supplement intended to complement a balanced diet and healthy lifestyle.',
    price: 4500,
    category: 'Weight Management',
    images: [
      'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: null, size: null, stock: 20, sku: 'WC-001' },
    ],
    featured: false,
    newArrival: true,
  },

  {
    name: 'Herbal Wellness Tea',
    slug: 'herbal-wellness-tea',
    description:
      'Herbal tea blend intended as part of a balanced wellness routine.',
    price: 2500,
    category: 'Weight Management',
    images: [
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1000&auto=format&fit=crop',
    ],
    variants: [
      { color: null, size: null, stock: 25, sku: 'WT-001' },
    ],
    featured: false,
    newArrival: false,
  },
];

// =========================================================
// CATEGORY STRUCTURE
// =========================================================

const categories = [
  {
    name: 'Clothing',
    slug: 'clothing',
    children: [
      {
        name: "Women's Clothing",
        slug: 'womens-clothing',
      },
      {
        name: "Men's Clothing",
        slug: 'mens-clothing',
      },
      {
        name: "Girls' Clothing",
        slug: 'girls-clothing',
      },
      {
        name: "Boys' Clothing",
        slug: 'boys-clothing',
      },
    ],
  },
  {
    name: 'Wigs & Hair',
    slug: 'wigs-hair',
    children: [],
  },
  {
    name: 'Pajamas',
    slug: 'pajamas',
    children: [
      {
        name: "Women's Pajamas",
        slug: 'womens-pajamas',
      },
      {
        name: "Men's Pajamas",
        slug: 'mens-pajamas',
      },
      {
        name: "Girls' Pajamas",
        slug: 'girls-pajamas',
      },
      {
        name: "Boys' Pajamas",
        slug: 'boys-pajamas',
      },
    ],
  },
  {
    name: 'Handbags',
    slug: 'handbags',
    children: [],
  },
  {
    name: 'Shoes',
    slug: 'shoes',
    children: [
      {
        name: "Women's Shoes",
        slug: 'womens-shoes',
      },
      {
        name: "Men's Shoes",
        slug: 'mens-shoes',
      },
      {
        name: "Girls' Shoes",
        slug: 'girls-shoes',
      },
      {
        name: "Boys' Shoes",
        slug: 'boys-shoes',
      },
    ],
  },
  {
    name: 'Wellness',
    slug: 'wellness',
    children: [
      {
        name: 'Weight Management',
        slug: 'weight-management',
      },
    ],
  },
];

async function main() {
  console.log('Starting HBS Wear database seed...');

  // =========================================================
  // CREATE CATEGORIES
  // =========================================================

  const categoryMap = new Map<string, string>();

  for (const categoryData of categories) {
    const parent = await prisma.category.upsert({
      where: {
        slug: categoryData.slug,
      },
      update: {
        name: categoryData.name,
      },
      create: {
        name: categoryData.name,
        slug: categoryData.slug,
      },
    });

    categoryMap.set(categoryData.name, parent.id);

    for (const childData of categoryData.children) {
      const child = await prisma.category.upsert({
        where: {
          slug: childData.slug,
        },
        update: {
          name: childData.name,
          parentId: parent.id,
        },
        create: {
          name: childData.name,
          slug: childData.slug,
          parentId: parent.id,
        },
      });

      categoryMap.set(childData.name, child.id);
    }
  }

  // =========================================================
  // CREATE PRODUCTS
  // =========================================================

  for (const productData of products) {
    const categoryId = categoryMap.get(productData.category);

    if (!categoryId) {
      throw new Error(
        `Category "${productData.category}" was not found for product "${productData.name}".`
      );
    }

    const product = await prisma.product.upsert({
      where: {
        slug: productData.slug,
      },
      update: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        featured: productData.featured,
        newArrival: productData.newArrival,
        categoryId,
      },
      create: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        featured: productData.featured,
        newArrival: productData.newArrival,
        categoryId,
      },
    });

    // ---------------------------------------------------------
    // Images
    // ---------------------------------------------------------

    // Remove existing images for this product so re-running
    // the seed never creates duplicates.
    await prisma.productImage.deleteMany({
      where: {
        productId: product.id,
      },
    });

    await prisma.productImage.createMany({
      data: productData.images.map((imageUrl, index) => ({
        productId: product.id,
        imageUrl,
        displayOrder: index,
      })),
    });

    // ---------------------------------------------------------
    // Variants
    // ---------------------------------------------------------

    for (const variantData of productData.variants) {
      await prisma.productVariant.upsert({
        where: {
          sku: variantData.sku,
        },
        update: {
          color: variantData.color,
          size: variantData.size,
          stock: variantData.stock,
          productId: product.id,
        },
        create: {
          productId: product.id,
          color: variantData.color,
          size: variantData.size,
          stock: variantData.stock,
          sku: variantData.sku,
        },
      });
    }
  }

  console.log(`Seeded ${products.length} HBS Wear products.`);
  console.log('HBS Wear database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });