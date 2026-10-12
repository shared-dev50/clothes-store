import request from 'supertest';
import app from '../src/index';
import prisma from '../src/config/db';
import Stripe from 'stripe';
import { PaymentModelStatus, PaymentProvider } from '@prisma/client';

describe('Stripe Payments and Webhook Integration', () => {
  const TEST_WEBHOOK_SECRET = 'test_webhook_signing_secret_for_unit_tests_only';
  const stripeClient = new Stripe('mock_stripe_key_for_unit_tests');

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

  const createTestOrderWithVariant = async (initialStock = 10, quantity = 2, price = 500) => {
    const timestamp = Date.now() + Math.floor(Math.random() * 10000);
    const category = await prisma.category.create({
      data: {
        name: `Stripe Test Category ${timestamp}`,
        slug: `stripe-test-cat-${timestamp}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Stripe Test Product ${timestamp}`,
        slug: `stripe-test-prod-${timestamp}`,
        description: 'Test Product',
        price: price,
        categoryId: category.id,
        variants: {
          create: [
            {
              color: 'Navy',
              size: 'M',
              sku: `ST-NAV-M-${timestamp}`,
              stock: initialStock,
              reservedStock: quantity, // Stock is already reserved at order creation
              isArchived: false,
            },
          ],
        },
      },
      include: { variants: true },
    });

    const variant = product.variants[0];
    const total = price * quantity;
    const orderNumber = `NAI-ST-${timestamp}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: 'Alice Stripe',
        customerEmail: 'alice@example.com',
        customerPhone: '254712345678',
        deliveryAddress: '100 Nairobi Way',
        county: 'Nairobi',
        subtotal: total,
        deliveryFee: 0,
        total: total,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        items: {
          create: [
            {
              productId: product.id,
              variantId: variant.id,
              productName: product.name,
              variantInfo: 'Navy / M',
              quantity,
              unitPrice: price,
              totalPrice: total,
            },
          ],
        },
      },
      include: { items: true },
    });

    return { category, product, variant, order, total };
  };

  describe('Webhook Signature Verification', () => {
    it('should reject webhook requests missing the stripe-signature header with 400', async () => {
      const response = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'payment_intent.succeeded' }));

      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing Stripe signature header');
    });

    it('should reject webhook requests with an invalid signature with 400', async () => {
      const response = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=12345,v1=invalid_signature_hash')
        .send(JSON.stringify({ type: 'payment_intent.succeeded' }));

      expect(response.status).toBe(400);
      expect(response.text).toContain('signature verification failed');
    });
  });

  describe('payment_intent.succeeded Processing', () => {
    it('should verify signature, update order/payment to PAID, and deduct physical stock and reserved stock atomically', async () => {
      const { order, variant, total } = await createTestOrderWithVariant(10, 2, 600);
      const paymentIntentId = `pi_test_${Date.now()}`;

      // Create a pending payment record
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: total,
          currency: 'KES',
          providerRequestId: paymentIntentId,
        },
      });

      const eventPayload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: Math.round(total * 100),
            currency: 'kes',
            status: 'succeeded',
            latest_charge: `ch_test_${Date.now()}`,
            metadata: {
              orderNumber: order.orderNumber,
              orderId: order.id,
            },
          },
        },
      };

      const { payloadString, signature } = signPayload(eventPayload);

      const response = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });

      // Verify payment was marked as PAID
      const updatedPayment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntentId },
      });
      expect(updatedPayment?.status).toBe(PaymentModelStatus.PAID);
      expect(updatedPayment?.providerTransactionId).toBe(eventPayload.data.object.latest_charge);

      // Verify order was transitioned to PROCESSING and PAID
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrder?.status).toBe('PROCESSING');
      expect(updatedOrder?.paymentStatus).toBe('PAID');

      // Verify variant inventory:
      // Initial: stock = 10, reservedStock = 2
      // After successful payment: stock should be 8 (10 - 2), reservedStock should be 0 (2 - 2)
      const updatedVariant = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(updatedVariant?.stock).toBe(8);
      expect(updatedVariant?.reservedStock).toBe(0);
    });

    it('should be idempotent: duplicate delivery of payment_intent.succeeded must NOT deduct stock twice', async () => {
      const { order, variant, total } = await createTestOrderWithVariant(15, 3, 400);
      const paymentIntentId = `pi_test_dup_${Date.now()}`;

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: total,
          currency: 'KES',
          providerRequestId: paymentIntentId,
        },
      });

      const eventPayload = {
        id: `evt_dup_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: Math.round(total * 100),
            currency: 'kes',
            status: 'succeeded',
            latest_charge: `ch_dup_${Date.now()}`,
          },
        },
      };

      const { payloadString, signature } = signPayload(eventPayload);

      // 1st delivery
      const firstRes = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);
      expect(firstRes.status).toBe(200);

      // Check stock after 1st delivery
      const variantAfterFirst = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(variantAfterFirst?.stock).toBe(12); // 15 - 3
      expect(variantAfterFirst?.reservedStock).toBe(0); // 3 - 3

      // 2nd delivery (duplicate event from Stripe)
      const secondRes = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.message).toBe('Payment already processed');

      // Check stock after 2nd delivery - must remain exactly 12 and 0!
      const variantAfterSecond = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(variantAfterSecond?.stock).toBe(12);
      expect(variantAfterSecond?.reservedStock).toBe(0);
    });

    it('should reject mismatched payment amounts and NOT deduct inventory', async () => {
      const { order, variant, total } = await createTestOrderWithVariant(10, 1, 1000);
      const paymentIntentId = `pi_test_mismatch_${Date.now()}`;

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: total,
          currency: 'KES',
          providerRequestId: paymentIntentId,
        },
      });

      // Stripe event sends 500 KES (50000 cents) instead of authoritative 1000 KES (100000 cents)
      const eventPayload = {
        id: `evt_mismatch_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: 50000, // WRONG AMOUNT
            currency: 'kes',
            status: 'succeeded',
          },
        },
      };

      const { payloadString, signature } = signPayload(eventPayload);

      const res = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe('Amount or currency mismatch');

      // Payment marked failed
      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntentId },
      });
      expect(payment?.status).toBe(PaymentModelStatus.FAILED);
      expect(payment?.failureReason).toContain('Amount or currency mismatch');

      // Order remains PENDING_PAYMENT / UNPAID
      const currentOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(currentOrder?.status).toBe('PENDING_PAYMENT');
      expect(currentOrder?.paymentStatus).toBe('UNPAID');

      // Inventory remains unmodified
      const currentVariant = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(currentVariant?.stock).toBe(10);
      expect(currentVariant?.reservedStock).toBe(1);
    });

    it('should safely handle unknown PaymentIntent IDs without crashing', async () => {
      const unknownPiId = `pi_unknown_${Date.now()}`;
      const eventPayload = {
        id: `evt_unknown_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: unknownPiId,
            object: 'payment_intent',
            amount: 50000,
            currency: 'kes',
            status: 'succeeded',
          },
        },
      };

      const { payloadString, signature } = signPayload(eventPayload);

      const res = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);

      expect(res.status).toBe(200);
      expect(res.body.warning).toBe('Payment record not found');
    });

    it('should handle payment succeeding on an already CANCELLED order without double-decrementing stock', async () => {
      const { order, variant, total } = await createTestOrderWithVariant(10, 2, 500);
      const paymentIntentId = `pi_cancelled_${Date.now()}`;

      // Simulate order expiry/cancellation that released reservations
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { reservedStock: { decrement: 2 } }, // reservation already released by expiry job
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: total,
          currency: 'KES',
          providerRequestId: paymentIntentId,
        },
      });

      const eventPayload = {
        id: `evt_canc_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: Math.round(total * 100),
            currency: 'kes',
            status: 'succeeded',
          },
        },
      };

      const { payloadString, signature } = signPayload(eventPayload);

      const res = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);

      expect(res.status).toBe(200);

      // Payment recorded as PAID with manual review note
      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntentId },
      });
      expect(payment?.status).toBe(PaymentModelStatus.PAID);
      expect(payment?.failureReason).toContain('Requires manual review');

      // Stock should NOT have been decremented below 10!
      const finalVariant = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(finalVariant?.stock).toBe(10);
      expect(finalVariant?.reservedStock).toBe(0);
    });
  });

  describe('payment_intent.payment_failed Processing', () => {
    it('should persist failure reason and NOT prematurely cancel the order or release reserved stock', async () => {
      const { order, variant, total } = await createTestOrderWithVariant(10, 1, 800);
      const paymentIntentId = `pi_failed_${Date.now()}`;

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: total,
          currency: 'KES',
          providerRequestId: paymentIntentId,
        },
      });

      const eventPayload = {
        id: `evt_failed_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: Math.round(total * 100),
            currency: 'kes',
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              decline_code: 'insufficient_funds',
              message: 'Your card has insufficient funds.',
            },
          },
        },
      };

      const { payloadString, signature } = signPayload(eventPayload);

      const res = await request(app)
        .post('/api/payments/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payloadString);

      expect(res.status).toBe(200);

      // Verify payment was updated with failure reason
      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntentId },
      });
      expect(payment?.status).toBe(PaymentModelStatus.FAILED);
      expect(payment?.failureReason).toBe('Your card has insufficient funds.');

      // Order must NOT be cancelled (customer can retry payment)
      const currentOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(currentOrder?.status).toBe('PENDING_PAYMENT');

      // Reserved stock must remain intact during customer retry period
      const currentVariant = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });
      expect(currentVariant?.reservedStock).toBe(1);
    });
  });

  describe('Shared Payment Status endpoint', () => {
    it('should return paymentStatus, orderStatus, and latest payment record', async () => {
      const { order, total } = await createTestOrderWithVariant(5, 1, 300);

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PAID,
          amount: total,
          currency: 'KES',
          providerRequestId: `pi_status_test_${Date.now()}`,
        },
      });

      const res = await request(app)
        .get(`/api/payments/order/${order.orderNumber}/status`);

      expect(res.status).toBe(200);
      expect(res.body.paymentStatus).toBe('UNPAID'); // order payment status
      expect(res.body.orderStatus).toBe('PENDING_PAYMENT');
      expect(res.body.latestPayment).toBeDefined();
      expect(res.body.latestPayment.status).toBe('PAID');
    });
  });
});
