import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, CreditCard, Smartphone } from 'lucide-react';
import { getOrder, initiateMpesa, createStripePayment, getPaymentStatus } from '../services/orderApi';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const CheckoutForm = ({ clientSecret, onPaymentSuccess }: { clientSecret: string, onPaymentSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      }
    });

    if (result.error) {
      setError(result.error.message || 'Payment failed');
      setProcessing(false);
    } else {
      if (result.paymentIntent?.status === 'succeeded') {
        onPaymentSuccess();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-brand-stone/30 bg-brand-white">
      <CardElement className="p-3 border border-brand-stone mb-4" />
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
      <button 
        disabled={!stripe || processing}
        className="w-full bg-brand-black text-brand-white py-3 uppercase text-sm font-semibold hover:bg-brand-taupe disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Pay with Card'}
      </button>
    </form>
  );
};

export const OrderConfirmation: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Payment states
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaMessage, setMpesaMessage] = useState<string | null>(null);
  const [mpesaError, setMpesaError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    if (!orderNumber) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await getOrder(orderNumber);
        setOrder(data);
        if (data.customerPhone) {
          setMpesaPhone(data.customerPhone);
        }
      } catch (err) {
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber, navigate]);

  // Polling effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (polling && order?.paymentStatus !== 'PAID') {
      interval = setInterval(async () => {
        try {
          const statusData = await getPaymentStatus(orderNumber!);
          if (statusData.paymentStatus === 'PAID') {
            setOrder((prev: any) => ({ ...prev, paymentStatus: 'PAID' }));
            setPolling(false);
            setMpesaMessage('Payment received successfully!');
          } else if (statusData.latestPayment?.status === 'FAILED') {
            setPolling(false);
            setMpesaError(statusData.latestPayment.failureReason || 'Payment failed.');
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [polling, order?.paymentStatus, orderNumber]);

  const handleMpesaPay = async () => {
    setMpesaLoading(true);
    setMpesaError(null);
    setMpesaMessage(null);
    try {
      const res = await initiateMpesa(orderNumber!, mpesaPhone);
      setMpesaMessage(res.message + ". Please check your phone to enter your M-Pesa PIN.");
      setPolling(true);
    } catch (err: any) {
      setMpesaError(err.message || 'Failed to initiate M-Pesa');
    } finally {
      setMpesaLoading(false);
    }
  };

  const handleStripePay = async () => {
    setStripeLoading(true);
    try {
      const res = await createStripePayment(orderNumber!);
      setStripeClientSecret(res.clientSecret);
    } catch (err: any) {
      console.error(err);
    } finally {
      setStripeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-taupe">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-display uppercase tracking-widest mb-4 text-red-600">Order Not Found</h1>
        <p className="text-brand-taupe mb-8">{error || 'We could not find the order you are looking for.'}</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16 md:py-24 text-center flex flex-col items-center">
      <CheckCircle size={64} className="text-brand-gold mb-6" />
      <h1 className="text-3xl md:text-4xl font-display uppercase tracking-widest mb-4">Order Confirmed</h1>
      <p className="text-brand-taupe mb-2">Thank you for your purchase, {order.customerName}.</p>
      <p className="text-brand-taupe mb-8">Your order #{order.orderNumber} is being processed.</p>

      {order.paymentStatus !== 'PAID' && (
        <div className="w-full max-w-2xl mb-8 space-y-6">
          <div className="bg-brand-stone/10 p-6 md:p-8 text-left border border-brand-stone/30">
            <h3 className="text-lg font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Complete Your Payment</h3>
            <p className="text-sm text-brand-taupe mb-6">Your order is currently UNPAID. Please select a payment method below to complete your order.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* M-PESA */}
              <div className="border border-brand-stone/50 p-4">
                <div className="flex items-center gap-2 font-semibold mb-4 text-[#4CAF50]">
                  <Smartphone size={20} /> Pay with M-Pesa
                </div>
                <label className="block text-xs font-medium text-brand-taupe mb-1">M-Pesa Phone Number</label>
                <input 
                  type="text" 
                  value={mpesaPhone}
                  onChange={e => setMpesaPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full border border-brand-stone p-2 mb-4 text-sm focus:outline-none"
                />
                <button 
                  onClick={handleMpesaPay}
                  disabled={mpesaLoading || polling}
                  className="w-full bg-[#4CAF50] text-white py-3 uppercase text-sm font-semibold tracking-wide hover:bg-[#45a049] transition-colors disabled:opacity-50"
                >
                  {mpesaLoading ? 'Initiating...' : polling ? 'Waiting for PIN...' : 'Send M-Pesa Prompt'}
                </button>
                {mpesaMessage && <p className="mt-3 text-xs text-[#4CAF50] font-medium">{mpesaMessage}</p>}
                {mpesaError && <p className="mt-3 text-xs text-red-500 font-medium">{mpesaError}</p>}
              </div>

              {/* STRIPE */}
              <div className="border border-brand-stone/50 p-4">
                <div className="flex items-center gap-2 font-semibold mb-4 text-[#635BFF]">
                  <CreditCard size={20} /> Pay with Card
                </div>
                {!stripeClientSecret ? (
                  <button 
                    onClick={handleStripePay}
                    disabled={stripeLoading}
                    className="w-full bg-[#635BFF] text-white py-3 uppercase text-sm font-semibold tracking-wide hover:bg-[#5249E5] transition-colors disabled:opacity-50 mt-[60px]"
                  >
                    {stripeLoading ? 'Loading...' : 'Pay with Stripe'}
                  </button>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                    <CheckoutForm 
                      clientSecret={stripeClientSecret} 
                      onPaymentSuccess={() => setOrder((prev: any) => ({ ...prev, paymentStatus: 'PAID' }))}
                    />
                  </Elements>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {order.paymentStatus === 'PAID' && (
        <div className="w-full max-w-2xl bg-[#4CAF50]/10 border border-[#4CAF50]/30 p-6 mb-8 rounded text-[#4CAF50] font-medium">
          Payment received successfully. We are preparing your order for shipping.
        </div>
      )}

      <div className="bg-brand-stone/10 p-6 md:p-8 w-full max-w-2xl text-left mb-8 border border-brand-stone/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-brand-stone/30 pb-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Order Details</h3>
            <div className="space-y-2 text-sm text-brand-black">
              <p className="flex justify-between"><span className="text-brand-taupe">Order Status:</span> {order.status}</p>
              <p className="flex justify-between"><span className="text-brand-taupe">Payment Status:</span> {order.paymentStatus}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Delivery Address</h3>
            <div className="text-sm text-brand-black space-y-1">
              <p>{order.customerName}</p>
              <p>{order.deliveryAddress}</p>
              <p>{order.county}, Kenya</p>
              <p>{order.customerPhone}</p>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Items Ordered</h3>
        <div className="space-y-4 mb-6 border-b border-brand-stone/30 pb-6">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div className="flex-grow">
                <span className="font-medium">{item.productName}</span>
                {item.variantInfo && <span className="text-brand-taupe ml-2">({item.variantInfo})</span>}
                <div className="text-brand-taupe">Qty: {item.quantity}</div>
              </div>
              <div className="text-right">
                KES {Number(item.totalPrice).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm text-brand-black mb-6 border-b border-brand-stone/30 pb-6">
          <p className="flex justify-between"><span className="text-brand-taupe">Subtotal:</span> KES {Number(order.subtotal).toLocaleString()}</p>
          <p className="flex justify-between"><span className="text-brand-taupe">Delivery Fee:</span> KES {Number(order.deliveryFee).toLocaleString()}</p>
        </div>
        
        <div className="flex justify-between items-center text-lg md:text-xl font-bold">
          <span className="uppercase tracking-widest">Total</span>
          <span>KES {Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/shop')}
        className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors"
      >
        Continue Shopping
      </button>
    </div>
  );
};

