import request from 'supertest';
import app from '../src/index';
import prisma from '../src/config/db';
import Stripe from 'stripe';
import { PaymentModelStatus, PaymentProvider } from '@prisma/client';
import { releaseExpiredOrders } from '../src/jobs/releaseExpiredOrders';

jest.mock('stripe', () => {
  const RealStripe = jest.requireActual('stripe');
  return jest.fn().mockImplementation(() => {
    const realInstance = new RealStripe('mock_stripe_key_for_unit_tests');
    return {
      webhooks: realInstance.webhooks,
      paymentIntents: {
        create: jest.fn().mockImplementation(async (params: any) => ({
          id: `pi_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          client_secret: `pi_mock_secret_${Date.now()}`,
          amount: params.amount,
          currency: params.currency,
          status: 'requires_payment_method',
          metadata: params.metadata || {}
        })),
        retrieve: jest.fn().mockImplementation(async (id: string) => ({
          id,
          client_secret: `${id}_secret`,
          amount: 300000,
          currency: 'kes',
          status: 'requires_payment_method'
        }))
      }
    };
  });
});

describe('Checkout Recovery and Inventory Reservation Hardening', () => {
  const TEST_WEBHOOK_SECRET = 'test_webhook_signing_secret_for_unit_tests_only';
  const RealStripe = jest.requireActual('stripe');
  const stripeClient = new RealStripe('mock_stripe_key_for_unit_tests');

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'mock_stripe_secret_key_for_test';
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const signPayload = (payload: any, secret = TEST_WEBHOOK_SECRET) => {
    const payloadString = JSON.stringify(payload);
    const signature = stripeClient.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });
    return { payloadString, signature };
  };

  const createTestCategoryAndProduct = async (initialStock = 10, price = 1000) => {
    const timestamp = Date.now() + Math.floor(Math.random() * 100000);
    const category = await prisma.category.create({
      data: {
        name: `Recovery Cat ${timestamp}`,
        slug: `recovery-cat-${timestamp}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Recovery Product ${timestamp}`,
        slug: `recovery-prod-${timestamp}`,
        description: 'Test Recovery Product',
        price: price,
        categoryId: category.id,
        variants: {
          create: [
            {
              color: 'Charcoal',
              size: 'L',
              sku: `REC-CHR-L-${timestamp}`,
              stock: initialStock,
              reservedStock: 0,
              isArchived: false,
            },
            {
              color: 'Ivory',
              size: 'M',
              sku: `REC-IVO-M-${timestamp}`,
              stock: initialStock,
              reservedStock: 0,
              isArchived: false,
            },
          ],
        },
      },
      include: { variants: true },
    });

    return { category, product, variantA: product.variants[0], variantB: product.variants[1] };
  };

  // =========================================================================
  // 1. Declined card -> navigate home -> return to checkout -> retry without duplicate order
  // =========================================================================
  it('1. should handle declined card, preserve pending order, and allow retry on same order without creating duplicates', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 1500);

    const uniqueEmail = `bob_${Date.now()}@example.com`;
    // Customer places order for 2 units
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Bob Declined',
        customerEmail: uniqueEmail,
        customerPhone: '254711223344',
        deliveryAddress: '42 River Road',
        county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
      });

    expect(orderRes.status).toBe(201);
    const order = orderRes.body;
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.paymentStatus).toBe('UNPAID');

    // Verify reservation = 2
    let dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(2);

    // Initial payment creation
    const piId = `pi_fail_${Date.now()}`;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        status: PaymentModelStatus.PENDING,
        amount: order.total,
        currency: 'KES',
        providerRequestId: piId,
      }
    });

    // Simulate card decline via webhook
    const failEvent = {
      id: `evt_fail_${Date.now()}`,
      object: 'event',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: piId,
          amount: Math.round(Number(order.total) * 100),
          currency: 'kes',
          last_payment_error: { message: 'Your card was declined.', code: 'card_declined' }
        }
      }
    };
    const { payloadString, signature } = signPayload(failEvent);
    await request(app)
      .post('/api/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    // Verify order is still PENDING_PAYMENT, UNPAID, reservation is still held
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).toBe('PENDING_PAYMENT');
    expect(dbOrder?.paymentStatus).toBe('UNPAID');

    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(2);

    // Customer returns to checkout: fetches order to verify status and items
    const fetchRes = await request(app)
      .get(`/api/orders/${order.orderNumber}`)
      .set('x-guest-token', order.guestAccessToken);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.orderNumber).toBe(order.orderNumber);
    expect(fetchRes.body.status).toBe('PENDING_PAYMENT');
    expect(fetchRes.body.items).toHaveLength(1);
    expect(fetchRes.body.items[0].quantity).toBe(2);

    // Count orders in database before retry
    const orderCountBefore = await prisma.order.count({ where: { customerEmail: uniqueEmail } });
    expect(orderCountBefore).toBe(1);

    // Customer retries payment for the SAME order (does not post /api/orders again)
    const retryRes = await request(app)
      .post('/api/payments/stripe/create')
      .send({ orderNumber: order.orderNumber });

    expect(retryRes.status).toBe(200);

    const orderCountAfter = await prisma.order.count({ where: { customerEmail: uniqueEmail } });
    expect(orderCountAfter).toBe(1); // NO duplicate order created

    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(2); // Still only 2 reserved!
  });

  // =========================================================================
  // 2. Page refresh during a pending checkout
  // =========================================================================
  it('2. should verify ownership, status, expiry, and exact cart items on page refresh', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 2000);

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Clara Refresh',
        customerEmail: 'clara@example.com',
        customerPhone: '254722334455',
        deliveryAddress: '88 Westlands',
        county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantA.id, quantity: 1 }]
      });

    const order = orderRes.body;

    // Simulate page refresh: client calls getOrder(orderNumber)
    const refreshRes = await request(app)
      .get(`/api/orders/${order.orderNumber}`)
      .set('x-guest-token', order.guestAccessToken);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.status).toBe('PENDING_PAYMENT');
    expect(refreshRes.body.paymentStatus).toBe('UNPAID');
    expect(new Date(refreshRes.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(refreshRes.body.items).toHaveLength(1);
    expect(refreshRes.body.items[0].variantId).toBe(variantA.id);
    expect(refreshRes.body.items[0].quantity).toBe(1);

    // Ensure inventory reservation was not affected by refresh
    const dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(1);
  });

  // =========================================================================
  // 3. Changed cart while an order is pending
  // =========================================================================
  it('3. should safely release old order reservations when replacing with a changed cart or explicit cancellation', async () => {
    const { product, variantA, variantB } = await createTestCategoryAndProduct(10, 1000);

    // Initial order for Variant A (qty 2)
    const order1Res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'David CartChange',
        customerEmail: 'david@example.com',
        customerPhone: '254733445566',
        deliveryAddress: '10 Park Road',
        county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
      });

    const order1 = order1Res.body;
    let varA = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(varA?.reservedStock).toBe(2);

    // Customer changed cart to Variant B (qty 3) and creates new order, atomically replacing order 1
    const order2Res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'David CartChange',
        customerEmail: 'david@example.com',
        customerPhone: '254733445566',
        deliveryAddress: '10 Park Road',
        county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantB.id, quantity: 3 }],
        replaceOrderNumber: order1.orderNumber
      });

    expect(order2Res.status).toBe(201);
    const order2 = order2Res.body;

    // Verify Order 1 is CANCELLED and Variant A reservation released back to 0
    const oldOrder = await prisma.order.findUnique({ where: { id: order1.id } });
    expect(oldOrder?.status).toBe('CANCELLED');

    varA = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(varA?.reservedStock).toBe(0);

    // Verify Order 2 is PENDING_PAYMENT and Variant B reservedStock is 3
    let varB = await prisma.productVariant.findUnique({ where: { id: variantB.id } });
    expect(varB?.reservedStock).toBe(3);

    // Also test explicit cancellation endpoint on Order 2
    const cancelRes = await request(app)
      .post(`/api/orders/${order2.orderNumber}/cancel`)
      .set('x-guest-token', order2.guestAccessToken);
    expect(cancelRes.status).toBe(200);

    const cancelledOrder2 = await prisma.order.findUnique({ where: { id: order2.id } });
    expect(cancelledOrder2?.status).toBe('CANCELLED');

    varB = await prisma.productVariant.findUnique({ where: { id: variantB.id } });
    expect(varB?.reservedStock).toBe(0);
  });

  // =========================================================================
  // 4. Expired pending order and reservation release
  // =========================================================================
  it('4. should reject payment attempts on expired orders and release reservations in expiry job', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 1200);

    // Create an order that is already past its expiration
    const expiredTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    const order = await prisma.order.create({
      data: {
        orderNumber: `NAI-EXP-${Date.now()}`,
        customerName: 'Evan Expired',
        customerEmail: 'evan@example.com',
        customerPhone: '254744556677',
        deliveryAddress: '22 Sunset Blvd',
        county: 'Nairobi',
        subtotal: 1200,
        deliveryFee: 0,
        total: 1200,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        expiresAt: expiredTimestamp,
        items: {
          create: [{
            productId: product.id,
            variantId: variantA.id,
            productName: product.name,
            variantInfo: 'Charcoal / L',
            quantity: 2,
            unitPrice: 1200,
            totalPrice: 2400
          }]
        }
      }
    });

    // Manually increment reservation as createOrder does
    await prisma.productVariant.update({
      where: { id: variantA.id },
      data: { reservedStock: { increment: 2 } }
    });

    // 1. Stripe payment attempt should be rejected with 400
    const stripePayRes = await request(app)
      .post('/api/payments/stripe/create')
      .send({ orderNumber: order.orderNumber });
    expect(stripePayRes.status).toBe(400);
    expect(stripePayRes.body.error).toMatch(/reservation has expired/i);

    // 2. M-Pesa payment attempt should also be rejected with 400
    const mpesaPayRes = await request(app)
      .post('/api/payments/mpesa/stk-push')
      .send({ orderNumber: order.orderNumber, phoneNumber: '0744556677' });
    expect(mpesaPayRes.status).toBe(400);
    expect(mpesaPayRes.body.error).toMatch(/reservation has expired/i);

    // 3. Run the real expiry sweep used by the cron job
    const cancelledCount = await releaseExpiredOrders();
    expect(cancelledCount).toBeGreaterThanOrEqual(1);

    // Re-running the sweep must not release the same reservation twice
    await releaseExpiredOrders();

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('CANCELLED');

    const dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(0);
  });

  // =========================================================================
  // 5. Successful payment after a retry
  // =========================================================================
  it('5. should deduct physical stock and clear reservation exactly once on successful payment after retry', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 1000);

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Fiona Retry',
        customerEmail: 'fiona@example.com',
        customerPhone: '254755667788',
        deliveryAddress: '15 High St',
        county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantA.id, quantity: 3 }]
      });

    const order = orderRes.body;

    // Initial payment attempt fails
    const initialPi = `pi_init_fail_${Date.now()}`;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        status: PaymentModelStatus.FAILED,
        amount: order.total,
        currency: 'KES',
        providerRequestId: initialPi,
        failureReason: 'Insufficient funds'
      }
    });

    // Retry payment attempt created
    const retryPi = `pi_retry_success_${Date.now()}`;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        status: PaymentModelStatus.PENDING,
        amount: order.total,
        currency: 'KES',
        providerRequestId: retryPi,
      }
    });

    // Successful webhook arrives for the retried payment
    const successEvent = {
      id: `evt_success_${Date.now()}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: retryPi,
          amount: Math.round(Number(order.total) * 100),
          currency: 'kes',
          status: 'succeeded',
          latest_charge: `ch_${Date.now()}`
        }
      }
    };
    const { payloadString, signature } = signPayload(successEvent);
    const webhookRes = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    expect(webhookRes.status).toBe(200);

    // Assert: Order is paid and processing
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('PROCESSING');
    expect(updatedOrder?.paymentStatus).toBe('PAID');

    // Assert: stock decremented from 10 to 7, reservedStock decremented from 3 to 0
    const dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(7);
    expect(dbVariant?.reservedStock).toBe(0);
  });

  // =========================================================================
  // 6. Duplicate webhook delivery without duplicate stock deduction
  // =========================================================================
  it('6. should idempotently handle duplicate webhook delivery without decrementing stock again', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 1000);

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'George Idempotent',
        customerEmail: 'george@example.com',
        customerPhone: '254766778899',
        deliveryAddress: '99 Kilimani',
        county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
      });

    const order = orderRes.body;
    const piId = `pi_dup_test_${Date.now()}`;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        status: PaymentModelStatus.PENDING,
        amount: order.total,
        currency: 'KES',
        providerRequestId: piId,
      }
    });

    const successEvent = {
      id: `evt_dup_${Date.now()}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: Math.round(Number(order.total) * 100),
          currency: 'kes',
          status: 'succeeded',
          latest_charge: `ch_${Date.now()}`
        }
      }
    };
    const { payloadString, signature } = signPayload(successEvent);

    // First webhook delivery
    const res1 = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);
    expect(res1.status).toBe(200);

    let dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(8);
    expect(dbVariant?.reservedStock).toBe(0);

    // Second (duplicate) webhook delivery
    const res2 = await request(app)
      .post('/api/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);
    expect(res2.status).toBe(200);
    expect(res2.body.message).toMatch(/already processed/i);

    // Physical stock MUST remain 8 and NOT be decremented to 6!
    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(8);
    expect(dbVariant?.reservedStock).toBe(0);
  });

  // =========================================================================
  // 7. Cancellation racing with a successful payment webhook
  // =========================================================================
  describe('7. Concurrency: Cancellation racing with payment webhook', () => {
    it('7A. should reject cancellation if payment webhook already transitioned order to PROCESSING', async () => {
      const { product, variantA } = await createTestCategoryAndProduct(10, 1000);

      const orderRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Hannah Race',
          customerEmail: 'hannah@example.com',
          customerPhone: '254777889900',
          deliveryAddress: '12 Karen Lane',
          county: 'Nairobi',
          items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
        });

      const order = orderRes.body;
      const piId = `pi_race_a_${Date.now()}`;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: order.total,
          currency: 'KES',
          providerRequestId: piId,
        }
      });

      // Webhook arrives first
      const successEvent = {
        id: `evt_race_a_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: piId,
            amount: Math.round(Number(order.total) * 100),
            currency: 'kes',
            status: 'succeeded',
            latest_charge: `ch_${Date.now()}`
          }
        }
      };
      const { payloadString, signature } = signPayload(successEvent);
      await request(app)
        .post('/api/payments/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      // Now customer attempts to cancel
      const cancelRes = await request(app)
        .post(`/api/orders/${order.orderNumber}/cancel`)
        .set('x-guest-token', order.guestAccessToken);
      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.error).toMatch(/already been paid/i);

      // Stock remains safely deducted, reservation is 0
      const dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
      expect(dbVariant?.stock).toBe(8);
      expect(dbVariant?.reservedStock).toBe(0);
    });

    it('7B. should preserve inventory if order was cancelled before webhook processing', async () => {
      const { product, variantA } = await createTestCategoryAndProduct(10, 1000);

      const orderRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Ian CancelFirst',
          customerEmail: 'ian@example.com',
          customerPhone: '254788990011',
          deliveryAddress: '55 Ngong Road',
          county: 'Nairobi',
          items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
        });

      const order = orderRes.body;
      const piId = `pi_race_b_${Date.now()}`;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: order.total,
          currency: 'KES',
          providerRequestId: piId,
        }
      });

      // Customer cancels first
      const cancelRes = await request(app)
        .post(`/api/orders/${order.orderNumber}/cancel`)
        .set('x-guest-token', order.guestAccessToken);
      expect(cancelRes.status).toBe(200);

      let dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
      expect(dbVariant?.stock).toBe(10);
      expect(dbVariant?.reservedStock).toBe(0);

      // Delayed webhook arrives after cancellation
      const successEvent = {
        id: `evt_race_b_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: piId,
            amount: Math.round(Number(order.total) * 100),
            currency: 'kes',
            status: 'succeeded',
            latest_charge: `ch_${Date.now()}`
          }
        }
      };
      const { payloadString, signature } = signPayload(successEvent);
      const webhookRes = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.note).toMatch(/Payment recorded on cancelled order/i);

      // Stock and reservation must remain unchanged (10 and 0) and not deducted below 0!
      dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
      expect(dbVariant?.stock).toBe(10);
      expect(dbVariant?.reservedStock).toBe(0);
    });
  });

  // =========================================================================
  // 8. Multiple pending orders and reservation accounting
  // =========================================================================
  it('8. should accurately enforce reservation limits across multiple concurrent orders', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 1000);

    // Customer 1 reserves 4 units
    const order1 = await request(app).post('/api/orders').send({
      customerName: 'User 1', customerEmail: 'u1@example.com', customerPhone: '254700000001',
      deliveryAddress: 'Add 1', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 4 }]
    });
    expect(order1.status).toBe(201);

    // Customer 2 reserves 4 units
    const order2 = await request(app).post('/api/orders').send({
      customerName: 'User 2', customerEmail: 'u2@example.com', customerPhone: '254700000002',
      deliveryAddress: 'Add 2', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 4 }]
    });
    expect(order2.status).toBe(201);

    let dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(10);
    expect(dbVariant?.reservedStock).toBe(8); // Available = 2

    // Customer 3 tries to reserve 3 units -> must fail
    const order3Fail = await request(app).post('/api/orders').send({
      customerName: 'User 3', customerEmail: 'u3@example.com', customerPhone: '254700000003',
      deliveryAddress: 'Add 3', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 3 }]
    });
    expect(order3Fail.status).toBe(400);
    expect(order3Fail.body.error).toMatch(/Insufficient stock/i);

    // Customer 1 cancels their order
    await request(app)
      .post(`/api/orders/${order1.body.orderNumber}/cancel`)
      .set('x-guest-token', order1.body.guestAccessToken);

    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(4); // Available = 6

    // Customer 3 retries 3 units -> now succeeds!
    const order3Success = await request(app).post('/api/orders').send({
      customerName: 'User 3', customerEmail: 'u3@example.com', customerPhone: '254700000003',
      deliveryAddress: 'Add 3', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 3 }]
    });
    expect(order3Success.status).toBe(201);

    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.reservedStock).toBe(7); // Available = 3
  });

  // =========================================================================
  // 9. M-Pesa regression coverage
  // =========================================================================
  it('9. should handle M-Pesa STK push, callback success, and callback failure safely', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 500);

    // 1. Create order for M-Pesa
    const orderRes = await request(app).post('/api/orders').send({
      customerName: 'Mpesa Tester', customerEmail: 'mpesa@example.com', customerPhone: '254712345678',
      deliveryAddress: 'Mpesa Way', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
    });
    const order = orderRes.body;

    // Initiate M-Pesa STK push
    const stkRes = await request(app).post('/api/payments/mpesa/stk-push').send({
      orderNumber: order.orderNumber,
      phoneNumber: '0712345678'
    });
    expect(stkRes.status).toBe(200);

    const pendingPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: PaymentProvider.MPESA }
    });
    expect(pendingPayment).toBeTruthy();
    expect(pendingPayment?.status).toBe(PaymentModelStatus.PENDING);

    // Simulate successful M-Pesa callback
    const successCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'mock_merchant_id',
          CheckoutRequestID: pendingPayment?.providerRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 1000 },
              { Name: 'MpesaReceiptNumber', Value: `NLX${Date.now()}` },
              { Name: 'TransactionDate', Value: 20261012120000 },
              { Name: 'PhoneNumber', Value: 254712345678 }
            ]
          }
        }
      }
    };

    const cbRes = await request(app).post('/api/payments/mpesa/callback').send(successCallback);
    expect(cbRes.status).toBe(200);

    const paidOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(paidOrder?.status).toBe('PROCESSING');
    expect(paidOrder?.paymentStatus).toBe('PAID');

    let dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(8);
    expect(dbVariant?.reservedStock).toBe(0);

    // 2. Failure callback coverage: create another order and simulate user cancel
    const failOrderRes = await request(app).post('/api/orders').send({
      customerName: 'Mpesa Failer', customerEmail: 'failer@example.com', customerPhone: '254712345678',
      deliveryAddress: 'Fail Way', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
    });
    const failOrder = failOrderRes.body;

    const stkFailRes = await request(app).post('/api/payments/mpesa/stk-push').send({
      orderNumber: failOrder.orderNumber,
      phoneNumber: '0712345678'
    });
    expect(stkFailRes.status).toBe(200);

    const failPayment = await prisma.payment.findFirst({
      where: { orderId: failOrder.id, provider: PaymentProvider.MPESA }
    });

    const failureCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'mock_merchant_fail',
          CheckoutRequestID: failPayment?.providerRequestId,
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user'
        }
      }
    };

    await request(app).post('/api/payments/mpesa/callback').send(failureCallback);

    // Failed attempt is recorded on the payment only
    const failedPayment = await prisma.payment.findUnique({ where: { id: failPayment!.id } });
    expect(failedPayment?.status).toBe(PaymentModelStatus.FAILED);
    expect(failedPayment?.failureReason).toBe('Request cancelled by user');

    // Order stays payable so the customer can retry before expiresAt
    const stillPendingOrder = await prisma.order.findUnique({ where: { id: failOrder.id } });
    expect(stillPendingOrder?.status).toBe('PENDING_PAYMENT');
    expect(stillPendingOrder?.paymentStatus).toBe('UNPAID');

    // Reservation is kept (released only by the expiry job), physical stock unchanged at 8
    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(8);
    expect(dbVariant?.reservedStock).toBe(2);

    // A failed attempt must not trigger the STK cooldown: retry is allowed immediately
    const retryRes = await request(app).post('/api/payments/mpesa/stk-push').send({
      orderNumber: failOrder.orderNumber,
      phoneNumber: '0712345678'
    });
    expect(retryRes.status).toBe(200);
  });

  // =========================================================================
  // 10. M-Pesa STK push cooldown (spam / race protection)
  // =========================================================================
  it('10. should return 429 for repeat STK pushes while a prompt is pending, including concurrent requests', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 500);

    const createOrder = async (email: string) => {
      const res = await request(app).post('/api/orders').send({
        customerName: 'Spam Tester', customerEmail: email, customerPhone: '254712345678',
        deliveryAddress: 'Spam Way', county: 'Nairobi',
        items: [{ productId: product.id, variantId: variantA.id, quantity: 1 }]
      });
      expect(res.status).toBe(201);
      return res.body;
    };

    // Sequential: second push within 2 minutes is rejected
    const order = await createOrder(`spam_seq_${Date.now()}@example.com`);
    const first = await request(app).post('/api/payments/mpesa/stk-push')
      .send({ orderNumber: order.orderNumber, phoneNumber: '0712345678' });
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/payments/mpesa/stk-push')
      .send({ orderNumber: order.orderNumber, phoneNumber: '0712345678' });
    expect(second.status).toBe(429);
    expect(second.body.error).toMatch(/check your phone/i);
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(second.headers['retry-after'])).toBeLessThanOrEqual(120);

    const seqPayments = await prisma.payment.count({
      where: { orderId: order.id, provider: PaymentProvider.MPESA }
    });
    expect(seqPayments).toBe(1);

    // Concurrent: exactly one of several simultaneous pushes may reach Safaricom
    const raceOrder = await createOrder(`spam_race_${Date.now()}@example.com`);
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app).post('/api/payments/mpesa/stk-push')
          .send({ orderNumber: raceOrder.orderNumber, phoneNumber: '0712345678' })
      )
    );
    const statuses = results.map(r => r.status).sort();
    expect(statuses).toEqual([200, 429, 429, 429]);

    const racePayments = await prisma.payment.count({
      where: { orderId: raceOrder.id, provider: PaymentProvider.MPESA }
    });
    expect(racePayments).toBe(1);
  });

  // =========================================================================
  // 11. M-Pesa late payment on an expired/cancelled order
  // =========================================================================
  it('11. should record a late M-Pesa payment for manual review without touching stock', async () => {
    const { product, variantA } = await createTestCategoryAndProduct(10, 500);

    const orderRes = await request(app).post('/api/orders').send({
      customerName: 'Late Payer', customerEmail: `late_${Date.now()}@example.com`, customerPhone: '254712345678',
      deliveryAddress: 'Late Lane', county: 'Nairobi',
      items: [{ productId: product.id, variantId: variantA.id, quantity: 2 }]
    });
    const order = orderRes.body;

    const stkRes = await request(app).post('/api/payments/mpesa/stk-push')
      .send({ orderNumber: order.orderNumber, phoneNumber: '0712345678' });
    expect(stkRes.status).toBe(200);

    const pendingPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: PaymentProvider.MPESA }
    });

    // Reservation window lapses while the customer is still on the STK prompt
    await prisma.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) }
    });
    await releaseExpiredOrders();

    let dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(10);
    expect(dbVariant?.reservedStock).toBe(0);

    // Customer then completes payment on their phone
    const receipt = `LATE${Date.now()}`;
    const lateCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'mock_merchant_late',
          CheckoutRequestID: pendingPayment?.providerRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 1000 },
              { Name: 'MpesaReceiptNumber', Value: receipt },
              { Name: 'PhoneNumber', Value: 254712345678 }
            ]
          }
        }
      }
    };

    const cbRes = await request(app).post('/api/payments/mpesa/callback').send(lateCallback);
    expect(cbRes.status).toBe(200);

    // Payment is PAID (money was collected) and flagged for review
    const latePayment = await prisma.payment.findUnique({ where: { id: pendingPayment!.id } });
    expect(latePayment?.status).toBe(PaymentModelStatus.PAID);
    expect(latePayment?.receipt).toBe(receipt);
    expect(latePayment?.failureReason).toMatch(/cancelled\/expired.*manual review/i);

    // Order stays cancelled; stock and reservations are untouched
    const cancelledOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(cancelledOrder?.status).toBe('CANCELLED');
    expect(cancelledOrder?.paymentStatus).toBe('UNPAID');

    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(10);
    expect(dbVariant?.reservedStock).toBe(0);

    // Duplicate delivery of the same callback is a no-op
    const dupRes = await request(app).post('/api/payments/mpesa/callback').send(lateCallback);
    expect(dupRes.status).toBe(200);
    dbVariant = await prisma.productVariant.findUnique({ where: { id: variantA.id } });
    expect(dbVariant?.stock).toBe(10);
    expect(dbVariant?.reservedStock).toBe(0);
  });
});
