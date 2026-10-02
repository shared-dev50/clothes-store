import { Request, Response } from 'express';
import { PrismaClient, PaymentProvider, PaymentModelStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import Stripe from 'stripe';

const prisma = new PrismaClient();

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

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'PROCESSING'
          }
        });
      });
    } else {
      // Failed or cancelled
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentModelStatus.FAILED,
          failureReason: ResultDesc,
          metadata: callbackData
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
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const createStripePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      res.status(400).json({ error: 'orderNumber is required' });
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

    const amountInCents = Math.round(Number(order.total) * 100);

    let paymentIntent;
    
    if (STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      paymentIntent = { id: `pi_mock_${Date.now()}`, client_secret: `pi_mock_secret_${Date.now()}` };
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'kes',
        metadata: { orderNumber: order.orderNumber, orderId: order.id }
      });
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        status: PaymentModelStatus.PENDING,
        amount: Number(order.total),
        providerRequestId: paymentIntent.id
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe create error:', error);
    res.status(500).json({ error: 'Failed to create Stripe payment' });
  }
};

export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET === 'whsec_placeholder') {
      event = req.body; // Mock behavior
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig as string, STRIPE_WEBHOOK_SECRET);
    }
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntent.id }
      });

      if (payment && payment.status === PaymentModelStatus.PENDING) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentModelStatus.PAID,
              providerTransactionId: (paymentIntent.latest_charge as string) || paymentIntent.id,
              metadata: paymentIntent as any
            }
          });

          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'PROCESSING'
            }
          });
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await prisma.payment.findUnique({
        where: { providerRequestId: paymentIntent.id }
      });

      if (payment && payment.status === PaymentModelStatus.PENDING) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentModelStatus.FAILED,
            failureReason: paymentIntent.last_payment_error?.message,
            metadata: paymentIntent as any
          }
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handling error:', error);
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

    res.json({ paymentStatus: order.paymentStatus, latestPayment: order.payments[0] || null });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};
