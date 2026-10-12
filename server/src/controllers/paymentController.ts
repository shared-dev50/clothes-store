import { Request, Response } from 'express';
import { PaymentProvider, PaymentModelStatus } from '@prisma/client';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import Stripe from 'stripe';

// ==========================================
// M-PESA DARAJA
// ==========================================
const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY || 'placeholder_consumer_key';
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET || 'placeholder_consumer_secret';
const DARAJA_SHORTCODE = process.env.DARAJA_SHORTCODE || '174379';
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY || 'placeholder_passkey';
const DARAJA_CALLBACK_URL = process.env.DARAJA_CALLBACK_URL || 'https://my-domain.com/api/payments/mpesa/callback';
const DARAJA_ENVIRONMENT = process.env.DARAJA_ENVIRONMENT || 'sandbox';

const normalizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

const getDarajaToken = async (): Promise<string> => {
  if (DARAJA_CONSUMER_KEY === 'placeholder_consumer_key') {
    return 'mock_daraja_token';
  }
  
  const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
  const url = DARAJA_ENVIRONMENT === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!response.ok) throw new Error('Failed to generate Daraja token');
  const data = await response.json();
  return data.access_token;
};

export const initiateMpesa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber, phoneNumber } = req.body;

    if (!orderNumber || !phoneNumber) {
      res.status(400).json({ error: 'orderNumber and phoneNumber are required' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.userId && order.userId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (order.status !== 'PENDING_PAYMENT' || order.paymentStatus !== 'UNPAID') {
      res.status(400).json({ error: 'Order is not in a payable state' });
      return;
    }

    if (order.expiresAt && order.expiresAt < new Date()) {
      res.status(400).json({ error: 'This order reservation has expired. Please create a new order.' });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (normalizedPhone.length !== 12) {
      res.status(400).json({ error: 'Invalid Kenyan phone number format' });
      return;
    }

    const amount = Math.round(Number(order.total));
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString('base64');

    let checkoutRequestId = `MOCK_REQ_${Date.now()}`;
    let customerMessage = 'Success. Request accepted for processing';

    if (DARAJA_CONSUMER_KEY !== 'placeholder_consumer_key') {
      const token = await getDarajaToken();
      const url = DARAJA_ENVIRONMENT === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      const payload = {
        BusinessShortCode: DARAJA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: normalizedPhone,
        PartyB: DARAJA_SHORTCODE,
        PhoneNumber: normalizedPhone,
        CallBackURL: DARAJA_CALLBACK_URL,
        AccountReference: orderNumber,
        TransactionDesc: `Payment for Order ${orderNumber}`
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.errorMessage) {
        res.status(400).json({ error: data.errorMessage });
        return;
      }

      checkoutRequestId = data.CheckoutRequestID;
      customerMessage = data.CustomerMessage || customerMessage;
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.MPESA,
        status: PaymentModelStatus.PENDING,
        amount: amount,
        phoneNumber: normalizedPhone,
        providerRequestId: checkoutRequestId
      }
    });

    res.json({ message: customerMessage, checkoutRequestId });
  } catch (error: any) {
    console.error('Mpesa initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

export const mpesaCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) {
      res.status(400).json({ error: 'Invalid callback data' });
      return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

    const payment = await prisma.payment.findUnique({
      where: { providerRequestId: CheckoutRequestID }
    });

    if (!payment) {
      console.warn(`Payment not found for CheckoutRequestID: ${CheckoutRequestID}`);
      res.status(200).send('OK'); // Always return OK to Daraja to stop retries
      return;
    }

    if (payment.status !== PaymentModelStatus.PENDING) {
      // Idempotent: already processed
      res.status(200).send('OK');
      return;
    }

    if (ResultCode === 0) {
      // Success
      const meta = CallbackMetadata?.Item || [];
      const receipt = meta.find((m: any) => m.Name === 'MpesaReceiptNumber')?.Value;
      const amountPaid = meta.find((m: any) => m.Name === 'Amount')?.Value;

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.PAID,
            providerTransactionId: receipt,
            receipt: receipt,
            metadata: callbackData
          }
        });

        const updateResult = await tx.order.updateMany({
          where: { id: payment.orderId, status: 'PENDING_PAYMENT' },
          data: {
            paymentStatus: 'PAID',
            status: 'PROCESSING'
          }
        });

        if (updateResult.count === 1) {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId },
            include: { items: true }
          });
          
          if (order) {
            for (const item of order.items) {
              if (item.variantId) {
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: {
                    stock: { decrement: item.quantity },
                    reservedStock: { decrement: item.quantity }
                  }
                });
              }
            }
          }
        }
      });
    } else {
      // Failed or cancelled
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.FAILED,
            failureReason: ResultDesc,
            metadata: callbackData
          }
        });

        const updateResult = await tx.order.updateMany({
          where: { id: payment.orderId, status: 'PENDING_PAYMENT' },
          data: { status: 'CANCELLED' }
        });

        if (updateResult.count === 1) {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId },
            include: { items: true }
          });
          
          if (order) {
            for (const item of order.items) {
              if (item.variantId) {
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { reservedStock: { decrement: item.quantity } }
                });
              }
            }
          }
        }
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Mpesa callback error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ==========================================
// STRIPE
// ==========================================
const getStripeInstance = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_test_placeholder') {
    throw new Error('STRIPE_NOT_CONFIGURED');
  }
  return new Stripe(secretKey);
};

export const getStripeConfig = async (_req: Request, res: Response): Promise<void> => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  res.json({ publishableKey });
};

export const createStripePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      res.status(400).json({ error: 'orderNumber is required' });
      return;
    }

    let stripe: Stripe;
    try {
      stripe = getStripeInstance();
    } catch {
      res.status(503).json({ error: 'Stripe payments are not configured on this server.' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        payments: {
          where: { provider: PaymentProvider.STRIPE },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.userId && order.userId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res.status(400).json({ error: 'Order has already been paid' });
      return;
    }

    if (order.status !== 'PENDING_PAYMENT' || order.paymentStatus !== 'UNPAID') {
      res.status(400).json({ error: 'Order is not in a payable state' });
      return;
    }

    if (order.expiresAt && order.expiresAt < new Date()) {
      res.status(400).json({ error: 'This order reservation has expired. Please create a new order.' });
      return;
    }

    const total = Number(order.total);
    if (isNaN(total) || total <= 0) {
      res.status(400).json({ error: 'Invalid order amount' });
      return;
    }

    const amountInCents = Math.round(total * 100);

    let paymentIntent: Stripe.PaymentIntent | null = null;
    const pendingPayment = order.payments.find(p => p.status === PaymentModelStatus.PENDING && p.providerRequestId);

    if (pendingPayment?.providerRequestId) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(pendingPayment.providerRequestId);
        if (
          ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPi.status) &&
          existingPi.amount === amountInCents &&
          existingPi.currency.toLowerCase() === 'kes'
        ) {
          paymentIntent = existingPi;
        }
      } catch (e) {
        console.warn(`Could not reuse existing PaymentIntent ${pendingPayment.providerRequestId}, creating a new one.`);
      }
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'kes',
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderNumber: order.orderNumber,
          orderId: order.id
        },
        description: `Order ${order.orderNumber}`
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentModelStatus.PENDING,
          amount: order.total,
          currency: 'KES',
          providerRequestId: paymentIntent.id,
          metadata: {
            paymentIntentId: paymentIntent.id,
            currency: paymentIntent.currency,
            amount: paymentIntent.amount
          }
        }
      });
    }

    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey
    });
  } catch (error: any) {
    console.error('Stripe payment creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Stripe payment' });
  }
};

export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  if (!sig || typeof sig !== 'string') {
    res.status(400).send('Webhook Error: Missing Stripe signature header');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    console.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is unconfigured.');
    res.status(503).send('Stripe webhook signing secret is not configured');
    return;
  }

  let stripe: Stripe;
  try {
    stripe = getStripeInstance();
  } catch {
    res.status(503).send('Stripe is not configured');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe signature verification failed:', err.message);
    res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;

      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntentId },
        include: {
          order: {
            include: { items: true }
          }
        }
      });

      if (!payment) {
        console.warn(`Payment not found for PaymentIntent: ${paymentIntentId}`);
        res.status(200).json({ received: true, warning: 'Payment record not found' });
        return;
      }

      // Idempotency: If payment is already marked as PAID, acknowledge without re-deducting stock
      if (payment.status === PaymentModelStatus.PAID) {
        res.status(200).json({ received: true, message: 'Payment already processed' });
        return;
      }

      const order = payment.order;
      if (!order) {
        res.status(200).json({ received: true, warning: 'Order not found for payment' });
        return;
      }

      // Verify amount and currency against authoritative order record
      const expectedAmountInCents = Math.round(Number(order.total) * 100);
      if (paymentIntent.amount !== expectedAmountInCents || paymentIntent.currency.toLowerCase() !== 'kes') {
        console.error(`Amount/currency mismatch for order ${order.orderNumber}: expected ${expectedAmountInCents} kes, received ${paymentIntent.amount} ${paymentIntent.currency}`);
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.FAILED,
            failureReason: `Amount or currency mismatch: expected ${expectedAmountInCents} kes, got ${paymentIntent.amount} ${paymentIntent.currency}`,
            metadata: {
              paymentIntentId: paymentIntent.id,
              receivedAmount: paymentIntent.amount,
              receivedCurrency: paymentIntent.currency
            }
          }
        });
        res.status(200).json({ received: true, error: 'Amount or currency mismatch' });
        return;
      }

      // If the order has already been cancelled/expired, record payment for manual admin action
      // but DO NOT deduct stock or release reservations that were already released!
      if (order.status === 'CANCELLED') {
        console.warn(`Payment succeeded for already CANCELLED order ${order.orderNumber}. Preserving stock and marking payment for review.`);
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.PAID,
            providerTransactionId: (paymentIntent.latest_charge as string) || paymentIntent.id,
            receipt: paymentIntent.id,
            failureReason: 'Payment succeeded after order was cancelled/expired. Requires manual review.',
            metadata: {
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              orderWasCancelled: true
            }
          }
        });
        res.status(200).json({ received: true, note: 'Payment recorded on cancelled order' });
        return;
      }

      // Normal valid payment: atomically update payment, order, and inventory in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.PAID,
            providerTransactionId: (paymentIntent.latest_charge as string) || paymentIntent.id,
            receipt: paymentIntent.id,
            failureReason: null,
            metadata: {
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency
            }
          }
        });

        const updateResult = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING_PAYMENT' },
          data: {
            paymentStatus: 'PAID',
            status: 'PROCESSING'
          }
        });

        // Deduct physical stock and release reservation EXACTLY ONCE
        if (updateResult.count === 1) {
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stock: { decrement: item.quantity },
                  reservedStock: { decrement: item.quantity }
                }
              });
            }
          }
        }
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;

      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntentId }
      });

      if (payment && payment.status === PaymentModelStatus.PENDING) {
        const failureMessage = paymentIntent.last_payment_error?.message || 'Payment attempt failed';
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.FAILED,
            failureReason: failureMessage,
            metadata: {
              paymentIntentId: paymentIntent.id,
              errorCode: paymentIntent.last_payment_error?.code,
              declineCode: paymentIntent.last_payment_error?.decline_code
            }
          }
        });
        // Note: Do NOT cancel the order or release reserved stock here.
        // Customer is allowed to retry within the 30-minute reservation window.
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ==========================================
// SHARED STATUS
// ==========================================
export const getPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payments: { orderBy: { createdAt: 'desc' } } }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.userId && order.userId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      latestPayment: order.payments[0] || null
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};
