import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, Search, User, ChevronDown, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { getHomepageSettings, getCachedHomepageSettings } from '../../services/productApi';

interface MegaMenuCategory {
  name: string;
  path: string;
}

interface MegaMenuSection {
  title?: string;
  categories: MegaMenuCategory[];
}

interface MegaMenuItem {
  name: string;
  id: 'men' | 'women' | 'kids';
  shopAllPath: string;
  spotlightTitle: string;
  spotlightDesc: string;
  sections?: MegaMenuSection[];
  categories?: MegaMenuCategory[];
}

const MEGA_MENUS: Record<string, MegaMenuItem> = {
  men: {
    name: 'Men',
    id: 'men',
    shopAllPath: '/shop?category=Men',
    spotlightTitle: 'Tailored Contemporary',
    spotlightDesc: 'Modern silhouettes, classic textures and enduring everyday craftsmanship.',
    categories: [
      { name: "Men's Clothing", path: "/shop?category=Men's Clothing" },
      { name: "Men's Pajamas", path: "/shop?category=Men's Pajamas" },
      { name: "Men's Shoes", path: "/shop?category=Men's Shoes" },
    ],
  },
  women: {
    name: 'Women',
    id: 'women',
    shopAllPath: '/shop?category=Women',
    spotlightTitle: 'Modern Elegance',
    spotlightDesc: 'Fluid cuts, premium satin, genuine leather handbags and luxury hair.',
    categories: [
      { name: "Women's Clothing", path: "/shop?category=Women's Clothing" },
      { name: "Women's Pajamas", path: "/shop?category=Women's Pajamas" },
      { name: "Women's Shoes", path: "/shop?category=Women's Shoes" },
      { name: 'Handbags', path: '/shop?category=Handbags' },
      { name: 'Wigs & Hair', path: '/shop?category=Wigs & Hair' },
    ],
  },
  kids: {
    name: 'Kids',
    id: 'kids',
    shopAllPath: '/shop?category=Kids',
    spotlightTitle: 'Young Explorers',
    spotlightDesc: 'Soft breathable sets and vibrant styles for play and downtime.',
    sections: [
      {
        title: 'Girls',
        categories: [
          { name: "Girls' Clothing", path: "/shop?category=Girls' Clothing" },
          { name: "Girls' Pajamas", path: "/shop?category=Girls' Pajamas" },
          { name: "Girls' Shoes", path: "/shop?category=Girls' Shoes" },
        ],
      },
      {
        title: 'Boys',
        categories: [
          { name: "Boys' Clothing", path: "/shop?category=Boys' Clothing" },
          { name: "Boys' Pajamas", path: "/shop?category=Boys' Pajamas" },
          { name: "Boys' Shoes", path: "/shop?category=Boys' Shoes" },
        ],
      },
    ],
  },
};

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  const { isMenuOpen, setMenuOpen, toggleMenu } = useUiStore();
  const cart = useCartStore((state) => state.cart);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const { isAuthenticated, user, logout } = useAuthStore();

  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const authMenuRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const megaMenuCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: getHomepageSettings,
    initialData: getCachedHomepageSettings,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
  });

  const [scrollPassed, setScrollPassed] = useState(false);
  const prevPathnameRef = useRef(location.pathname);
  const isScrolled = !isHomePage || scrollPassed;

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      setScrollPassed(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  // Close menus on outside click
  const closeAllMenus = useCallback(() => {
    setActiveMegaMenu(null);
    setIsAuthMenuOpen(false);
    setIsSearchOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllMenus();
        setMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveMegaMenu(null);
      }
      if (authMenuRef.current && !authMenuRef.current.contains(e.target as Node)) {
        setIsAuthMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllMenus, setMenuOpen]);

  // Close menus when route changes
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      closeAllMenus();
      setMenuOpen(false);
    }
  }, [location.pathname, closeAllMenus, setMenuOpen]);

  const handleMouseEnter = (menuKey: string) => {
    if (megaMenuCloseTimeout.current) {
      clearTimeout(megaMenuCloseTimeout.current);
      megaMenuCloseTimeout.current = null;
    }
    setActiveMegaMenu(menuKey);
  };

  const handleMouseLeave = () => {
    megaMenuCloseTimeout.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 150);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  // navbar styling colors
  const isTransparent = isHomePage && !isScrolled && !isMenuOpen && !activeMegaMenu;

  const transparentForeground = settings?.navbarTransparentForeground || '#FAFAFA';
  const scrolledBackground = settings?.navbarScrolledBackground || '#FAFAFA';
  const scrolledForeground = settings?.navbarScrolledForeground || '#121212';

  const currentForegroundColor = isTransparent ? transparentForeground : scrolledForeground;

  return (
    <header
      ref={navContainerRef}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 motion-reduce:transition-none ${isTransparent
          ? 'bg-transparent border-b border-transparent shadow-none'
          : 'bg-brand-white/95 backdrop-blur-md border-b border-brand-stone shadow-sm'
        }`}
      style={{
        backgroundColor: isTransparent ? 'transparent' : scrolledBackground,
      }}
    >
      {/* Announcement Banner */}
      <div
        className={`text-xs py-2 text-center font-medium tracking-wide transition-colors duration-300 ${isTransparent
            ? 'bg-black/40 text-brand-white/90 backdrop-blur-sm'
            : 'bg-brand-black text-brand-white'
          }`}
      >
        Free delivery across Nairobi on orders over KES 10,000
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={toggleMenu}
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              className="p-2 -ml-2 focus:outline-none transition-colors duration-200"
              style={{ color: currentForegroundColor }}
            >
              {isMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex-shrink-0 flex items-center justify-center lg:justify-start flex-1 lg:flex-none">
            <Link
              to="/"
              className="text-xl md:text-2xl font-display font-semibold tracking-tighter uppercase transition-colors duration-200"
              style={{ color: currentForegroundColor }}
            >
              HBS WEAR
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex space-x-10 items-center flex-1 justify-center h-full">
            {/* Shop Link */}
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `text-sm font-medium tracking-widest uppercase transition-opacity duration-200 hover:opacity-75 ${isActive ? 'underline underline-offset-8 font-semibold' : ''
                }`
              }
              style={{ color: currentForegroundColor }}
              onMouseEnter={() => setActiveMegaMenu(null)}
            >
              Shop
            </NavLink>

            {/* Mega-menu triggers for Men, Women, Kids */}
            {(['men', 'women', 'kids'] as const).map((key) => {
              const item = MEGA_MENUS[key];
              const isSelected = activeMegaMenu === key;
              return (
                <div
                  key={key}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => handleMouseEnter(key)}
                >
                  <button
                    onClick={() => setActiveMegaMenu(isSelected ? null : key)}
                    aria-expanded={isSelected}
                    aria-haspopup="true"
                    className={`flex items-center gap-1.5 text-sm font-medium tracking-widest uppercase transition-opacity duration-200 hover:opacity-75 focus:outline-none ${isSelected ? 'opacity-100 font-semibold' : ''
                      }`}
                    style={{ color: currentForegroundColor }}
                  >
                    <span>{item.name}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Right Action Icons (Search, User, Cart) */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Search Button */}
            <div className="relative">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                aria-label="Search products"
                className="p-2 transition-opacity duration-200 hover:opacity-75"
                style={{ color: currentForegroundColor }}
              >
                <Search size={20} strokeWidth={1.5} />
              </button>

              {/* Search popup bar */}
              {isSearchOpen && (
                <form
                  onSubmit={handleSearchSubmit}
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-brand-white text-brand-black border border-brand-stone shadow-2xl p-3 z-50 flex gap-2"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search catalogue..."
                    autoFocus
                    className="flex-1 text-sm bg-brand-stone/20 px-3 py-2 border border-brand-stone focus:outline-none focus:border-brand-black"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-black text-brand-white text-xs font-semibold tracking-wider uppercase hover:bg-brand-black/80"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>

            {/* Auth / Account Menu */}
            <div className="relative" ref={authMenuRef}>
              <button
                onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                aria-label="User account"
                aria-expanded={isAuthMenuOpen}
                className="p-2 transition-opacity duration-200 hover:opacity-75"
                style={{ color: currentForegroundColor }}
              >
                <User size={20} strokeWidth={1.5} />
              </button>

              {isAuthMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-brand-white text-brand-black border border-brand-stone shadow-2xl py-2 z-50 text-sm">
                  {isAuthenticated() ? (
                    <>
                      <div className="px-4 py-2 border-b border-brand-stone/60 text-xs text-brand-taupe truncate font-medium">
                        {user?.email}
                      </div>
                      <Link
                        to="/orders"
                        className="block px-4 py-2 hover:bg-brand-stone/20 transition-colors font-medium"
                        onClick={() => setIsAuthMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 hover:bg-brand-stone/20 transition-colors font-medium"
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
                        className="block w-full text-left px-4 py-2 hover:bg-brand-stone/20 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="block px-4 py-2 hover:bg-brand-stone/20 transition-colors"
                        onClick={() => setIsAuthMenuOpen(false)}
                      >
                        Log In
                      </Link>
                      <Link
                        to="/register"
                        className="block px-4 py-2 hover:bg-brand-stone/20 transition-colors"
                        onClick={() => setIsAuthMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Bag / Cart */}
            <Link
              to="/cart"
              aria-label={`Shopping Cart (${itemCount} items)`}
              className="relative p-2 transition-opacity duration-200 hover:opacity-75"
              style={{ color: currentForegroundColor }}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center text-[10px] font-bold bg-brand-black text-brand-white rounded-full ring-2 ring-brand-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Mega-Menu Dropdown Panel */}
      {activeMegaMenu && (
        <div
          className="hidden lg:block w-full bg-brand-white text-brand-black border-b border-brand-stone shadow-2xl transition-all duration-200"
          onMouseEnter={() => handleMouseEnter(activeMegaMenu)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-8 py-10">
            {activeMegaMenu && MEGA_MENUS[activeMegaMenu] && (
              <div className="grid grid-cols-12 gap-8 items-start">
                {/* Category Navigation Columns */}
                <div className="col-span-8">
                  <div className="flex items-center justify-between mb-6 pb-2 border-b border-brand-stone">
                    <h3 className="text-xl font-display font-medium tracking-tight uppercase">
                      {MEGA_MENUS[activeMegaMenu].name} Collection
                    </h3>
                    <Link
                      to={MEGA_MENUS[activeMegaMenu].shopAllPath}
                      onClick={() => setActiveMegaMenu(null)}
                      className="group inline-flex items-center text-xs font-semibold uppercase tracking-widest text-brand-black hover:text-brand-taupe transition-colors"
                    >
                      Shop All {MEGA_MENUS[activeMegaMenu].name}
                      <ArrowRight size={14} className="ml-1.5 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {MEGA_MENUS[activeMegaMenu].sections ? (
                    /* Subdivided Menu (e.g. Kids: Girls and Boys) */
                    <div className="grid grid-cols-2 gap-8">
                      {MEGA_MENUS[activeMegaMenu].sections!.map((section) => (
                        <div key={section.title}>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-taupe mb-4">
                            {section.title}
                          </h4>
                          <ul className="space-y-3">
                            {section.categories.map((cat) => (
                              <li key={cat.name}>
                                <Link
                                  to={cat.path}
                                  onClick={() => setActiveMegaMenu(null)}
                                  className="text-sm font-medium text-brand-black/80 hover:text-brand-black hover:translate-x-1 inline-block transition-all"
                                >
                                  {cat.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Direct Categories (e.g. Men, Women) */
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {MEGA_MENUS[activeMegaMenu].categories?.map((cat) => (
                        <div key={cat.name}>
                          <Link
                            to={cat.path}
                            onClick={() => setActiveMegaMenu(null)}
                            className="text-sm font-medium text-brand-black/80 hover:text-brand-black hover:translate-x-1 inline-block transition-all py-1"
                          >
                            {cat.name}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Editorial Spotlight Card */}
                <div className="col-span-4 bg-brand-stone/20 p-6 flex flex-col justify-between border border-brand-stone/60">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-brand-taupe block mb-2">
                      Featured Curation
                    </span>
                    <h4 className="text-lg font-display font-medium uppercase tracking-tight mb-2">
                      {MEGA_MENUS[activeMegaMenu].spotlightTitle}
                    </h4>
                    <p className="text-xs text-brand-taupe leading-relaxed mb-6">
                      {MEGA_MENUS[activeMegaMenu].spotlightDesc}
                    </p>
                  </div>
                  <Link
                    to={MEGA_MENUS[activeMegaMenu].shopAllPath}
                    onClick={() => setActiveMegaMenu(null)}
                    className="inline-flex items-center text-xs font-bold tracking-widest uppercase text-brand-black hover:text-brand-taupe transition-colors"
                  >
                    Explore Selection <ArrowRight size={14} className="ml-1.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-brand-white text-brand-black border-b border-brand-stone shadow-2xl max-h-[85vh] overflow-y-auto">
          <div className="px-4 py-4 divide-y divide-brand-stone/50">
            {/* Shop All */}
            <div className="py-3">
              <Link
                to="/shop"
                onClick={() => setMenuOpen(false)}
                className="block text-base font-semibold tracking-wider uppercase text-brand-black hover:text-brand-taupe transition-colors"
              >
                Shop All
              </Link>
            </div>

            {/* Accordion Categories for Men, Women, Kids */}
            {(['men', 'women', 'kids'] as const).map((key) => {
              const item = MEGA_MENUS[key];
              const isExpanded = mobileExpandedSection === key;

              return (
                <div key={key} className="py-3">
                  <button
                    onClick={() => setMobileExpandedSection(isExpanded ? null : key)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between text-base font-semibold tracking-wider uppercase text-brand-black hover:text-brand-taupe transition-colors focus:outline-none"
                  >
                    <span>{item.name}</span>
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pl-4 space-y-3 pt-2">
                      <Link
                        to={item.shopAllPath}
                        onClick={() => setMenuOpen(false)}
                        className="block text-xs font-bold tracking-widest uppercase text-brand-black underline underline-offset-4 mb-2"
                      >
                        Shop All {item.name}
                      </Link>

                      {item.sections ? (
                        item.sections.map((section) => (
                          <div key={section.title} className="pt-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-taupe block mb-1.5">
                              {section.title}
                            </span>
                            <div className="space-y-2 pl-2">
                              {section.categories.map((cat) => (
                                <Link
                                  key={cat.name}
                                  to={cat.path}
                                  onClick={() => setMenuOpen(false)}
                                  className="block text-sm text-brand-black/80 hover:text-brand-black py-0.5"
                                >
                                  {cat.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        item.categories?.map((cat) => (
                          <Link
                            key={cat.name}
                            to={cat.path}
                            onClick={() => setMenuOpen(false)}
                            className="block text-sm text-brand-black/80 hover:text-brand-black py-0.5"
                          >
                            {cat.name}
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Links */}
            <div className="pt-4 pb-2 space-y-3">
              <Link
                to="/cart"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between text-sm uppercase tracking-wider font-medium text-brand-black"
              >
                <span>Bag</span>
                <span className="text-xs bg-brand-black text-brand-white px-2 py-0.5 rounded-full font-bold">
                  {itemCount}
                </span>
              </Link>
              {isAuthenticated() ? (
                <>
                  <Link
                    to="/orders"
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm uppercase tracking-wider font-medium text-brand-black"
                  >
                    My Orders
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block text-sm uppercase tracking-wider font-medium text-brand-black"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left text-sm uppercase tracking-wider font-medium text-brand-taupe hover:text-brand-black"
                  >
                    Logout ({user?.email})
                  </button>
                </>
              ) : (
                <div className="flex gap-4 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-semibold uppercase tracking-wider text-brand-black"
                  >
                    Log In
                  </Link>
                  <span className="text-brand-stone">|</span>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-semibold uppercase tracking-wider text-brand-black"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
