import { getProducts, getProductBySlug } from '../src/services/productService';
import { createOrder } from '../src/controllers/orderController';
import prisma from '../src/config/db';
import { Request, Response } from 'express';

describe('Customer facing constraints for archived variants', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = {
      json: jsonMock,
      status: statusMock,
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should exclude archived variants from customer API', async () => {
    // 1. Setup data
    const category = await prisma.category.create({
      data: { name: 'Customer API Test Category', slug: 'cat-test-' + Date.now() }
    });

    const product = await prisma.product.create({
      data: {
        name: 'API Test Product',
        slug: 'api-test-prod-' + Date.now(),
        description: 'Test',
        price: 100,
        categoryId: category.id,
        variants: {
          create: [
            { color: 'Red', size: 'M', sku: 'API-RED-M', stock: 10, isArchived: false },
            { color: 'Blue', size: 'L', sku: 'API-BLU-L', stock: 5, isArchived: true }, // archived!
          ]
        }
      },
      include: { variants: true }
    });

    // 2. Fetch using productService
    const products = await getProducts({});
    const fetchedProduct = products.find(p => p.id === product.id);
    
    expect(fetchedProduct).toBeDefined();
    expect(fetchedProduct?.variants.length).toBe(1);
    expect(fetchedProduct?.variants[0].color).toBe('Red');

    // 3. Fetch by slug
    const fetchedBySlug = await getProductBySlug(product.slug);
    expect(fetchedBySlug).toBeDefined();
    expect(fetchedBySlug?.variants.length).toBe(1);
    expect(fetchedBySlug?.variants[0].color).toBe('Red');
  });

  it('should reject purchase of archived variants in checkout', async () => {
    const category = await prisma.category.create({
      data: { name: 'Checkout Test Category', slug: 'checkout-cat-test-' + Date.now() }
    });

    const product = await prisma.product.create({
      data: {
        name: 'Checkout Test Product',
        slug: 'checkout-test-prod-' + Date.now(),
        description: 'Test',
        price: 100,
        categoryId: category.id,
        variants: {
          create: [
            { color: 'Black', size: 'M', sku: 'CHK-BLK-M', stock: 10, isArchived: true }, // archived!
          ]
        }
      },
      include: { variants: true }
    });

    const archivedVariant = product.variants[0];

    // Try to create an order
    req = {
      body: {
        items: [
          { productId: product.id, variantId: archivedVariant.id, quantity: 1 }
        ],
        customerName: 'Test',
        customerEmail: 'test@example.com',
        customerPhone: '123',
        deliveryAddress: '123 Test St',
        county: 'Nairobi',
      }
    };

    await createOrder(req as any, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock.mock.calls[0][0].error).toContain('is no longer available');
  });
});
