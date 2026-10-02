import { Router } from 'express';
import express from 'express';
import { initiateMpesa, mpesaCallback, createStripePayment, stripeWebhook, getPaymentStatus } from '../controllers/paymentController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

// M-Pesa
router.post('/mpesa/stk-push', optionalAuthenticate, initiateMpesa);
router.post('/mpesa/callback', mpesaCallback);

// Stripe
router.post('/stripe/create', optionalAuthenticate, createStripePayment);
// Stripe webhook body is parsed as raw buffer in index.ts before express.json()
router.post('/stripe/webhook', stripeWebhook);

// Status
router.get('/order/:orderNumber/status', optionalAuthenticate, getPaymentStatus);

export default router;
