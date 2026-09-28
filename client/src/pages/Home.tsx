import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { getFeaturedProducts } from '../services/productApi';
import { ProductCard } from '../components/product/ProductCard';

// Using the generated assets
import heroImage from '../assets/images/hero.png';
import lookbookImage from '../assets/images/lookbook.png';
import accessoriesImage from '../assets/images/accessories.png';

export const Home: React.FC = () => {
  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: getFeaturedProducts,
  });
  
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <img 
          src={heroImage} 
          alt="Studio Nairobi Collection" 
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-brand-black/20" />
        
        <div className="absolute inset-0 flex flex-col justify-end pb-24 md:pb-32 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="max-w-2xl text-brand-white">
            <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tighter uppercase mb-4 leading-none">
              Modern <br/> Heritage.
            </h1>
            <p className="text-base md:text-lg mb-8 max-w-md text-brand-white/90">
              Introducing Collection 01. Minimalist contemporary silhouettes crafted with a Kenyan soul.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/shop" 
                className="inline-flex justify-center items-center px-8 py-4 bg-brand-white text-brand-black text-sm font-semibold tracking-widest uppercase hover:bg-brand-stone transition-colors"
              >
                Shop Collection
              </Link>
              <Link 
                to="/shop?category=new" 
                className="inline-flex justify-center items-center px-8 py-4 bg-transparent border border-brand-white text-brand-white text-sm font-semibold tracking-widest uppercase hover:bg-brand-white/10 transition-colors"
              >
                New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tighter uppercase mb-2">Featured</h2>
            <p className="text-brand-taupe text-sm">Curated selection of our signature pieces.</p>
          </div>
          <Link to="/shop" className="group flex items-center text-sm font-semibold uppercase tracking-wider hover:text-brand-taupe transition-colors">
            View All <ArrowRight size={16} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex flex-col">
                <div className="bg-brand-stone/30 aspect-[4/5] mb-4 w-full"></div>
                <div className="h-4 bg-brand-stone/40 w-3/4 mb-2"></div>
                <div className="h-4 bg-brand-stone/40 w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Editorial / Lookbook Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-center">
          <div className="w-full md:w-1/2 aspect-[3/4] relative overflow-hidden">
            <img 
              src={lookbookImage} 
              alt="Editorial Lookbook" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl font-display font-medium tracking-tighter uppercase mb-6">
              The Canvas <br/> Collection
            </h2>
            <p className="text-brand-taupe text-base md:text-lg mb-8 max-w-md leading-relaxed">
              Designed in Nairobi, constructed for the world. We focus on heavy, durable fabrics paired with relaxed, boxy cuts to create pieces that live alongside you.
            </p>
            <Link 
              to="/shop?category=Hoodies" 
              className="inline-flex justify-center items-center px-8 py-4 bg-brand-black text-brand-white text-sm font-semibold tracking-widest uppercase hover:bg-brand-black/80 transition-colors self-start"
            >
              Discover Heavyweight
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Highlight */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
          <Link to="/shop?category=Trousers" className="relative group overflow-hidden bg-brand-stone/20">
            <img 
              src="https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&auto=format&fit=crop" 
              alt="Trousers" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-3xl font-display font-medium text-brand-white uppercase tracking-widest">Tailored Bottoms</h3>
            </div>
          </Link>
          <Link to="/shop?category=Accessories" className="relative group overflow-hidden bg-brand-stone/20">
            <img 
              src={accessoriesImage} 
              alt="Accessories" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-3xl font-display font-medium text-brand-white uppercase tracking-widest">Accessories</h3>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};
