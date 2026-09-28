import type { Product } from '../types';

export const mockProducts: Product[] = [
  {
    id: 'p-1',
    name: 'Oversized Heavyweight Tee',
    slug: 'oversized-heavyweight-tee',
    description: 'Crafted from 300gsm luxury cotton, this oversized tee offers a structured, boxy fit perfect for modern streetwear.',
    details: ['100% Cotton', '300gsm heavyweight fabric', 'Dropped shoulders', 'Ribbed crewneck'],
    price: 3500,
    category: 'T-Shirts',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop', // White tee
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Cream', hex: '#F9F8F6' },
      { name: 'Washed Black', hex: '#2A2A2A' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { id: 'v-1-c-s', color: 'Cream', size: 'S', stock: 10, sku: 'TEE-CR-S' },
      { id: 'v-1-c-m', color: 'Cream', size: 'M', stock: 15, sku: 'TEE-CR-M' },
      { id: 'v-1-c-l', color: 'Cream', size: 'L', stock: 0, sku: 'TEE-CR-L' },
      { id: 'v-1-b-m', color: 'Washed Black', size: 'M', stock: 20, sku: 'TEE-WB-M' },
    ],
    stock: 45,
    featured: true,
    newArrival: true,
  },
  {
    id: 'p-2',
    name: 'Boxy Washed Hoodie',
    slug: 'boxy-washed-hoodie',
    description: 'Our signature heavyweight hoodie featuring a dropped shoulder design, slightly cropped length, and a vintage wash finish.',
    details: ['100% French Terry Cotton', '450gsm heavyweight', 'Kangaroo pocket', 'Vintage enzyme wash'],
    price: 6500,
    category: 'Hoodies',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Washed Black', hex: '#2A2A2A' },
      { name: 'Heather Grey', hex: '#D3D3D3' }
    ],
    sizes: ['M', 'L', 'XL'],
    variants: [
      { id: 'v-2-b-m', color: 'Washed Black', size: 'M', stock: 5, sku: 'HD-WB-M' },
      { id: 'v-2-b-l', color: 'Washed Black', size: 'L', stock: 12, sku: 'HD-WB-L' },
    ],
    stock: 17,
    featured: true,
    newArrival: false,
  },
  {
    id: 'p-3',
    name: 'Tailored Wide Leg Trousers',
    slug: 'tailored-wide-leg-trousers',
    description: 'Contemporary wide-leg trousers designed for a relaxed yet refined silhouette. Features single pleats and a high-rise waist.',
    details: ['60% Wool, 40% Poly blend', 'Single front pleat', 'High-waisted', 'Relaxed wide fit'],
    price: 8500,
    category: 'Trousers',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Dark Navy', hex: '#1C2841' },
      { name: 'Charcoal', hex: '#36454F' }
    ],
    sizes: ['28', '30', '32', '34'],
    variants: [
      { id: 'v-3-n-30', color: 'Dark Navy', size: '30', stock: 8, sku: 'TR-DN-30' },
      { id: 'v-3-n-32', color: 'Dark Navy', size: '32', stock: 14, sku: 'TR-DN-32' },
      { id: 'v-3-c-32', color: 'Charcoal', size: '32', stock: 0, sku: 'TR-CH-32' },
    ],
    stock: 22,
    featured: false,
    newArrival: true,
  },
  {
    id: 'p-4',
    name: 'Minimalist Utility Jacket',
    slug: 'minimalist-utility-jacket',
    description: 'A versatile layer constructed from durable cotton canvas. Features oversized patch pockets and a clean hidden placket.',
    details: ['100% Cotton Canvas', 'Hidden button placket', 'Two oversized patch pockets', 'Boxy fit'],
    price: 12500,
    category: 'Jackets',
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520975954732-57dd22299614?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Sage Green', hex: '#8A9A86' },
      { name: 'Stone', hex: '#E5E2DD' }
    ],
    sizes: ['S', 'M', 'L'],
    variants: [
      { id: 'v-4-s-m', color: 'Sage Green', size: 'M', stock: 4, sku: 'JK-SG-M' },
      { id: 'v-4-s-l', color: 'Sage Green', size: 'L', stock: 6, sku: 'JK-SG-L' },
    ],
    stock: 10,
    featured: true,
    newArrival: true,
  },
  {
    id: 'p-5',
    name: 'Essential Ribbed Tank',
    slug: 'essential-ribbed-tank',
    description: 'A daily essential cut from premium ribbed cotton with a flattering fitted silhouette and subtle branding.',
    details: ['95% Cotton, 5% Elastane', 'Fitted silhouette', 'Scoop neck'],
    price: 2000,
    category: 'T-Shirts',
    images: [
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Black', hex: '#000000' }
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    variants: [
      { id: 'v-5-w-m', color: 'White', size: 'M', stock: 25, sku: 'TK-WH-M' },
    ],
    stock: 25,
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-6',
    name: 'Structured Leather Tote',
    slug: 'structured-leather-tote',
    description: 'An everyday essential tote crafted from premium vegan leather. Spacious enough for a 15" laptop.',
    details: ['Premium Vegan Leather', 'Magnetic closure', 'Interior zip pocket', 'Dimensions: 40x30x15cm'],
    price: 9500,
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Black', hex: '#000000' },
      { name: 'Tan', hex: '#D2B48C' }
    ],
    sizes: ['One Size'],
    variants: [
      { id: 'v-6-b-os', color: 'Black', size: 'One Size', stock: 8, sku: 'BG-BK-OS' },
    ],
    stock: 8,
    featured: true,
    newArrival: false,
  },
  {
    id: 'p-7',
    name: 'Classic Oxford Shirt',
    slug: 'classic-oxford-shirt',
    description: 'A timeless staple, cut from heavy oxford cloth that softens beautifully over time. Relaxed fit.',
    details: ['100% Organic Cotton Oxford', 'Button-down collar', 'Chest pocket', 'Curved hem'],
    price: 5500,
    category: 'Shirts',
    images: [
      'https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Light Blue', hex: '#ADD8E6' },
      { name: 'White', hex: '#FFFFFF' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { id: 'v-7-b-m', color: 'Light Blue', size: 'M', stock: 12, sku: 'SH-LB-M' },
      { id: 'v-7-w-l', color: 'White', size: 'L', stock: 10, sku: 'SH-WH-L' }
    ],
    stock: 22,
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-8',
    name: 'Straight Leg Denim',
    slug: 'straight-leg-denim',
    description: 'Vintage-inspired straight leg jeans washed to a perfect medium blue fade. Made from rigid 14oz denim.',
    details: ['100% Cotton 14oz Denim', 'Button fly', '5-pocket styling', 'Straight fit'],
    price: 7800,
    category: 'Trousers',
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1604176354204-9268737828e4?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Vintage Blue', hex: '#4A648C' }
    ],
    sizes: ['28', '30', '32', '34', '36'],
    variants: [
      { id: 'v-8-v-32', color: 'Vintage Blue', size: '32', stock: 18, sku: 'DN-VB-32' },
      { id: 'v-8-v-34', color: 'Vintage Blue', size: '34', stock: 15, sku: 'DN-VB-34' }
    ],
    stock: 33,
    featured: false,
    newArrival: true,
  },
  {
    id: 'p-9',
    name: 'Signature Cap',
    slug: 'signature-cap',
    description: 'Classic 6-panel baseball cap in washed cotton twill with subtle tonal embroidery.',
    details: ['100% Cotton Twill', 'Adjustable strap', 'Tonal embroidery'],
    price: 2500,
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Forest Green', hex: '#228B22' },
      { name: 'Navy', hex: '#000080' }
    ],
    sizes: ['One Size'],
    variants: [
      { id: 'v-9-f-os', color: 'Forest Green', size: 'One Size', stock: 30, sku: 'CP-FG-OS' },
    ],
    stock: 30,
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-10',
    name: 'Cropped Wool Jacket',
    slug: 'cropped-wool-jacket',
    description: 'A sharp, modern silhouette. This cropped jacket is fully lined and crafted from a heavy wool blend.',
    details: ['70% Wool, 30% Poly', 'Fully lined', 'Zip closure', 'Cropped boxy fit'],
    price: 14500,
    category: 'Jackets',
    images: [
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Charcoal', hex: '#36454F' }
    ],
    sizes: ['S', 'M', 'L'],
    variants: [
      { id: 'v-10-c-m', color: 'Charcoal', size: 'M', stock: 5, sku: 'WJ-CH-M' },
    ],
    stock: 5,
    featured: false,
    newArrival: true,
  },
  {
    id: 'p-11',
    name: 'Knit Polo',
    slug: 'knit-polo',
    description: 'A textured knit polo shirt that bridges the gap between casual and dressed up. Extremely soft hand-feel.',
    details: ['100% Cotton Knit', 'Open collar', 'Ribbed hem and cuffs'],
    price: 4800,
    category: 'Shirts',
    images: [
      'https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Oatmeal', hex: '#EAE0C8' },
      { name: 'Black', hex: '#000000' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { id: 'v-11-o-m', color: 'Oatmeal', size: 'M', stock: 12, sku: 'KP-OT-M' },
    ],
    stock: 12,
    featured: false,
    newArrival: false,
  },
  {
    id: 'p-12',
    name: 'Chunky Knit Beanie',
    slug: 'chunky-knit-beanie',
    description: 'Stay warm in style. A heavy ribbed beanie made from a soft wool blend.',
    details: ['50% Wool, 50% Acrylic', 'Chunky rib knit', 'Fold-over brim'],
    price: 2200,
    category: 'Accessories',
    images: [
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800&auto=format&fit=crop'
    ],
    colors: [
      { name: 'Grey', hex: '#808080' },
      { name: 'Orange', hex: '#FFA500' }
    ],
    sizes: ['One Size'],
    variants: [
      { id: 'v-12-g-os', color: 'Grey', size: 'One Size', stock: 40, sku: 'BN-GR-OS' },
    ],
    stock: 40,
    featured: false,
    newArrival: false,
  }
];
