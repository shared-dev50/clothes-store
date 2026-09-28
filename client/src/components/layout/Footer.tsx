import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-black text-brand-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div>
            <h3 className="text-xl font-display font-semibold tracking-tighter uppercase mb-6">
              Studio Nairobi
            </h3>
            <p className="text-brand-stone/70 text-sm leading-relaxed max-w-xs">
              Contemporary silhouettes with a Kenyan soul. Crafted for the modern urbanite.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-6 text-brand-stone">Shop</h4>
            <ul className="space-y-4 text-sm text-brand-stone/70">
              <li><Link to="/shop?category=T-Shirts" className="hover:text-brand-white transition-colors">T-Shirts</Link></li>
              <li><Link to="/shop?category=Hoodies" className="hover:text-brand-white transition-colors">Hoodies</Link></li>
              <li><Link to="/shop?category=Trousers" className="hover:text-brand-white transition-colors">Trousers</Link></li>
              <li><Link to="/shop?category=Jackets" className="hover:text-brand-white transition-colors">Outerwear</Link></li>
              <li><Link to="/shop?category=Accessories" className="hover:text-brand-white transition-colors">Accessories</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-6 text-brand-stone">Support</h4>
            <ul className="space-y-4 text-sm text-brand-stone/70">
              <li><Link to="/faq" className="hover:text-brand-white transition-colors">FAQ</Link></li>
              <li><Link to="/shipping" className="hover:text-brand-white transition-colors">Shipping & Returns</Link></li>
              <li><Link to="/size-guide" className="hover:text-brand-white transition-colors">Size Guide</Link></li>
              <li><Link to="/contact" className="hover:text-brand-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-6 text-brand-stone">Newsletter</h4>
            <p className="text-brand-stone/70 text-sm mb-4">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
            <form className="flex border-b border-brand-stone/30 pb-2">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="bg-transparent border-none w-full text-sm focus:outline-none focus:ring-0 placeholder-brand-stone/50 text-brand-white"
              />
              <button type="submit" className="text-xs font-semibold uppercase tracking-wider hover:text-brand-gold transition-colors">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        
        <div className="border-t border-brand-stone/20 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-brand-stone/50 space-y-4 md:space-y-0">
          <p>&copy; {new Date().getFullYear()} Studio Nairobi. All rights reserved.</p>
          <div className="flex space-x-6">
            <span>KES (KSh)</span>
            <Link to="/privacy" className="hover:text-brand-stone">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-brand-stone">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
