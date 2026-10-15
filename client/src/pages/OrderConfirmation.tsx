import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  Smartphone,
  AlertCircle,
  XCircle,
  Clock,
  Truck,
  Package,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
  Copy,
  Check,
} from 'lucide-react';
import { getOrder, initiateMpesa, createStripePayment, getPaymentStatus } from '../services/orderApi';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { getStripePromise } from '../utils/stripe';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { PaymentStatusDialog, type PaymentDialogState } from '../components/ui/PaymentStatusDialog';
import toast from 'react-hot-toast';

interface CheckoutFormProps {
  orderNumber: string;
  clientSecret: string;
  customerName: string;
  customerEmail: string;
  onPaymentSuccess: () => void;
  onPaymentFailure: (err: string) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  orderNumber,
  clientSecret,
  customerName,
  customerEmail,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || processing) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setError(null);
    setProcessing(true);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerName,
            email: customerEmail,
          },
        },
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
        onPaymentFailure(result.error.message || 'Payment failed');
        setProcessing(false);
      } else if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') {
        // Poll backend to confirm webhook persisted the paid state
        for (let i = 0; i < 5; i++) {
          try {
            const statusData = await getPaymentStatus(orderNumber);
            if (statusData.paymentStatus === 'PAID') {
              break;
            }
          } catch {
            // ignore interim polling error
          }
          await new Promise((res) => setTimeout(res, 1200));
        }

        onPaymentSuccess();
      } else {
        const msg = `Unexpected payment status: ${result.paymentIntent?.status}`;
        setError(msg);
        onPaymentFailure(msg);
        setProcessing(false);
      }
    } catch (err: any) {
      const msg = err.message || 'An error occurred during payment processing';
      setError(msg);
      onPaymentFailure(msg);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-brand-stone/30 bg-brand-white space-y-4">
      <div className="p-3 bg-brand-white border border-brand-stone rounded focus-within:border-brand-black transition-colors">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '14px',
                color: '#1a1a1a',
                fontFamily: 'Inter, system-ui, sans-serif',
                '::placeholder': {
                  color: '#8e877e',
                },
              },
              invalid: {
                color: '#dc2626',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-brand-taupe">
        <ShieldCheck size={16} className="text-[#635BFF]" />
        <span>Secured and encrypted by Stripe</span>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-brand-black text-brand-white py-3 uppercase text-sm font-semibold tracking-wider hover:bg-brand-black/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-brand-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          'Pay with Card'
        )}
      </button>
    </form>
  );
};

export const OrderConfirmation: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // M-Pesa payment inputs & state
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaLoading, setMpesaLoading] = useState(false);

  // Stripe card state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [verifyEmailInput, setVerifyEmailInput] = useState('');

  // Payment Status Dialog state
  const [dialogState, setDialogState] = useState<PaymentDialogState>('idle');
  const [dialogProvider, setDialogProvider] = useState<'mpesa' | 'stripe'>('mpesa');
  const [dialogErrorMessage, setDialogErrorMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mpesaPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
    };
  }, []);

  const fetchOrder = useCallback(async (emailOverride?: string) => {
    if (!orderNumber) return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token');
      if (urlToken && typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(`guest_token_${orderNumber}`, urlToken);
        } catch {}
      }

      const data = await getOrder(orderNumber, urlToken || undefined, emailOverride);
      setOrder(data);
      setError('');
      if (data.paymentStatus === 'PAID') {
        useCartStore.getState().clearCart();
        useCartStore.getState().clearPendingOrder();
      }
      if (data.customerPhone) {
        setMpesaPhone(data.customerPhone);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    if (!orderNumber) {
      navigate('/');
      return;
    }

    fetchOrder();
  }, [orderNumber, navigate, fetchOrder]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchOrder();
    toast.success('Checking latest order status...', { id: 'status-refresh' });
  };

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      toast.success('Order number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startMpesaPolling = (orderNum: string) => {
    if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);

    let pollCount = 0;
    const maxPolls = 24; // 24 polls * 3s = 72s bounded polling

    mpesaPollingRef.current = setInterval(async () => {
      pollCount++;
      try {
        const statusData = await getPaymentStatus(orderNum);
        if (statusData.paymentStatus === 'PAID' || statusData.orderStatus === 'PROCESSING') {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setOrder((prev: any) => ({
            ...prev,
            paymentStatus: 'PAID',
            status: statusData.orderStatus || 'PROCESSING',
          }));
          useCartStore.getState().clearCart();
          useCartStore.getState().clearPendingOrder();
          setDialogState('success');
          setMpesaLoading(false);
        } else if (statusData.latestPayment?.status === 'FAILED') {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setDialogErrorMessage(
            statusData.latestPayment.failureReason || 'M-Pesa payment was cancelled or declined on your phone.'
          );
          setDialogState('failed');
          setMpesaLoading(false);
        } else if (pollCount >= maxPolls) {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setDialogState('unknown_outcome');
          setMpesaLoading(false);
        }
      } catch {
        if (pollCount >= maxPolls) {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setDialogState('unknown_outcome');
          setMpesaLoading(false);
        }
      }
    }, 3000);
  };

  const handleMpesaPay = async () => {
    if (!orderNumber || mpesaLoading) return;

    setMpesaLoading(true);
    setDialogProvider('mpesa');
    setDialogState('initiating');
    setDialogErrorMessage('');
    setIsDialogOpen(true);

    try {
      await initiateMpesa(orderNumber, mpesaPhone || order?.customerPhone);
      setDialogState('waiting_mpesa');
      startMpesaPolling(orderNumber);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('already sent')) {
        setDialogState('waiting_mpesa');
        startMpesaPolling(orderNumber);
      } else {
        setDialogErrorMessage(err.message || 'Failed to send M-Pesa prompt. Please try again.');
        setDialogState('failed');
        setMpesaLoading(false);
      }
    }
  };

  const handleStripePay = async () => {
    if (!orderNumber || stripeLoading) return;

    setStripeLoading(true);
    setStripeError(null);
    try {
      const res = await createStripePayment(orderNumber);
      const promise = await getStripePromise(res.publishableKey);
      if (!promise) {
        setStripeError('Stripe publishable key is not configured.');
        return;
      }
      setStripePromise(Promise.resolve(promise));
      setStripeClientSecret(res.clientSecret);
    } catch (err: any) {
      setStripeError(err.message || 'Failed to initialize card payment');
    } finally {
      setStripeLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} /> Delivered
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <Truck size={12} /> Shipped
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Package size={12} /> Processing
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={12} /> Pending Payment
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Paid
          </span>
        );
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Unpaid
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            Failed
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-28 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm uppercase tracking-widest text-brand-taupe font-semibold">
          Loading order details...
        </p>
      </div>
    );
  }

  // 2. Error / Guest verification required state
  if (error || !order) {
    const isVerificationNeeded = Boolean(
      error &&
        (error.toLowerCase().includes('access denied') ||
          error.toLowerCase().includes('email is required') ||
          error.toLowerCase().includes('forbidden'))
    );

    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        {isVerificationNeeded ? (
          <div>
            <h1 className="text-2xl font-display uppercase tracking-widest mb-4 text-brand-black">
              Order Verification Required
            </h1>
            <p className="text-brand-taupe mb-6 text-sm max-w-md mx-auto leading-relaxed">
              To protect your privacy and personal contact information, please enter the email address used during
              checkout to view order #{orderNumber}.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (verifyEmailInput.trim()) {
                  setLoading(true);
                  fetchOrder(verifyEmailInput.trim());
                }
              }}
              className="max-w-md mx-auto mb-8 flex gap-2"
            >
              <input
                type="email"
                value={verifyEmailInput}
                onChange={(e) => setVerifyEmailInput(e.target.value)}
                placeholder="Enter checkout email"
                required
                className="flex-1 px-3 py-3 border border-brand-stone bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-brand-black"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-taupe transition-colors"
              >
                Verify
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-display uppercase tracking-widest mb-4 text-rose-600">
              Order Not Found
            </h1>
            <p className="text-brand-taupe mb-8">{error || 'We could not find the order you are looking for.'}</p>
          </div>
        )}
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  const isPaid = order.paymentStatus === 'PAID';
  const isCancelled = order.status === 'CANCELLED';
  const isFailed = order.paymentStatus === 'FAILED';

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col items-center">
      {/* Dynamic Status Header */}
      <div className="text-center mb-8 w-full">
        {isPaid ? (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mb-5 shadow-xs">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display uppercase tracking-widest mb-3 text-brand-black">
              Order Confirmed & Paid
            </h1>
            <p className="text-brand-taupe text-sm max-w-md mx-auto leading-relaxed">
              Thank you for your purchase, <strong className="text-brand-black">{order.customerName}</strong>. Your payment
              of <strong className="text-brand-black">KES {Number(order.total).toLocaleString()}</strong> has been verified
              and your order is being prepared.
            </p>
          </div>
        ) : isCancelled ? (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-zinc-100 border border-zinc-300 text-zinc-600 rounded-full flex items-center justify-center mb-5 shadow-xs">
              <XCircle size={36} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display uppercase tracking-widest mb-3 text-zinc-800">
              Order Cancelled
            </h1>
            <p className="text-brand-taupe text-sm max-w-md mx-auto leading-relaxed">
              Order #{order.orderNumber} was cancelled and reserved inventory has been released.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mb-5 shadow-xs">
              <Clock size={36} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display uppercase tracking-widest mb-3 text-brand-black">
              {isFailed ? 'Payment Incomplete' : 'Payment Pending'}
            </h1>
            <p className="text-brand-taupe text-sm max-w-md mx-auto leading-relaxed">
              Your order <strong className="text-brand-black">#{order.orderNumber}</strong> is registered and your items are
              reserved. Please complete payment below to finalize your purchase.
            </p>
          </div>
        )}
      </div>

      {/* Payment Options Section (when unpaid and not cancelled) */}
      {!isPaid && !isCancelled && (
        <div className="w-full max-w-2xl mb-8 space-y-6">
          <div className="bg-brand-stone/10 p-6 md:p-8 text-left border border-brand-stone/30">
            <div className="flex items-center justify-between border-b border-brand-stone/30 pb-3 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-black">
                Complete Your Payment
              </h3>
              <span className="text-xs uppercase tracking-wider text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Action Required
              </span>
            </div>
            <p className="text-xs text-brand-taupe mb-6 leading-relaxed">
              Select your preferred payment method below. Your order total is{' '}
              <strong className="text-brand-black">KES {Number(order.total).toLocaleString()}</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* M-PESA Option */}
              <div className="border border-brand-stone/50 bg-brand-white p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-3 text-[#4CAF50]">
                    <Smartphone size={20} /> Pay with M-Pesa
                  </div>
                  <label className="block text-xs font-medium text-brand-taupe mb-1">M-Pesa Phone Number</label>
                  <input
                    type="text"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full border border-brand-stone p-2.5 mb-4 text-sm focus:outline-none focus:border-brand-black"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMpesaPay}
                  disabled={mpesaLoading}
                  className="w-full bg-[#4CAF50] text-white py-3 uppercase text-xs font-semibold tracking-wider hover:bg-[#45a049] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {mpesaLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Prompt...
                    </>
                  ) : (
                    'Send M-Pesa Prompt'
                  )}
                </button>
              </div>

              {/* STRIPE CARD Option */}
              <div className="border border-brand-stone/50 bg-brand-white p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-3 text-[#635BFF]">
                    <CreditCard size={20} /> Pay with Card
                  </div>
                  {!stripeClientSecret ? (
                    <div>
                      <p className="text-xs text-brand-taupe mb-4 leading-relaxed">
                        Pay securely with your credit or debit card via Stripe.
                      </p>
                      <button
                        type="button"
                        onClick={handleStripePay}
                        disabled={stripeLoading}
                        className="w-full bg-[#635BFF] text-white py-3 uppercase text-xs font-semibold tracking-wider hover:bg-[#5249E5] transition-colors disabled:opacity-50"
                      >
                        {stripeLoading ? 'Initializing...' : 'Pay with Card'}
                      </button>
                      {stripeError && <p className="mt-3 text-xs text-red-500 font-medium">{stripeError}</p>}
                    </div>
                  ) : (
                    stripePromise && (
                      <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                        <CheckoutForm
                          orderNumber={order.orderNumber}
                          clientSecret={stripeClientSecret}
                          customerName={order.customerName}
                          customerEmail={order.customerEmail}
                          onPaymentSuccess={() => {
                            setOrder((prev: any) => ({
                              ...prev,
                              paymentStatus: 'PAID',
                              status: 'PROCESSING',
                            }));
                            useCartStore.getState().clearCart();
                            useCartStore.getState().clearPendingOrder();
                            setDialogProvider('stripe');
                            setDialogState('success');
                            setIsDialogOpen(true);
                          }}
                          onPaymentFailure={(msg) => {
                            setDialogProvider('stripe');
                            setDialogErrorMessage(msg);
                            setDialogState('failed');
                            setIsDialogOpen(true);
                          }}
                        />
                      </Elements>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Container */}
      <div className="bg-brand-stone/10 p-6 md:p-8 w-full max-w-2xl text-left mb-8 border border-brand-stone/30">
        {/* Header bar with order number and badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-brand-stone/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-taupe">Order Number:</span>
              <span className="font-semibold text-brand-black">{order.orderNumber}</span>
              <button
                type="button"
                onClick={copyOrderNumber}
                aria-label="Copy order number"
                className="p-1 text-brand-taupe hover:text-brand-black transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-xs text-brand-taupe">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {getOrderStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
          </div>
        </div>

        {/* Customer & Delivery Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 border-b border-brand-stone/30 pb-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-taupe mb-2">Customer</h3>
            <div className="text-sm text-brand-black space-y-0.5">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-xs text-brand-taupe">{order.customerEmail}</p>
              <p className="text-xs text-brand-taupe">{order.customerPhone}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-taupe mb-2">Delivery Address</h3>
            <div className="text-sm text-brand-black space-y-0.5">
              <p>{order.deliveryAddress}</p>
              <p>{order.county}, Kenya</p>
              {order.deliveryNotes && (
                <p className="text-xs text-brand-taupe italic mt-1">Note: {order.deliveryNotes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Purchased Items List */}
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-taupe mb-3">Items Purchased</h3>
        <div className="space-y-3 mb-6 border-b border-brand-stone/30 pb-6 divide-y divide-brand-stone/20">
          {order.items?.map((item: any) => (
            <div key={item.id} className="pt-3 first:pt-0 flex justify-between items-start text-sm gap-4">
              <div className="flex-grow">
                <span className="font-medium text-brand-black">{item.productName}</span>
                {item.variantInfo && (
                  <span className="text-brand-taupe text-xs ml-2">({item.variantInfo})</span>
                )}
                <div className="text-xs text-brand-taupe mt-0.5">
                  Qty: {item.quantity} × KES {Number(item.unitPrice).toLocaleString()}
                </div>
              </div>
              <div className="text-right font-medium text-brand-black whitespace-nowrap">
                KES {Number(item.totalPrice).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="space-y-2 text-sm text-brand-black mb-6 border-b border-brand-stone/30 pb-6">
          <div className="flex justify-between">
            <span className="text-brand-taupe">Subtotal</span>
            <span>KES {Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-taupe">Delivery Fee</span>
            <span>{Number(order.deliveryFee) === 0 ? 'Free' : `KES ${Number(order.deliveryFee).toLocaleString()}`}</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-lg md:text-xl font-bold text-brand-black">
          <span className="uppercase tracking-widest">Total</span>
          <span>KES {Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      {/* Bottom Navigation & Utility Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-2xl justify-center">
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="w-full sm:w-auto px-6 py-3.5 bg-brand-white text-brand-black border border-brand-stone text-xs font-semibold uppercase tracking-widest hover:bg-brand-stone/10 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Checking...' : 'Refresh Status'}
        </button>

        {isAuthenticated() && (
          <Link
            to="/orders"
            className="w-full sm:w-auto px-6 py-3.5 bg-brand-white text-brand-black border border-brand-stone text-xs font-semibold uppercase tracking-widest hover:bg-brand-stone/10 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag size={14} /> My Orders
          </Link>
        )}

        <Link
          to="/shop"
          className="w-full sm:w-auto px-8 py-3.5 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors flex items-center justify-center gap-2"
        >
          Continue Shopping <ArrowRight size={14} />
        </Link>
      </div>

      {/* Integrated Payment Status Dialog */}
      <PaymentStatusDialog
        isOpen={isDialogOpen}
        state={dialogState}
        provider={dialogProvider}
        orderNumber={order?.orderNumber}
        amount={Number(order?.total)}
        phoneNumber={mpesaPhone || order?.customerPhone}
        errorMessage={dialogErrorMessage}
        onClose={() => {
          setIsDialogOpen(false);
          fetchOrder();
        }}
        onViewOrder={() => {
          setIsDialogOpen(false);
          fetchOrder();
        }}
        onRetry={() => {
          setIsDialogOpen(false);
          setDialogState('idle');
          setMpesaLoading(false);
        }}
        onCheckMyOrders={() => {
          setIsDialogOpen(false);
          navigate('/orders');
        }}
      />
    </div>
  );
};
