import request from 'supertest';
import app from '../src/index';
import prisma from '../src/config/db';
import { generateAccessToken } from '../src/utils/authUtils';

describe('Customer Orders (My Orders) Feature', () => {
  const timestamp = Date.now();
  let customerA: { id: string; email: string; role: string };
  let customerB: { id: string; email: string; role: string };
  let customerEmpty: { id: string; email: string; role: string };
  let tokenA: string;
  let tokenB: string;
  let tokenEmpty: string;

  let orderA1Number: string;
  let orderA2Number: string;
  let orderB1Number: string;

  beforeAll(async () => {
    // 1. Create test customers
    customerA = await prisma.user.create({
      data: {
        email: `myorders_a_${timestamp}@example.com`,
        name: 'Customer A',
        passwordHash: 'dummy_hash',
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
      select: { id: true, email: true, role: true },
    });

    customerB = await prisma.user.create({
      data: {
        email: `myorders_b_${timestamp}@example.com`,
        name: 'Customer B',
        passwordHash: 'dummy_hash',
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
      select: { id: true, email: true, role: true },
    });

    customerEmpty = await prisma.user.create({
      data: {
        email: `myorders_empty_${timestamp}@example.com`,
        name: 'Customer Empty',
        passwordHash: 'dummy_hash',
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
      select: { id: true, email: true, role: true },
    });

    tokenA = generateAccessToken(customerA);
    tokenB = generateAccessToken(customerB);
    tokenEmpty = generateAccessToken(customerEmpty);

    // 2. Create products and variants for orders
    const category = await prisma.category.create({
      data: {
        name: `Orders Cat ${timestamp}`,
        slug: `orders-cat-${timestamp}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Orders Item ${timestamp}`,
        slug: `orders-item-${timestamp}`,
        description: 'Test product for orders',
        price: 2500,
        categoryId: category.id,
        variants: {
          create: [
            { color: 'Black', size: 'L', sku: `SKU-ORD-A-${timestamp}`, stock: 20 },
            { color: 'Navy', size: 'M', sku: `SKU-ORD-B-${timestamp}`, stock: 20 },
          ],
        },
      },
      include: { variants: true },
    });

    orderA1Number = `NAI-A1-${timestamp.toString().slice(-4)}`;
    orderA2Number = `NAI-A2-${timestamp.toString().slice(-4)}`;
    orderB1Number = `NAI-B1-${timestamp.toString().slice(-4)}`;

    // 3. Create Order 1 for Customer A (Older date, PENDING_PAYMENT, UNPAID)
    await prisma.order.create({
      data: {
        orderNumber: orderA1Number,
        userId: customerA.id,
        customerName: 'Customer A',
        customerEmail: customerA.email,
        customerPhone: '0711111111',
        deliveryAddress: '123 First Ave',
        county: 'Nairobi',
        subtotal: 2500,
        deliveryFee: 0,
        total: 2500,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        createdAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        items: {
          create: [
            {
              productName: product.name,
              variantInfo: 'Black / L',
              quantity: 1,
              unitPrice: 2500,
              totalPrice: 2500,
            },
          ],
        },
      },
    });

    // 4. Create Order 2 for Customer A (Newer date, PROCESSING, PAID)
    await prisma.order.create({
      data: {
        orderNumber: orderA2Number,
        userId: customerA.id,
        customerName: 'Customer A',
        customerEmail: customerA.email,
        customerPhone: '0711111111',
        deliveryAddress: '123 First Ave',
        county: 'Nairobi',
        subtotal: 5000,
        deliveryFee: 0,
        total: 5000,
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        createdAt: new Date(), // Now
        items: {
          create: [
            {
              productName: product.name,
              variantInfo: 'Navy / M',
              quantity: 2,
              unitPrice: 2500,
              totalPrice: 5000,
            },
          ],
        },
      },
    });

    // 5. Create Order for Customer B (SHIPPED, PAID)
    await prisma.order.create({
      data: {
        orderNumber: orderB1Number,
        userId: customerB.id,
        customerName: 'Customer B',
        customerEmail: customerB.email,
        customerPhone: '0722222222',
        deliveryAddress: '456 Second Ave',
        county: 'Mombasa',
        subtotal: 2500,
        deliveryFee: 0,
        total: 2500,
        status: 'SHIPPED',
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              productName: product.name,
              variantInfo: 'Black / L',
              quantity: 1,
              unitPrice: 2500,
              totalPrice: 2500,
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [customerA.email, customerB.email, customerEmpty.email],
        },
      },
    });
    await prisma.$disconnect();
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/orders/my-orders');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('allows authenticated customer to retrieve only their own orders', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    const orderNumbers = res.body.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderA1Number);
    expect(orderNumbers).toContain(orderA2Number);
    // Crucially: Customer B's order is NOT included
    expect(orderNumbers).not.toContain(orderB1Number);
  });

  it('sorts orders with newest first', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    // orderA2 is newer than orderA1
    expect(res.body[0].orderNumber).toBe(orderA2Number);
    expect(res.body[1].orderNumber).toBe(orderA1Number);
  });

  it('prevents customer B from viewing customer A orders', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].orderNumber).toBe(orderB1Number);
    expect(res.body[0].orderNumber).not.toBe(orderA1Number);
    expect(res.body[0].orderNumber).not.toBe(orderA2Number);
  });

  it('returns empty array when customer has no orders', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${tokenEmpty}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('correctly returns multiple order statuses, payment statuses, and item details', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const order2 = res.body.find((o: any) => o.orderNumber === orderA2Number);
    expect(order2).toBeDefined();
    expect(order2.status).toBe('PROCESSING');
    expect(order2.paymentStatus).toBe('PAID');
    expect(Number(order2.total)).toBe(5000);
    expect(order2.items.length).toBe(1);
    expect(order2.items[0].productName).toMatch(/Orders Item/);
    expect(order2.items[0].quantity).toBe(2);

    const order1 = res.body.find((o: any) => o.orderNumber === orderA1Number);
    expect(order1).toBeDefined();
    expect(order1.status).toBe('PENDING_PAYMENT');
    expect(order1.paymentStatus).toBe('UNPAID');
    expect(Number(order1.total)).toBe(2500);
  });

  it('does not expose internal database IDs or sensitive payment fields', async () => {
    const res = await request(app)
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    for (const order of res.body) {
      // Order.id (UUID) should NOT be exposed
      expect(order.id).toBeUndefined();
      // Order.userId (UUID) should NOT be exposed
      expect(order.userId).toBeUndefined();
      // Sensitive payments relation should NOT be exposed
      expect(order.payments).toBeUndefined();
    }
  });

  it('also responds on GET /api/orders with the authenticated customer orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});
