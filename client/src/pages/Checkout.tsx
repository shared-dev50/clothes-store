import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { ArrowLeft, CheckCircle, CreditCard, Smartphone } from 'lucide-react';

export const Checkout: React.FC = () => {
  const { cart, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: 'Nairobi',
    phone: '',
  });

  const shippingCost = subtotal > 10000 ? 0 : 300;
  const total = subtotal + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProcessOrder = () => {
    setIsProcessing(true);
    // Simulate network delay / M-Pesa STK push wait
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      clearCart();
    }, 3000);
  };

  if (cart.length === 0 && !isSuccess) {
    navigate('/cart');
    return null;
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-24 text-center flex flex-col items-center">
        <CheckCircle size={64} className="text-brand-gold mb-6" />
        <h1 className="text-4xl font-display uppercase tracking-widest mb-4">Order Confirmed</h1>
        <p className="text-brand-taupe mb-2">Thank you for your purchase, {formData.firstName}.</p>
        <p className="text-brand-taupe mb-8">Your order #NAI-{Math.floor(10000 + Math.random() * 90000)} is being processed.</p>
        
        <div className="bg-brand-stone/10 p-8 w-full max-w-md text-left mb-8 border border-brand-stone/30">
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Order Details</h3>
          <div className="space-y-2 text-sm text-brand-black mb-6">
            <p className="flex justify-between"><span className="text-brand-taupe">Total paid:</span> KES {total.toLocaleString()}</p>
            <p className="flex justify-between"><span className="text-brand-taupe">Payment:</span> {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}</p>
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone/30 pb-2">Delivery Address</h3>
          <div className="text-sm text-brand-black space-y-1">
            <p>{formData.firstName} {formData.lastName}</p>
            <p>{formData.address} {formData.apartment}</p>
            <p>{formData.city}, Kenya</p>
            <p>{formData.phone}</p>
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
                  onClick={() => setStep(2)}
                  disabled={!formData.email || !formData.firstName || !formData.address || !formData.phone}
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
                  <span className="text-right max-w-xs">{formData.address}, {formData.city}</span>
                  <button onClick={() => setStep(1)} className="text-xs uppercase underline">Change</button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-display uppercase tracking-widest mb-4">Payment</h2>
                <p className="text-sm text-brand-taupe mb-4">All transactions are secure and encrypted.</p>

                <div className="border border-brand-stone rounded overflow-hidden">
                  
                  {/* M-Pesa Option */}
                  <div className={`p-4 border-b border-brand-stone flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === 'mpesa' ? 'bg-brand-stone/10' : ''}`}
                       onClick={() => setPaymentMethod('mpesa')}>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'mpesa' ? 'border-brand-black bg-brand-black' : 'border-brand-stone'}`}>
                      {paymentMethod === 'mpesa' && <div className="w-1.5 h-1.5 rounded-full bg-brand-white" />}
                    </div>
                    <Smartphone size={20} className={paymentMethod === 'mpesa' ? 'text-brand-black' : 'text-brand-taupe'} />
                    <span className="font-semibold text-sm uppercase tracking-wide">M-Pesa Express</span>
                  </div>
                  
                  {paymentMethod === 'mpesa' && (
                    <div className="p-6 bg-brand-stone/5 border-b border-brand-stone flex flex-col items-center text-center animate-in fade-in">
                      <p className="text-sm mb-4">Enter your M-Pesa phone number. A prompt will be sent to your phone to enter your PIN and complete the payment.</p>
                      <input 
                        type="text" 
                        placeholder="07XX XXX XXX or 01XX XXX XXX" 
                        defaultValue={formData.phone}
                        className="w-full max-w-sm border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black text-center mb-2"
                      />
                    </div>
                  )}

                  {/* Card Option */}
                  <div className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === 'card' ? 'bg-brand-stone/10' : ''}`}
                       onClick={() => setPaymentMethod('card')}>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'card' ? 'border-brand-black bg-brand-black' : 'border-brand-stone'}`}>
                      {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-brand-white" />}
                    </div>
                    <CreditCard size={20} className={paymentMethod === 'card' ? 'text-brand-black' : 'text-brand-taupe'} />
                    <span className="font-semibold text-sm uppercase tracking-wide">Credit / Debit Card</span>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="p-6 bg-brand-stone/5 border-t border-brand-stone animate-in fade-in space-y-4">
                      <input type="text" placeholder="Card number" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black" />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Expiration date (MM/YY)" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black" />
                        <input type="text" placeholder="Security code" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black" />
                      </div>
                      <input type="text" placeholder="Name on card" className="w-full border border-brand-stone p-3 text-sm focus:outline-none focus:border-brand-black" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button onClick={() => setStep(1)} className="text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
                  <ArrowLeft size={14} /> Return to information
                </button>
                <button
                  onClick={handleProcessOrder}
                  disabled={isProcessing}
                  className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors disabled:opacity-70 flex items-center gap-2 min-w-[200px] justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-brand-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Place Order (KES ${total.toLocaleString()})`
                  )}
                </button>
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
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-16 h-20 bg-brand-stone/20 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-taupe text-brand-white text-[10px] flex items-center justify-center rounded-full">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-brand-taupe uppercase">{item.color} / {item.size}</span>
                  </div>
                  <div className="flex flex-col justify-center items-end">
                    <span className="text-sm">KES {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-3 text-sm mb-6 border-b border-brand-stone/30 pb-6">
              <div className="flex justify-between">
                <span className="text-brand-taupe">Subtotal</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">Shipping (Nairobi Express)</span>
                <span>{shippingCost === 0 ? 'Free' : `KES ${shippingCost.toLocaleString()}`}</span>
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
