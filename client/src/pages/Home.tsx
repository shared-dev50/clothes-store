import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { getFeaturedProducts, getNewArrivals, getHomepageSettings, getCachedHomepageSettings } from '../services/productApi';
import { ProductCard } from '../components/product/ProductCard';

import heroFallbackImage from '../assets/images/hero.png';

export const Home: React.FC = () => {
  
  const { data: settings } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: getHomepageSettings,
    initialData: getCachedHomepageSettings,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
  });

  // 2. Featured Products Query
  const { data: featuredData = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: getFeaturedProducts,
  });

  // 3. New Arrivals Query
  const { data: newArrivalsData = [], isLoading: loadingNewArrivals } = useQuery({
    queryKey: ['newArrivals'],
    queryFn: getNewArrivals,
  });

  const featuredProducts = featuredData.slice(0, 4);
  const featuredIds = new Set(featuredProducts.map((p) => p.id));

  const distinctNewArrivals = newArrivalsData.filter((p) => !featuredIds.has(p.id));
  const newArrivalProducts = (
    distinctNewArrivals.length > 0 ? distinctNewArrivals : newArrivalsData
  ).slice(0, 4);

  const heroHeading = settings?.heroHeading || 'Modern\nHeritage.';
  const heroCaption =
    settings?.heroCaption ||
    'Introducing Collection 01. Minimalist contemporary silhouettes crafted with a Kenyan soul.';
  const heroCtaLabel = settings?.heroCtaLabel || 'Shop Collection';
  const heroCtaLink = settings?.heroCtaLink || '/shop';
  const heroCtaSecondaryLabel = settings?.heroCtaSecondaryLabel || 'New Arrivals';
  const heroCtaSecondaryLink = settings?.heroCtaSecondaryLink || '/shop?category=new';

  const heroDesktopImage = settings?.heroImageUrl || heroFallbackImage;
  const heroMobileImage = settings?.heroMobileImageUrl || heroDesktopImage;

  // Filter and sort visible lifestyle cards
  const visibleCards = (settings?.lifestyleCards || [])
    .filter((card) => card.isVisible !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="w-full overflow-x-hidden">
      {/* Full-Viewport Hero Section */}
      <section className="relative w-full h-[100svh] min-h-[600px] overflow-hidden flex flex-col justify-end">
        {/* Hero Background Image with responsive cropping and composition */}
        <picture className="absolute inset-0 w-full h-full">
          {heroMobileImage && heroMobileImage !== heroDesktopImage && (
            <source media="(max-width: 768px)" srcSet={heroMobileImage} />
          )}
          <img
            src={heroDesktopImage}
            alt="HBS Wear Signature Collection"
            className="w-full h-full object-cover object-center md:object-[center_15%]"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/45 pointer-events-none" />

        {/* Hero Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-16 sm:pb-20 md:pb-24">
          <div className="max-w-2xl text-brand-white">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-medium tracking-tighter uppercase mb-4 leading-[0.95] whitespace-pre-line">
              {heroHeading}
            </h1>
            <p className="text-sm sm:text-base md:text-lg mb-8 max-w-lg text-brand-white/90 leading-relaxed font-normal">
              {heroCaption}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={heroCtaLink}
                className="inline-flex justify-center items-center px-8 py-4 bg-brand-white text-brand-black text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-brand-stone transition-colors shadow-lg active:scale-95"
              >
                {heroCtaLabel}
              </Link>
              {heroCtaSecondaryLabel && heroCtaSecondaryLink && (
                <Link
                  to={heroCtaSecondaryLink}
                  className="inline-flex justify-center items-center px-8 py-4 bg-transparent border border-brand-white text-brand-white text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-brand-white/15 transition-colors active:scale-95"
                >
                  {heroCtaSecondaryLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection Grid */}
      <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-10 md:mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-medium tracking-tight uppercase mb-1.5">
              Featured
            </h2>
            <p className="text-brand-taupe text-xs sm:text-sm">Curated selection of our signature pieces.</p>
          </div>
          <Link
            to="/shop"
            className="group inline-flex items-center text-xs sm:text-sm font-semibold uppercase tracking-wider text-brand-black hover:text-brand-taupe transition-colors"
          >
            View All{' '}
            <ArrowRight size={16} className="ml-1.5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex flex-col">
                <div className="bg-brand-stone/30 aspect-[4/5] mb-4 w-full rounded-sm" />
                <div className="h-4 bg-brand-stone/40 w-3/4 mb-2 rounded-sm" />
                <div className="h-4 bg-brand-stone/40 w-1/4 rounded-sm" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-brand-taupe">No featured products available.</div>
        )}
      </section>

      {(!loadingNewArrivals && newArrivalProducts.length > 0) || loadingNewArrivals ? (
        <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-brand-stone/50">
          <div className="flex justify-between items-end mb-10 md:mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-medium tracking-tight uppercase mb-1.5">
                New Arrivals
              </h2>
              <p className="text-brand-taupe text-xs sm:text-sm">The latest additions to our wardrobe.</p>
            </div>
            <Link
              to="/shop?category=new"
              className="group inline-flex items-center text-xs sm:text-sm font-semibold uppercase tracking-wider text-brand-black hover:text-brand-taupe transition-colors"
            >
              Browse New{' '}
              <ArrowRight size={16} className="ml-1.5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loadingNewArrivals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex flex-col">
                  <div className="bg-brand-stone/30 aspect-[4/5] mb-4 w-full rounded-sm" />
                  <div className="h-4 bg-brand-stone/40 w-3/4 mb-2 rounded-sm" />
                  <div className="h-4 bg-brand-stone/40 w-1/4 rounded-sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
              {newArrivalProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {visibleCards.length > 0 && (
        <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-brand-stone/50">
          <div className="mb-10 text-center max-w-xl mx-auto">
            <span className="text-xs font-bold tracking-widest uppercase text-brand-taupe block mb-2">
              Curated Living
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-medium tracking-tight uppercase">
              The Lifestyle Edit
            </h2>
          </div>

          <div
            className={`grid gap-6 sm:gap-8 ${
              visibleCards.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto'
                : visibleCards.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-3'
            }`}
          >
            {visibleCards.map((card) => {
              const destination = card.destination || '/shop';
              return (
                <Link
                  key={card.id}
                  to={destination}
                  className="group relative flex flex-col overflow-hidden bg-brand-stone/20 h-[480px] sm:h-[520px] md:h-[560px] border border-brand-stone/60 transition-shadow duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-black"
                >
                  {/* Card Background Image */}
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-brand-stone/40 flex items-center justify-center text-brand-taupe text-sm">
                      No Image Available
                    </div>
                  )}

                  {/* Gradient Dark Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

                  {/* Text Content */}
                  <div className="relative z-10 mt-auto p-6 sm:p-8 text-brand-white flex flex-col justify-end">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-brand-white/70 mb-1.5 block">
                      Category Spotlight
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-display font-medium uppercase tracking-tight mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-brand-white/85 mb-6 leading-relaxed line-clamp-2">
                      {card.caption}
                    </p>
                    <div className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-brand-white group-hover:underline underline-offset-4">
                      Explore Collection{' '}
                      <ArrowRight size={14} className="ml-2 transform group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
