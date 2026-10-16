import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, isCartMatchingSnapshot } from '../store/cartStore';
import { ArrowLeft, CreditCard, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';
import { createOrder, initiateMpesa, createStripePayment, getPaymentStatus, getOrder, cancelOrder } from '../services/orderApi';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { getStripePromise } from '../utils/stripe';
import { PaymentStatusDialog, type PaymentDialogState } from '../components/ui/PaymentStatusDialog';

interface StripeCardSectionProps {
  formData: {
    email: string;
    firstName: string;
    lastName: string;
    address: string;
    apartment: string;
    city: string;
    phone: string;
  };
  cart: any[];
  total: number;
  activeOrder: any;
  setActiveOrder: (order: any) => void;
  onSuccess: (orderNumber: string, amount: number) => void;
  onProcessing: (orderNumber: string) => void;
  onFailure: (errorMessage: string) => void;
  onPending: (orderNumber: string) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  onReturnToInfo: () => void;
}

const StripeCardSection: React.FC<StripeCardSectionProps> = ({
  formData,
  cart,
  total,
  activeOrder,
  setActiveOrder,
  onSuccess,
  onProcessing,
  onFailure,
  onPending,
  isProcessing,
  setIsProcessing,
  onReturnToInfo
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { pendingOrder, setPendingOrder } = useCartStore();
  const [nameOnCard, setNameOnCard] = useState(`${formData.firstName} ${formData.lastName}`.trim());
  const [cardError, setCardError] = useState<string | null>(null);

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || isProcessing) {
      if (!stripe || !elements) {
        toast.error('Payment system is initializing. Please wait a moment.');
      }
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card input is not loaded.');
      return;
    }

    setCardError(null);
    setIsProcessing(true);

    try {
      let order = activeOrder;

      // Create order if not already created in this session
      if (!order) {
        const payload = {
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerEmail: formData.email,
          customerPhone: formData.phone,
          deliveryAddress: `${formData.address} ${formData.apartment}`.trim() || 'N/A',
          county: formData.city || 'N/A',
          items: cart.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
          })),
          replaceOrderNumber: pendingOrder?.orderNumber
        };

        order = await createOrder(payload);
        setActiveOrder(order);
        setPendingOrder({
          orderNumber: order.orderNumber,
          itemsSnapshot: cart.map(item => ({ variantId: item.variantId, quantity: item.quantity }))
        });
      }

      onProcessing(order.orderNumber);

      // Initialize Stripe payment on backend
      const { clientSecret } = await createStripePayment(order.orderNumber);

      if (!clientSecret) {
        throw new Error('Could not obtain Stripe client secret.');
      }

      // Securely confirm card payment with Stripe.js
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: nameOnCard || `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            phone: formData.phone,
            address: {
              line1: formData.address || undefined,
              line2: formData.apartment || undefined,
              city: formData.city || undefined,
              country: 'KE'
            }
          }
        }
      });

      if (result.error) {
        const errMsg = result.error.message || 'Payment failed';
        setCardError(errMsg);
        onFailure(errMsg);
        setIsProcessing(false);
        return;
      }

      if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') {
        let backendConfirmed = false;
        let backendFailed = false;
        let failReason = '';

        for (let i = 0; i < 12; i++) {
          try {
            const statusData = await getPaymentStatus(order.orderNumber);
            if (statusData.paymentStatus === 'PAID' || statusData.orderStatus === 'PROCESSING') {
              backendConfirmed = true;
              break;
            } else if (statusData.latestPayment?.status === 'FAILED') {
              backendFailed = true;
              failReason = statusData.latestPayment.failureReason || 'Card payment was declined.';
              break;
            }
          } catch {
          }
          await new Promise(res => setTimeout(res, 1500));
        }

        const finalAmount = order.total ? Number(order.total) : total;

        if (backendConfirmed) {
          onSuccess(order.orderNumber, finalAmount);
        } else if (backendFailed) {
          onFailure(failReason);
        } else {
          // Webhook delayed; do not show false success or false failure
          onPending(order.orderNumber);
        }
      } else {
        const msg = `Payment status: ${result.paymentIntent?.status || 'Unknown'}`;
        setCardError(msg);
        onFailure(msg);
      }
    } catch (err: any) {
      console.error('Card payment error:', err);
      const msg = err.message || 'Failed to complete payment';
      setCardError(msg);
      onFailure(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleCardPayment} className="space-y-4">
      <div className="p-6 bg-brand-stone/5 border-t border-brand-stone space-y-4 animate-in fade-in">
        <div>
          <label className="block text-xs uppercase tracking-wider text-brand-taupe mb-2">Card Details</label>
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
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-brand-taupe mb-2">Name on Card</label>
          <input
            type="text"
            value={nameOnCard}
            onChange={e => setNameOnCard(e.target.value)}
            placeholder="Cardholder Name"
            className="w-full bg-brand-white border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black"
          />
        </div>

        {cardError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded">
            <AlertCircle size={16} className="shrink-0" />
            <span>{cardError}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-brand-taupe pt-1">
          <ShieldCheck size={16} className="text-[#635BFF]" />
          <span>Encrypted and secured by Stripe. Test card payments supported.</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={onReturnToInfo}
          disabled={isProcessing}
          className="text-xs uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Return to information
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[220px] justify-center"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-brand-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : activeOrder ? (
            `Retry Payment (KES ${total.toLocaleString()})`
          ) : (
            `Pay with Card (KES ${total.toLocaleString()})`
          )}
        </button>
      </div>
    </form>
  );
};

export const Checkout: React.FC = () => {
  const { cart, clearCart, pendingOrder, setPendingOrder, clearPendingOrder } = useCartStore();
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const total = subtotal;
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingOrder, setIsVerifyingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [cartMismatchWarning, setCartMismatchWarning] = useState<string | null>(null);

  // Confirmed order details preserved after cart clearing
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    total: number;
    paymentMethod: 'mpesa' | 'stripe';
    phone?: string;
    items?: any[];
  } | null>(null);

  const itemsToDisplay = cart.length > 0 ? cart : (confirmedOrder?.items || []);
  const totalToDisplay = cart.length > 0 ? total : (confirmedOrder?.total ?? 0);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: 'Nairobi',
    phone: '',
  });

  const [mpesaPhone, setMpesaPhone] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeConfigChecked, setStripeConfigChecked] = useState(false);
  const [hasStripePublishableKey, setHasStripePublishableKey] = useState(false);

  // Payment Status Dialog state
  const [dialogState, setDialogState] = useState<PaymentDialogState>('idle');
  const [dialogProvider, setDialogProvider] = useState<'mpesa' | 'stripe'>('mpesa');
  const [dialogOrderNumber, setDialogOrderNumber] = useState<string>('');
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const mpesaPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling timers on unmount
  useEffect(() => {
    return () => {
      if (mpesaPollingRef.current) {
        clearInterval(mpesaPollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    getStripePromise().then(promise => {
      setStripeConfigChecked(true);
      if (promise) {
        setStripePromise(Promise.resolve(promise));
        setHasStripePublishableKey(true);
      } else {
        setHasStripePublishableKey(false);
      }
    });
  }, []);

  // Pending order recovery effect
  useEffect(() => {
    let isMounted = true;
    const verifyAndResumePendingOrder = async () => {
      if (!pendingOrder?.orderNumber) {
        return;
      }

      try {
        setIsVerifyingOrder(true);
        const order = await getOrder(pendingOrder.orderNumber);
        if (!isMounted) return;

        // 1. If paid or processing: clear checkout references and navigate to confirmation
        if (order.paymentStatus === 'PAID' || order.status === 'PROCESSING') {
          clearPendingOrder();
          clearCart();
          toast.success('Your order has already been paid!');
          navigate(`/order-confirmation/${order.orderNumber}`);
          return;
        }

        // 2. If cancelled: clear stale reference
        if (order.status === 'CANCELLED') {
          clearPendingOrder();
          toast('Previous checkout was cancelled. Starting a fresh order.', { icon: 'ℹ️' });
          return;
        }

        // 3. If expired: clear stale reference
        if (order.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()) {
          clearPendingOrder();
          toast('Previous checkout reservation expired. Starting a fresh order.', { icon: '⏰' });
          return;
        }

        // 4. Verify order is in pending payment status
        if (order.status !== 'PENDING_PAYMENT') {
          clearPendingOrder();
          return;
        }

        // 5. Verify exact cart contents match backend order items
        const matchesCart = isCartMatchingSnapshot(cart, order.items);
        if (!matchesCart) {
          setCartMismatchWarning(
            `You have a pending order #${order.orderNumber}, but your cart has changed. Abandon it to proceed with your current cart.`
          );
          return;
        }

        // 6. Eligible pending order: safely resume without creating a duplicate!
        setActiveOrder(order);
        setFormData(prev => ({
          ...prev,
          email: order.customerEmail || prev.email,
          firstName: order.customerName ? order.customerName.split(' ')[0] : prev.firstName,
          lastName: order.customerName ? order.customerName.split(' ').slice(1).join(' ') : prev.lastName,
          address: order.deliveryAddress && order.deliveryAddress !== 'N/A' ? order.deliveryAddress : prev.address,
          city: order.county && order.county !== 'N/A' ? order.county : prev.city,
          phone: order.customerPhone || prev.phone,
        }));
        if (order.customerPhone) {
          setMpesaPhone(order.customerPhone);
        }
        setStep(2);
        toast.success(`Resumed pending order #${order.orderNumber}`, { id: 'order-resumed' });
      } catch (err: any) {
        console.warn('Could not verify pending order:', err);
        clearPendingOrder();
      } finally {
        if (isMounted) {
          setIsVerifyingOrder(false);
        }
      }
    };

    verifyAndResumePendingOrder();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'phone') {
      setMpesaPhone(value);
    }
  };

  const handleAbandonOrder = async () => {
    const orderNum = activeOrder?.orderNumber || pendingOrder?.orderNumber;
    if (orderNum) {
      try {
        setIsProcessing(true);
        await cancelOrder(orderNum);
        toast.success(`Order #${orderNum} cancelled and reserved inventory released.`);
      } catch (e: any) {
        console.warn('Failed to cancel order:', e);
      } finally {
        setIsProcessing(false);
      }
    }
    setActiveOrder(null);
    clearPendingOrder();
    setCartMismatchWarning(null);
    setStep(1);
  };

  const startMpesaPolling = (orderNum: string, orderTotal: number) => {
    if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);

    let pollCount = 0;
    const maxPolls = 24;

    mpesaPollingRef.current = setInterval(async () => {
      pollCount++;
      try {
        const statusData = await getPaymentStatus(orderNum);
        if (statusData.paymentStatus === 'PAID' || statusData.orderStatus === 'PROCESSING') {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setConfirmedOrder({
            orderNumber: orderNum,
            total: orderTotal,
            paymentMethod: 'mpesa',
            phone: mpesaPhone || formData.phone,
            items: [...cart],
          });
          setDialogProvider('mpesa');
          setDialogOrderNumber(orderNum);
          setDialogState('success');
          setIsDialogOpen(true);
          setIsProcessing(false);
          clearCart();
          clearPendingOrder();
        } else if (statusData.latestPayment?.status === 'FAILED') {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setDialogErrorMessage(
            statusData.latestPayment.failureReason || 'M-Pesa payment prompt was cancelled or declined on your phone.'
          );
          setDialogProvider('mpesa');
          setDialogState('failed');
          setIsProcessing(false);
        } else if (pollCount >= maxPolls) {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);

          setDialogProvider('mpesa');
          setDialogOrderNumber(orderNum);
          setDialogState('unknown_outcome');
          setIsProcessing(false);
        }
      } catch {
        if (pollCount >= maxPolls) {
          if (mpesaPollingRef.current) clearInterval(mpesaPollingRef.current);
          setDialogProvider('mpesa');
          setDialogOrderNumber(orderNum);
          setDialogState('unknown_outcome');
          setIsProcessing(false);
        }
      }
    }, 3000);
  };

  const handleMpesaOrder = async () => {
    if (isProcessing) return;

    if (!formData.email || !formData.firstName || !formData.phone) {
      toast.error('Please complete all contact and delivery fields.');
      setStep(1);
      return;
    }

    const phoneToUse = mpesaPhone || formData.phone;
    setIsProcessing(true);
    setDialogProvider('mpesa');
    setDialogState('initiating');
    setDialogErrorMessage('');
    setIsDialogOpen(true);

    try {
      const payload = {
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerEmail: formData.email,
        customerPhone: formData.phone,
        deliveryAddress: `${formData.address} ${formData.apartment}`.trim() || 'N/A',
        county: formData.city || 'N/A',
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        })),
        replaceOrderNumber: pendingOrder?.orderNumber
      };

      const order = activeOrder || (await createOrder(payload));
      setActiveOrder(order);
      setDialogOrderNumber(order.orderNumber);
      setPendingOrder({
        orderNumber: order.orderNumber,
        itemsSnapshot: cart.map(item => ({ variantId: item.variantId, quantity: item.quantity }))
      });

      const orderTotal = order.total ? Number(order.total) : (total || totalToDisplay);

      try {
        await initiateMpesa(order.orderNumber, phoneToUse);
        setDialogState('waiting_mpesa');
        startMpesaPolling(order.orderNumber, orderTotal);
      } catch (mpesaErr: any) {
        if (mpesaErr.message && mpesaErr.message.toLowerCase().includes('already sent')) {
          setDialogState('waiting_mpesa');
          startMpesaPolling(order.orderNumber, orderTotal);
        } else {
          throw mpesaErr;
        }
      }
    } catch (err: any) {
      console.error('M-Pesa payment error:', err);
      setDialogErrorMessage(err.message || 'Failed to place order. Please try again.');
      setDialogState('failed');
      setIsProcessing(false);
    }
  };

  const handleCardSuccess = (orderNumber: string, finalAmount: number) => {
    setConfirmedOrder({
      orderNumber,
      total: finalAmount,
      paymentMethod: 'stripe',
      items: [...cart],
    });
    setDialogProvider('stripe');
    setDialogOrderNumber(orderNumber);
    setDialogState('success');
    setIsDialogOpen(true);
    setIsProcessing(false);
    clearCart();
    clearPendingOrder();
  };

  if (cart.length === 0 && !confirmedOrder && dialogState !== 'success' && !isDialogOpen && !activeOrder && !pendingOrder?.orderNumber) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-20">

        <div className="w-full lg:w-3/5">

          {isVerifyingOrder && (
            <div className="mb-6 p-3 bg-stone-100 border border-brand-stone/40 rounded text-brand-taupe text-xs flex items-center gap-2 animate-in fade-in">
              <div className="w-3.5 h-3.5 border-2 border-brand-black border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Verifying active checkout session...</span>
            </div>
          )}

          {cartMismatchWarning && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold">Cart Changed Since Pending Order</p>
                  <p className="text-xs text-amber-800">{cartMismatchWarning}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAbandonOrder}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider rounded hover:bg-amber-800 transition-colors shrink-0"
              >
                Release Old Reservation
              </button>
            </div>
          )}

          {activeOrder && (
            <div className="mb-6 p-4 bg-brand-stone/10 border border-brand-stone/40 rounded text-brand-black text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold uppercase tracking-wider text-xs">Resuming Order #{activeOrder.orderNumber}</p>
                  <p className="text-xs text-brand-taupe">Items are reserved. Complete payment below or cancel to start over.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAbandonOrder}
                disabled={isProcessing}
                className="text-xs font-semibold uppercase tracking-wider text-red-600 hover:text-red-800 hover:underline shrink-0"
              >
                Cancel & Release Items
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-brand-taupe mb-8">
            <span className={step === 1 ? "text-brand-black font-bold" : ""}>Information</span>
            <ArrowLeft size={12} className="rotate-180" />
            <span className={step === 2 ? "text-brand-black font-bold" : ""}>Payment</span>
          </div>

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-xl font-display uppercase tracking-widest mb-4">Contact Information</h2>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email address"
                  className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black"
                />
              </div>

              <div>
                <h2 className="text-xl font-display uppercase tracking-widest mb-4">Delivery Address</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
                    placeholder="First name" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black"
                  />
                  <input
                    type="text" name="lastName" value={formData.lastName} onChange={handleInputChange}
                    placeholder="Last name" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black"
                  />
                </div>
                <input
                  type="text" name="address" value={formData.address} onChange={handleInputChange}
                  placeholder="Address" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black mb-4"
                />
                <input
                  type="text" name="apartment" value={formData.apartment} onChange={handleInputChange}
                  placeholder="Apartment, suite, etc. (optional)" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black mb-4"
                />
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    name="city" value={formData.city} onChange={handleInputChange}
                    className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black bg-brand-white"
                  >
                    <option value="Nairobi">Nairobi</option>
                    <option value="Mombasa">Mombasa</option>
                    <option value="Kisumu">Kisumu</option>
                    <option value="Nakuru">Nakuru</option>
                    <option value="Eldoret">Eldoret</option>
                  </select>
                  <input
                    type="text" name="phone" value={formData.phone} onChange={handleInputChange}
                    placeholder="Phone (+254)" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.email || !formData.firstName || !formData.phone}
                  className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-brand-stone/10 border border-brand-stone/30 rounded p-4 text-sm space-y-3">
                <div className="flex justify-between border-b border-brand-stone/30 pb-3">
                  <span className="text-brand-taupe">Contact</span>
                  <span>{formData.email}</span>
                  <button onClick={() => setStep(1)} className="text-xs uppercase underline">Change</button>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-taupe">Ship to</span>
                  <span className="text-right max-w-xs">{formData.address || 'N/A'}, {formData.city}</span>
                  <button onClick={() => setStep(1)} className="text-xs uppercase underline">Change</button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-display uppercase tracking-widest mb-4">Payment</h2>
                <p className="text-sm text-brand-taupe mb-4">All transactions are secure and encrypted.</p>

                <div className="border border-brand-stone rounded overflow-hidden">

                  {/* Card Option (Stripe) */}
                  <div
                    className={`p-4 border-b border-brand-stone flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === 'card' ? 'bg-brand-stone/10' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'card' ? 'border-brand-black bg-brand-black' : 'border-brand-stone'}`}>
                      {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-brand-white" />}
                    </div>
                    <CreditCard size={20} className={paymentMethod === 'card' ? 'text-brand-black' : 'text-brand-taupe'} />
                    <span className="font-semibold text-sm uppercase tracking-wide">Credit / Debit Card (Stripe)</span>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="p-2">
                      {stripePromise && hasStripePublishableKey ? (
                        <Elements stripe={stripePromise}>
                          <StripeCardSection
                            formData={formData}
                            cart={cart}
                            total={total}
                            activeOrder={activeOrder}
                            setActiveOrder={setActiveOrder}
                            onProcessing={(orderNumber) => {
                              setDialogProvider('stripe');
                              setDialogOrderNumber(orderNumber);
                              setDialogState('processing');
                              setIsDialogOpen(true);
                            }}
                            onSuccess={handleCardSuccess}
                            onFailure={(errMsg) => {
                              setDialogProvider('stripe');
                              setDialogErrorMessage(errMsg);
                              setDialogState('failed');
                              setIsDialogOpen(true);
                            }}
                            onPending={(orderNumber) => {
                              setDialogProvider('stripe');
                              setDialogOrderNumber(orderNumber);
                              setDialogState('unknown_outcome');
                              setIsDialogOpen(true);
                            }}
                            isProcessing={isProcessing}
                            setIsProcessing={setIsProcessing}
                            onReturnToInfo={() => setStep(1)}
                          />
                        </Elements>
                      ) : stripeConfigChecked && !hasStripePublishableKey ? (
                        <div className="p-6 bg-brand-stone/5 space-y-4">
                          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded space-y-2">
                            <p className="font-semibold">Stripe Publishable Key not configured</p>
                            <p>Please add <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...</code> to <code className="bg-amber-100 px-1 py-0.5 rounded">client/.env</code> or <code className="bg-amber-100 px-1 py-0.5 rounded">STRIPE_PUBLISHABLE_KEY=pk_test_...</code> to <code className="bg-amber-100 px-1 py-0.5 rounded">server/.env</code> to enable live browser card processing.</p>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="text-xs uppercase tracking-widest hover:underline flex items-center gap-1"
                            >
                              <ArrowLeft size={14} /> Return to information
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('mpesa')}
                              className="text-xs uppercase tracking-widest text-brand-black font-semibold underline"
                            >
                              Use M-Pesa Instead
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-sm text-brand-taupe">
                          <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading secure payment gateway...
                        </div>
                      )}
                    </div>
                  )}

                  {/* M-Pesa Option */}
                  <div
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === 'mpesa' ? 'bg-brand-stone/10' : ''}`}
                    onClick={() => setPaymentMethod('mpesa')}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'mpesa' ? 'border-brand-black bg-brand-black' : 'border-brand-stone'}`}>
                      {paymentMethod === 'mpesa' && <div className="w-1.5 h-1.5 rounded-full bg-brand-white" />}
                    </div>
                    <Smartphone size={20} className={paymentMethod === 'mpesa' ? 'text-brand-black' : 'text-brand-taupe'} />
                    <span className="font-semibold text-sm uppercase tracking-wide">M-Pesa</span>
                  </div>

                  {paymentMethod === 'mpesa' && (
                    <div className="p-6 bg-brand-stone/5 border-t border-brand-stone flex flex-col items-center text-center animate-in fade-in space-y-4">
                      <p className="text-sm">Enter your M-Pesa phone number. A prompt will be sent to your phone to enter your PIN and complete the payment.</p>
                      <input
                        type="text"
                        placeholder="07XX XXX XXX or 01XX XXX XXX"
                        value={mpesaPhone || formData.phone}
                        onChange={e => setMpesaPhone(e.target.value)}
                        className="w-full max-w-sm border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black text-center"
                      />

                      <div className="w-full flex justify-between items-center pt-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          disabled={isProcessing}
                          className="text-xs uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft size={14} /> Return to information
                        </button>
                        <button
                          type="button"
                          onClick={handleMpesaOrder}
                          disabled={isProcessing}
                          className="px-8 py-4 bg-[#4CAF50] text-white text-sm font-semibold uppercase tracking-widest hover:bg-[#45a049] transition-colors disabled:opacity-70 flex items-center gap-2 min-w-[200px] justify-center"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Pay with M-Pesa (KES ${(total || totalToDisplay).toLocaleString()})`
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Order Summary */}
        <div className="w-full lg:w-2/5">
          <div className="bg-brand-stone/10 p-6 lg:p-8 border border-brand-stone/30 sticky top-24">
            <h2 className="hidden lg:block text-lg font-display uppercase tracking-widest mb-6 border-b border-brand-stone/30 pb-4">Order Summary</h2>

            <div className="max-h-[40vh] overflow-y-auto no-scrollbar mb-6 space-y-4 pr-2 border-b border-brand-stone/30 pb-6">
              {itemsToDisplay.map((item: any) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-16 h-20 bg-brand-stone/20 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-brand-taupe uppercase mb-1">
                      {[item.color, item.size].filter(Boolean).join(' · ')}
                    </span>
                    <span className="text-xs text-brand-taupe">Qty: {item.quantity}</span>
                  </div>
                  <div className="flex flex-col justify-center items-end flex-shrink-0">
                    <span className="text-sm font-medium">KES {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm mb-6 border-b border-brand-stone/30 pb-6">
              <div className="flex justify-between">
                <span className="text-brand-taupe">Subtotal</span>
                <span>KES {(cart.length > 0 ? subtotal : (confirmedOrder?.total ?? totalToDisplay)).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold uppercase tracking-widest">Total</span>
              <span className="text-2xl font-bold">KES {(cart.length > 0 ? total : (confirmedOrder?.total ?? totalToDisplay)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <PaymentStatusDialog
        isOpen={isDialogOpen}
        state={dialogState}
        provider={dialogProvider}
        orderNumber={confirmedOrder?.orderNumber || dialogOrderNumber || activeOrder?.orderNumber || pendingOrder?.orderNumber}
        amount={confirmedOrder?.total ?? (activeOrder?.total ? Number(activeOrder.total) : totalToDisplay)}
        phoneNumber={confirmedOrder?.phone || mpesaPhone || formData.phone}
        errorMessage={dialogErrorMessage}
        onClose={() => {
          setIsDialogOpen(false);
          if (dialogState === 'success') {
            const targetOrder = confirmedOrder?.orderNumber || dialogOrderNumber || activeOrder?.orderNumber;
            if (targetOrder) {
              navigate(`/order-confirmation/${targetOrder}`);
            }
          }
        }}
        onViewOrder={() => {
          setIsDialogOpen(false);
          const targetOrder = confirmedOrder?.orderNumber || dialogOrderNumber || activeOrder?.orderNumber;
          if (targetOrder) {
            navigate(`/order-confirmation/${targetOrder}`);
          }
        }}
        onContinueShopping={() => {
          setIsDialogOpen(false);
          navigate('/shop');
        }}
        onRetry={() => {
          setIsDialogOpen(false);
          setDialogState('idle');
          setIsProcessing(false);
        }}
        onCheckMyOrders={() => {
          setIsDialogOpen(false);
          navigate('/orders');
        }}
      />
    </div>
  );
};
