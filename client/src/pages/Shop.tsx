import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { getProducts, getCategories } from '../services/productApi';
import { ProductCard } from '../components/product/ProductCard';
import { useUiStore } from '../store/uiStore';

export const Shop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  
  const { isFilterOpen, setFilterOpen, toggleFilter } = useUiStore();
  const [sortOption, setSortOption] = useState('newest');

  const { data: fetchedProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', categoryParam],
    queryFn: () => getProducts(categoryParam || undefined),
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const loading = loadingProducts || loadingCategories;

  let products = [...fetchedProducts];
  // Handle client-side sorting
  if (sortOption === 'price-low') {
    products.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'price-high') {
    products.sort((a, b) => b.price - a.price);
  } else if (sortOption === 'newest') {
    products = products.filter(p => p.newArrival).concat(products.filter(p => !p.newArrival));
  }

  const handleCategorySelect = (category: string) => {
    if (category === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
    setFilterOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tighter uppercase mb-2">
            {categoryParam === 'new' ? 'New Arrivals' : categoryParam && categoryParam !== 'All' ? categoryParam : 'All Products'}
          </h1>
          <p className="text-brand-taupe text-sm">
            {products.length} {products.length === 1 ? 'Product' : 'Products'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleFilter}
            className="md:hidden flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border border-brand-stone px-4 py-2"
          >
            <Filter size={16} /> Filters
          </button>
          
          <div className="relative group">
            <button className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border border-brand-stone px-4 py-2 min-w-[160px] justify-between">
              Sort By <ChevronDown size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-brand-white border border-brand-stone shadow-xl hidden group-hover:block z-20">
              <div className="flex flex-col py-2">
                {[
                  { value: 'newest', label: 'Newest' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'price-high', label: 'Price: High to Low' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSortOption(option.value)}
                    className={`text-left px-4 py-2 text-sm uppercase tracking-wide hover:bg-brand-stone/20 ${sortOption === option.value ? 'font-bold' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Sidebar Filters - Desktop */}
        <div className={`md:w-1/4 lg:w-1/5 ${isFilterOpen ? 'fixed inset-0 z-50 bg-brand-white p-6 overflow-y-auto' : 'hidden md:block'}`}>
          {isFilterOpen && (
            <div className="flex justify-between items-center mb-8 md:hidden">
              <h2 className="text-xl font-display uppercase tracking-wider">Filters</h2>
              <button onClick={() => setFilterOpen(false)}><X size={24} /></button>
            </div>
          )}

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone pb-2">Category</h3>
              <ul className="space-y-3">
                {categories.map(category => (
                  <li key={category}>
                    <button
                      onClick={() => handleCategorySelect(category)}
                      className={`text-sm uppercase tracking-wide transition-colors ${
                        (categoryParam === category) || (!categoryParam && category === 'All')
                          ? 'font-bold text-brand-black'
                          : 'text-brand-taupe hover:text-brand-black'
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Price Filter Mock */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest mb-4 border-b border-brand-stone pb-2">Price</h3>
              <div className="space-y-3">
                {['All', 'Under KES 5,000', 'KES 5,000 - 10,000', 'Over KES 10,000'].map(price => (
                  <div key={price} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 border border-brand-black flex items-center justify-center ${price === 'All' ? 'bg-brand-black' : 'bg-transparent'}`}>
                      {price === 'All' && <div className="w-2 h-2 bg-brand-white" />}
                    </div>
                    <span className="text-sm uppercase tracking-wide text-brand-taupe group-hover:text-brand-black">{price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="w-full md:w-3/4 lg:w-4/5">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse flex flex-col">
                  <div className="bg-brand-stone/30 aspect-[4/5] mb-4 w-full"></div>
                  <div className="h-4 bg-brand-stone/40 w-3/4 mb-2"></div>
                  <div className="h-4 bg-brand-stone/40 w-1/4"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <h2 className="text-2xl font-display uppercase tracking-wider mb-2">No products found</h2>
              <p className="text-brand-taupe mb-6">Try adjusting your filters to find what you're looking for.</p>
              <button 
                onClick={() => handleCategorySelect('All')}
                className="px-6 py-3 bg-brand-black text-brand-white text-sm font-semibold uppercase tracking-widest"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
