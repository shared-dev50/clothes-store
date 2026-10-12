import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { getStripeConfig } from '../services/orderApi';

const stripePromiseCache: Record<string, Promise<Stripe | null>> = {};

export const getStripePromise = async (fallbackKey?: string): Promise<Stripe | null> => {
  let publishableKey = fallbackKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey === 'pk_test_placeholder') {
    try {
      const config = await getStripeConfig();
      if (config.publishableKey && config.publishableKey !== 'pk_test_placeholder') {
        publishableKey = config.publishableKey;
      }
    } catch {
      // ignore
    }
  }

  if (!publishableKey || publishableKey === 'pk_test_placeholder') {
    return null;
  }

  if (!stripePromiseCache[publishableKey]) {
    stripePromiseCache[publishableKey] = loadStripe(publishableKey);
  }

  return stripePromiseCache[publishableKey];
};
