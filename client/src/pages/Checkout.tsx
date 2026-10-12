import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { ArrowLeft, CreditCard, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';
import { createOrder, initiateMpesa, createStripePayment, getPaymentStatus } from '../services/orderApi';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { getStripePromise } from '../utils/stripe';

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
  onSuccess: (orderNumber: string) => void;
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
  isProcessing,
  setIsProcessing,
  onReturnToInfo
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [nameOnCard, setNameOnCard] = useState(`${formData.firstName} ${formData.lastName}`.trim());
  const [cardError, setCardError] = useState<string | null>(null);

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error('Payment system is initializing. Please wait a moment.');
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
          }))
        };

        order = await createOrder(payload);
        setActiveOrder(order);
      }

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
        setCardError(result.error.message || 'Payment failed');
        toast.error(result.error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') {
        // Poll backend to confirm webhook persisted the paid status
        for (let i = 0; i < 5; i++) {
          try {
            const statusData = await getPaymentStatus(order.orderNumber);
            if (statusData.paymentStatus === 'PAID') {
              break;
            }
          } catch {
            // ignore interim polling error
          }
          await new Promise(res => setTimeout(res, 1200));
        }

        onSuccess(order.orderNumber);
      } else {
        toast.error(`Payment status: ${result.paymentIntent?.status || 'Unknown'}`);
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Card payment error:', err);
      const msg = err.message || 'Failed to complete payment';
      setCardError(msg);
      toast.error(msg);
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
  const { cart, clearCart } = useCartStore();
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

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

  const total = subtotal;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'phone') {
      setMpesaPhone(value);
    }
  };

  const handleMpesaOrder = async () => {
    if (!formData.email || !formData.firstName || !formData.phone) {
      toast.error('Please complete all contact and delivery fields.');
      setStep(1);
      return;
    }

    setIsProcessing(true);
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
        }))
      };

      const order = activeOrder || (await createOrder(payload));
      setActiveOrder(order);

      const phoneToUse = mpesaPhone || formData.phone;
      if (phoneToUse) {
        try {
          await initiateMpesa(order.orderNumber, phoneToUse);
        } catch (mpesaErr: any) {
          console.warn('M-Pesa STK push notice:', mpesaErr.message);
        }
      }

      clearCart();
      toast.success('Order created! Please complete payment.');
      navigate(`/order-confirmation/${order.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardSuccess = (orderNumber: string) => {
    clearCart();
    toast.success('Payment completed successfully!');
    navigate(`/order-confirmation/${orderNumber}`);
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-20">

        {/* Left Form Area */}
        <div className="w-full lg:w-3/5">
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
                            onSuccess={handleCardSuccess}
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
                            `Pay with M-Pesa (KES ${total.toLocaleString()})`
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
              {cart.map(item => (
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
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold uppercase tracking-widest">Total</span>
              <span className="text-2xl font-bold">KES {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
