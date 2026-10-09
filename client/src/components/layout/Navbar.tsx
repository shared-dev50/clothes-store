import React, { useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, Menu, X, Search, User } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const Navbar: React.FC = () => {
  const { isMenuOpen, setMenuOpen, toggleMenu } = useUiStore();
  const cart = useCartStore((state) => state.cart);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const { isAuthenticated, user, logout } = useAuthStore();
  const [isAuthMenuOpen, setIsAuthMenuOpen] = React.useState(false);
  const authMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) {
        setIsAuthMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAuthMenuOpen(false);
      }
    };

    if (isAuthMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAuthMenuOpen]);

  const navLinks = [
    { name: 'Shop', path: '/shop' },
    { name: 'New Arrivals', path: '/shop?category=new' },
    { name: 'Collections', path: '/collections' },
    { name: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-white/80 backdrop-blur-md border-b border-brand-stone">
      <div className="bg-brand-black text-brand-white text-xs py-2 text-center font-medium tracking-wide">
        Free delivery across Nairobi on orders over KES 10,000
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={toggleMenu}
              className="text-brand-black hover:text-brand-taupe focus:outline-none p-2 -ml-2"
            >
              {isMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center justify-center lg:justify-start flex-1 lg:flex-none">
            <Link to="/" className="text-xl md:text-2xl font-display font-semibold tracking-tighter uppercase">
              HBS WEAR
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-8 items-center flex-1 justify-center">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `text-sm font-medium tracking-wide uppercase transition-colors duration-200 ${isActive ? 'text-brand-black' : 'text-brand-taupe hover:text-brand-black'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            <button className="text-brand-black hover:text-brand-taupe hidden sm:block p-2">
              <Search size={20} strokeWidth={1.5} />
            </button>
            
            <div className="relative" ref={authMenuRef}>
              <button 
                className="text-brand-black hover:text-brand-taupe p-2"
                onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
              >
                <User size={20} strokeWidth={1.5} />
              </button>
              
              {isAuthMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-brand-white border border-brand-stone shadow-xl py-2 z-50">
                  {isAuthenticated() ? (
                    <>
                      <div className="px-4 py-2 border-b border-brand-stone/50 text-xs text-brand-taupe truncate">
                        {user?.email}
                      </div>
                      {user?.role === 'ADMIN' && (
                        <Link 
                          to="/admin" 
                          className="block px-4 py-2 text-sm text-brand-black hover:bg-brand-stone/20"
                          onClick={() => setIsAuthMenuOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setIsAuthMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-brand-black hover:bg-brand-stone/20"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/login" 
                        className="block px-4 py-2 text-sm text-brand-black hover:bg-brand-stone/20"
                        onClick={() => setIsAuthMenuOpen(false)}
                      >
                        Log In
                      </Link>
                      <Link 
                        to="/register" 
                        className="block px-4 py-2 text-sm text-brand-black hover:bg-brand-stone/20"
                        onClick={() => setIsAuthMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <Link to="/cart" className="text-brand-black hover:text-brand-taupe relative p-2">
              <ShoppingBag size={20} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-black rounded-full border-[1.5px] border-brand-white shadow-sm"></span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-brand-white border-b border-brand-stone shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-4 text-base font-medium tracking-wide uppercase text-brand-black border-b border-brand-stone/50 hover:bg-brand-stone/20"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
