import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categoriesData = [
  {
    name: 'Clothing',
    slug: 'clothing',
    children: [
      { name: "Women's Clothing", slug: 'womens-clothing' },
      { name: "Men's Clothing", slug: 'mens-clothing' },
      { name: "Girls' Clothing", slug: 'girls-clothing' },
      { name: "Boys' Clothing", slug: 'boys-clothing' },
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
      { name: "Women's Pajamas", slug: 'womens-pajamas' },
      { name: "Men's Pajamas", slug: 'mens-pajamas' },
      { name: "Girls' Pajamas", slug: 'girls-pajamas' },
      { name: "Boys' Pajamas", slug: 'boys-pajamas' },
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
      { name: "Women's Shoes", slug: 'womens-shoes' },
      { name: "Men's Shoes", slug: 'mens-shoes' },
      { name: "Girls' Shoes", slug: 'girls-shoes' },
      { name: "Boys' Shoes", slug: 'boys-shoes' },
    ],
  },
  {
    name: 'Wellness',
    slug: 'wellness',
    children: [
      { name: 'Weight Management', slug: 'weight-management' },
    ],
  },
];

const productsData = [
  // ================== CLOTHING ==================
  {
    name: "Women's Satin Ruched Midi Dress",
    slug: 'womens-satin-ruched-midi-dress',
    description: 'A sophisticated satin midi dress with a flattering ruched silhouette, designed for evening occasions and special events.',
    details: ['Premium Satin', 'Ruched detailing', 'Midi length', 'Concealed zip fastening'],
    price: 6500,
    category: "Women's Clothing",
    images: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Emerald', colorHex: '#50C878', size: 'S', stock: 15, sku: 'DR-EM-S' },
      { color: 'Emerald', colorHex: '#50C878', size: 'M', stock: 20, sku: 'DR-EM-M' },
      { color: 'Black', colorHex: '#000000', size: 'M', stock: 12, sku: 'DR-BK-M' },
    ],
    featured: true,
    newArrival: true,
  },
  {
    name: "Men's Premium Oxford Shirt",
    slug: 'mens-premium-oxford-shirt',
    description: 'A versatile Oxford shirt with a relaxed contemporary fit, suitable for both casual and smart-casual looks.',
    details: ['100% Cotton Oxford', 'Button-down collar', 'Relaxed fit', 'Machine washable'],
    price: 4500,
    category: "Men's Clothing",
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Light Blue', colorHex: '#ADD8E6', size: 'M', stock: 10, sku: 'OS-LB-M' },
      { color: 'Light Blue', colorHex: '#ADD8E6', size: 'L', stock: 18, sku: 'OS-LB-L' },
      { color: 'White', colorHex: '#FFFFFF', size: 'L', stock: 25, sku: 'OS-WH-L' },
    ],
    featured: true,
    newArrival: false,
  },
  {
    name: 'Girls Floral Summer Dress',
    slug: 'girls-floral-summer-dress',
    description: 'A lightweight floral dress designed for comfortable everyday wear and special occasions.',
    details: ['100% Cotton', 'Floral print', 'Sleeveless', 'A-line shape'],
    price: 3200,
    category: "Girls' Clothing",
    images: [
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Pink', colorHex: '#FFC0CB', size: '4Y', stock: 5, sku: 'GD-PK-4Y' },
      { color: 'Pink', colorHex: '#FFC0CB', size: '6Y', stock: 8, sku: 'GD-PK-6Y' },
    ],
    featured: false,
    newArrival: true,
  },
  {
    name: 'Boys Casual Polo Set',
    slug: 'boys-casual-polo-set',
    description: 'Comfortable two-piece polo and shorts set designed for everyday wear.',
    details: ['Cotton blend', 'Polo shirt', 'Matching shorts', 'Elastic waistband'],
    price: 3500,
    category: "Boys' Clothing",
    images: [
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Navy', colorHex: '#000080', size: '4Y', stock: 6, sku: 'BP-NV-4Y' },
      { color: 'Navy', colorHex: '#000080', size: '8Y', stock: 10, sku: 'BP-NV-8Y' },
    ],
    featured: false,
    newArrival: false,
  },

  // ================== WIGS & HAIR ==================
  {
    name: 'Brazilian Body Wave Lace Front',
    slug: 'brazilian-body-wave-lace-front',
    description: 'Premium human hair wig with a natural body wave texture and invisible lace front.',
    details: ['100% Human Hair', '13x4 Lace Front', 'Pre-plucked hairline', 'Can be dyed and bleached'],
    price: 15000,
    category: "Wigs & Hair",
    images: [
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=800&auto=format&fit=crop',
    ],
    variants: [
      { color: 'Natural Black', colorHex: '#1B1B1B', size: '18"', stock: 6, sku: 'WG-BW-18' },
      { color: 'Natural Black', colorHex: '#1B1B1B', size: '22"', stock: 4, sku: 'WG-BW-22' },
    ],
    featured: true,
    newArrival: true,
  },

  // ================== PAJAMAS ==================
  {
    name: "Women's Silk Sleepwear Set",
    slug: 'womens-silk-sleepwear-set',
    description: 'Luxurious two-piece silk pajama set for comfortable and stylish lounging.',
    details: ['100% Mulberry Silk', 'Button-up top', 'Drawstring pants', 'Hypoallergenic'],
    price: 7500,
    category: "Women's Pajamas",
    images: [
      'https://images.unsplash.com/photo-1766056278825-55168658f120?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8d29tZW5zJTIwc2lsayUyMHNsZWVwd2VhcnxlbnwwfHwwfHx8MA%3D%3D'
    ],
    variants: [
      { color: 'Champagne', colorHex: '#F7E7CE', size: 'S', stock: 12, sku: 'PJ-WP-S' },
      { color: 'Champagne', colorHex: '#F7E7CE', size: 'M', stock: 15, sku: 'PJ-WP-M' },
    ],
    featured: false,
    newArrival: false,
  },
  {
    name: "Men's Classic Cotton Pajama Set",
    slug: 'mens-classic-cotton-pajama-set',
    description: 'Breathable and comfortable cotton pajama set for men.',
    details: ['100% Cotton', 'Classic fit', 'Chest pocket', 'Button fly'],
    price: 4000,
    category: "Men's Pajamas",
    images: [
      'https://plus.unsplash.com/premium_photo-1708275672426-7297a81c1306?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWVucyUyMGNvdHRvbiUyMHB5amFtYXxlbnwwfHwwfHx8MA%3D%3D'
    ],
    variants: [
      { color: 'Navy', colorHex: '#000080', size: 'M', stock: 20, sku: 'PJ-MP-M' },
      { color: 'Navy', colorHex: '#000080', size: 'L', stock: 20, sku: 'PJ-MP-L' },
    ],
    featured: false,
    newArrival: false,
  },
  {
    name: 'Girls Printed Pajamas',
    slug: 'girls-printed-pajamas',
    description: 'Cute and comfortable printed pajama set for girls.',
    details: ['Cotton blend', 'Fun print', 'Ribbed cuffs'],
    price: 2500,
    category: "Girls' Pajamas",
    images: [
      'https://images.unsplash.com/photo-1787688232703-3d336b634683?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Z2lybHMlMjBwcmludGVkJTIwcHlqYW1hfGVufDB8fDB8fHww'
    ],
    variants: [
      { color: 'Pink', colorHex: '#FFC0CB', size: '6Y', stock: 15, sku: 'PJ-GP-6Y' },
      { color: 'Pink', colorHex: '#FFC0CB', size: '8Y', stock: 10, sku: 'PJ-GP-8Y' },
    ],
    featured: false,
    newArrival: true,
  },
  {
    name: 'Boys Superhero Pajamas',
    slug: 'boys-superhero-pajamas',
    description: 'Comfortable superhero-themed pajama set for boys.',
    details: ['Cotton blend', 'Superhero print', 'Snug fit'],
    price: 2500,
    category: "Boys' Pajamas",
    images: [
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Blue', colorHex: '#0000FF', size: '6Y', stock: 12, sku: 'PJ-BP-6Y' },
      { color: 'Blue', colorHex: '#0000FF', size: '10Y', stock: 8, sku: 'PJ-BP-10Y' },
    ],
    featured: false,
    newArrival: false,
  },

  // ================== HANDBAGS ==================
  {
    name: 'Leather Crossbody Bag',
    slug: 'leather-crossbody-bag',
    description: 'Elegant genuine leather crossbody bag perfect for everyday use.',
    details: ['Genuine Leather', 'Adjustable strap', 'Gold-tone hardware', 'Interior zip pocket'],
    price: 8500,
    category: 'Handbags',
    images: [
      'https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Black', colorHex: '#000000', size: null, stock: 5, sku: 'HB-CB-BLK' },
      { color: 'Tan', colorHex: '#D2B48C', size: null, stock: 8, sku: 'HB-CB-TAN' },
    ],
    featured: true,
    newArrival: true,
  },

  // ================== SHOES ==================
  {
    name: "Women's Classic Pumps",
    slug: 'womens-classic-pumps',
    description: 'Timeless pointed-toe pumps suitable for office and formal wear.',
    details: ['Faux Suede', '3-inch heel', 'Cushioned insole'],
    price: 4500,
    category: "Women's Shoes",
    images: [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Black', colorHex: '#000000', size: '37', stock: 10, sku: 'SH-WP-37' },
      { color: 'Black', colorHex: '#000000', size: '38', stock: 8, sku: 'SH-WP-38' },
    ],
    featured: false,
    newArrival: false,
  },
  {
    name: "Men's Leather Loafers",
    slug: 'mens-leather-loafers',
    description: 'Comfortable slip-on leather loafers for a smart-casual look.',
    details: ['Genuine Leather', 'Slip-on style', 'Rubber sole'],
    price: 6500,
    category: "Men's Shoes",
    images: [
      'https://images.unsplash.com/photo-1784822041007-a2083ecb1b37?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fG1lbnMlMjBsb2FmZXJzfGVufDB8fDB8fHww'
    ],
    variants: [
      { color: 'Tan', colorHex: '#D2B48C', size: '42', stock: 10, sku: 'SH-ML-42' },
      { color: 'Tan', colorHex: '#D2B48C', size: '43', stock: 12, sku: 'SH-ML-43' },
    ],
    featured: true,
    newArrival: false,
  },
  {
    name: 'Girls Sparkle Sneakers',
    slug: 'girls-sparkle-sneakers',
    description: 'Fun and sparkly sneakers with easy hook-and-loop closure.',
    details: ['Sparkle finish', 'Hook-and-loop strap', 'Padded collar'],
    price: 3000,
    category: "Girls' Shoes",
    images: [
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=800&auto=format&fit=crop'
    ],
    variants: [
      { color: 'Pink', colorHex: '#FFC0CB', size: '30', stock: 12, sku: 'SH-GS-30' },
      { color: 'Pink', colorHex: '#FFC0CB', size: '32', stock: 8, sku: 'SH-GS-32' },
    ],
    featured: false,
    newArrival: true,
  },
  {
    name: 'Boys Running Shoes',
    slug: 'boys-running-shoes',
    description: 'Lightweight and durable running shoes for active boys.',
    details: ['Breathable mesh', 'Durable sole', 'Lace-up'],
    price: 3500,
    category: "Boys' Shoes",
    images: [
      'https://images.unsplash.com/photo-1620790458588-c6c4a0d68a84?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGJveXMlMjBydW5uaW5nJTIwc2hvZXN8ZW58MHx8MHx8fDA%3D'
    ],
    variants: [
      { color: 'Blue', colorHex: '#0000FF', size: '32', stock: 15, sku: 'SH-BS-32' },
      { color: 'Blue', colorHex: '#0000FF', size: '34', stock: 10, sku: 'SH-BS-34' },
    ],
    featured: false,
    newArrival: false,
  },

  // ================== WELLNESS ==================
  {
    name: 'Detox Tea Blend',
    slug: 'detox-tea-blend',
    description: 'A natural herbal tea blend to support weight management and wellness.',
    details: ['Organic ingredients', '28-day supply', 'Caffeine-free', 'Promotes healthy digestion'],
    price: 2500,
    category: 'Weight Management',
    images: [
      'https://images.unsplash.com/photo-1596344084757-b83f2081da8b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZGV0b3glMjB0ZWElMjBibGVuZHxlbnwwfHwwfHx8MA%3D%3D'
    ],
    variants: [
      { color: null, colorHex: null, size: null, stock: 50, sku: 'WL-DT-28' },
    ],
    featured: true,
    newArrival: true,
  }
];

async function main() {
  console.log('Starting HBS Wear database seed...');
  console.log('Clearing existing data deterministically...');

  // 1. SAFELY CLEAR EXISTING DATA
  // 1. SAFELY CLEAR EXISTING DATA
  await prisma.$transaction([
    prisma.productVariant.deleteMany({}),
    prisma.productImage.deleteMany({}),
    prisma.product.deleteMany({}),
    prisma.category.deleteMany({ where: { parentId: { not: null } } }),
    prisma.category.deleteMany({ where: { parentId: null } }),
  ]);
  console.log('Existing data cleared. Seeding real HBS Wear catalogue...');

  // 2. CREATE CATEGORIES
  const categoryMap = new Map<string, string>();

  for (const categoryData of categoriesData) {
    const parent = await prisma.category.create({
      data: { name: categoryData.name, slug: categoryData.slug },
    });
    categoryMap.set(categoryData.name, parent.id);

    for (const childData of categoryData.children) {
      const child = await prisma.category.create({
        data: { name: childData.name, slug: childData.slug, parentId: parent.id },
      });
      categoryMap.set(childData.name, child.id);
    }
  }

  // 3. CREATE PRODUCTS
  let productsCreated = 0;
  let variantsCreated = 0;

  for (const productData of productsData) {
    const categoryId = categoryMap.get(productData.category);

    if (!categoryId) {
      throw new Error(`Category "${productData.category}" was not found for product "${productData.name}".`);
    }

    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        details: productData.details,
        price: productData.price,
        featured: productData.featured,
        newArrival: productData.newArrival,
        categoryId,
      },
    });

    // 4. CREATE IMAGES
    const imageRecords = productData.images.map((imageUrl, index) => ({
      productId: product.id,
      imageUrl,
      displayOrder: index,
    }));
    await prisma.productImage.createMany({
      data: imageRecords,
    });

    // 5. CREATE VARIANTS
    for (const variantData of productData.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          color: variantData.color,
          colorHex: variantData.colorHex,
          size: variantData.size,
          stock: variantData.stock,
          sku: variantData.sku,
        },
      });
      variantsCreated++;
    }

    productsCreated++;
  }

  console.log(`\nSeed Summary:`);
  console.log(`- Categories (Root + Sub): ${categoriesData.length + categoriesData.reduce((acc, cat) => acc + cat.children.length, 0)}`);
  console.log(`- Products: ${productsCreated}`);
  console.log(`- Variants: ${variantsCreated}`);
  // 6. SETUP INITIAL ADMIN
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
        },
      });
      console.log(`- Admin account created: ${adminEmail}`);
    } else {
      console.log(`- Admin account already exists: ${adminEmail}`);
    }
  } else {
    console.log('- Skipped admin creation (ADMIN_EMAIL or ADMIN_PASSWORD missing)');
  }

  console.log('\nHBS Wear database seed completed successfully. 🌱');
}

main()
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });