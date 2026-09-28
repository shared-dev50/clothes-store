import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export const Cart: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, subtotal } = useCartStore();
  const navigate = useNavigate();

  const freeShippingThreshold = 10000;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercentage = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  if (cart.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-32 text-center flex flex-col items-center">
        <h1 className="text-3xl font-display uppercase tracking-widest mb-6">Your Cart is Empty</h1>
        <p className="text-brand-taupe mb-12 max-w-md">
          Looks like you haven't added anything to your cart yet. Discover our latest collections and find something you'll love.
        </p>
        <Link 
          to="/shop" 
          className="px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="text-3xl font-display font-medium tracking-tighter uppercase mb-12">Shopping Cart</h1>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Cart Items List */}
        <div className="w-full lg:w-2/3">
          {/* Free Shipping Progress */}
          <div className="bg-brand-stone/10 p-6 mb-8 border border-brand-stone/30">
            <p className="text-sm font-medium uppercase tracking-wider mb-4 text-center">
              {remainingForFreeShipping > 0 
                ? `You're KES ${remainingForFreeShipping.toLocaleString()} away from free Nairobi delivery` 
                : 'Congratulations! You get free Nairobi delivery.'}
            </p>
            <div className="w-full h-1.5 bg-brand-stone/40 overflow-hidden">
              <div 
                className="h-full bg-brand-black transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-brand-stone text-xs font-semibold uppercase tracking-widest text-brand-taupe">
            <div className="col-span-6">Product</div>
            <div className="col-span-3 text-center">Quantity</div>
            <div className="col-span-3 text-right">Total</div>
          </div>

          <div className="divide-y divide-brand-stone">
            {cart.map((item) => (
              <div key={item.id} className="py-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                
                {/* Product Info */}
                <div className="col-span-6 flex gap-4 w-full">
                  <Link to={`/product/${item.slug}`} className="w-24 h-32 bg-brand-stone/20 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex flex-col flex-grow justify-center">
                    <Link to={`/product/${item.slug}`} className="text-sm font-medium hover:text-brand-taupe transition-colors mb-1">
                      {item.name}
                    </Link>
                    <p className="text-sm font-semibold mb-2">KES {item.price.toLocaleString()}</p>
                    <p className="text-xs text-brand-taupe uppercase tracking-widest mb-1">Color: {item.color}</p>
                    <p className="text-xs text-brand-taupe uppercase tracking-widest">Size: {item.size}</p>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs text-brand-taupe uppercase tracking-widest underline underline-offset-4 mt-auto w-fit hover:text-red-500 transition-colors md:hidden"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="col-span-3 flex justify-between md:justify-center items-center w-full md:w-auto">
                  <div className="flex items-center border border-brand-stone bg-brand-white">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-2 text-brand-black hover:bg-brand-stone/20"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-2 text-brand-black hover:bg-brand-stone/20"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Total & Remove */}
                <div className="col-span-3 flex justify-between md:justify-end items-center w-full md:w-auto">
                  <span className="text-sm font-semibold md:hidden uppercase tracking-widest text-brand-taupe">Total: </span>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold">KES {(item.price * item.quantity).toLocaleString()}</span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="hidden md:block text-brand-taupe hover:text-red-500 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-1/3">
          <div className="bg-brand-stone/10 p-8 border border-brand-stone/30 sticky top-24">
            <h2 className="text-lg font-display uppercase tracking-widest mb-6 border-b border-brand-stone/30 pb-4">Order Summary</h2>
            
            <div className="space-y-4 text-sm mb-6 border-b border-brand-stone/30 pb-6">
              <div className="flex justify-between">
                <span className="text-brand-taupe">Subtotal</span>
                <span className="font-medium">KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">Shipping</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-taupe">Tax</span>
                <span className="font-medium">Included</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-8">
              <span className="font-semibold uppercase tracking-widest">Total</span>
              <span className="text-xl font-bold">KES {subtotal.toLocaleString()}</span>
            </div>
            
            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest hover:bg-brand-black/90 transition-colors flex justify-center items-center gap-2 group"
            >
              Checkout <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/shop" className="text-center text-xs text-brand-taupe uppercase tracking-widest underline underline-offset-4 hover:text-brand-black">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
