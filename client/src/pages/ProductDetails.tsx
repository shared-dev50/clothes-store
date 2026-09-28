import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ProductVariant } from '../types';
import { getProductById } from '../services/productApi';
import { useCartStore } from '../store/cartStore';

export const ProductDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: product, isLoading: loading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductById(slug!),
    enabled: !!slug,
  });
  
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const addToCart = useCartStore((state) => state.addToCart);

  // Set defaults when product is loaded
  useEffect(() => {
    if (product) {
      if (product.colors.length > 0 && !selectedColor) setSelectedColor(product.colors[0].name);
      if (product.sizes.length > 0 && !selectedSize) setSelectedSize(product.sizes[0]);
    }
  }, [product, selectedColor, selectedSize]);

  // Update current variant when color or size changes
  useEffect(() => {
    if (product && selectedColor && selectedSize) {
      const variant = product.variants.find(
        (v) => v.color === selectedColor && v.size === selectedSize
      );
      setCurrentVariant(variant || null);
      setQuantity(1); // Reset quantity on variant change
    }
  }, [product, selectedColor, selectedSize]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24 flex justify-center">
        <div className="animate-pulse flex flex-col md:flex-row gap-12 w-full">
          <div className="w-full md:w-1/2 aspect-[3/4] bg-brand-stone/30"></div>
          <div className="w-full md:w-1/2 space-y-6">
            <div className="h-10 bg-brand-stone/30 w-3/4"></div>
            <div className="h-6 bg-brand-stone/30 w-1/4"></div>
            <div className="h-32 bg-brand-stone/30 w-full"></div>
            <div className="h-12 bg-brand-stone/30 w-full mt-12"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-display uppercase tracking-widest mb-4">Product Not Found</h1>
        <Link to="/shop" className="text-brand-taupe hover:text-brand-black underline underline-offset-4">
          Return to Shop
        </Link>
      </div>
    );
  }

  const isOutOfStock = currentVariant ? currentVariant.stock === 0 : false;
  const isSelectionIncomplete = !selectedColor || !selectedSize || !currentVariant;

  const handleAddToCart = () => {
    if (product && currentVariant && !isOutOfStock) {
      addToCart(product, currentVariant, quantity);
      // Optional: Add some toast notification here
      alert('Added to cart!');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-brand-taupe uppercase tracking-widest mb-8 md:mb-12">
        <Link to="/" className="hover:text-brand-black">Home</Link>
        <ChevronRight size={14} className="mx-2" />
        <Link to={`/shop?category=${product.category}`} className="hover:text-brand-black">{product.category}</Link>
        <ChevronRight size={14} className="mx-2" />
        <span className="text-brand-black truncate">{product.name}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
        {/* Image Gallery */}
        <div className="w-full md:w-1/2 flex flex-col-reverse md:flex-row gap-4 h-fit sticky top-24">
          <div className="flex md:flex-col gap-4 overflow-x-auto md:w-20 lg:w-24 no-scrollbar">
            {product.images.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`flex-shrink-0 w-20 aspect-[4/5] bg-brand-stone/20 ${activeImageIndex === idx ? 'ring-1 ring-brand-black' : 'opacity-60 hover:opacity-100'}`}
              >
                <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex-1 bg-brand-stone/10 aspect-[3/4] md:aspect-auto md:h-[80vh]">
            <img 
              src={product.images[activeImageIndex]} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="w-full md:w-1/2 flex flex-col pb-24 md:pb-0">
          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tighter uppercase mb-4">
            {product.name}
          </h1>
          <p className="text-lg font-semibold tracking-wide mb-8">
            KES {product.price.toLocaleString()}
          </p>

          <p className="text-brand-taupe text-sm leading-relaxed mb-8">
            {product.description}
          </p>

          {/* Color Selection */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest">Color</span>
              <span className="text-xs text-brand-taupe uppercase">{selectedColor}</span>
            </div>
            <div className="flex gap-3">
              {product.colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.name 
                      ? 'border-brand-black p-0.5 scale-110' 
                      : 'border-transparent hover:border-brand-stone'
                  }`}
                >
                  <div 
                    className="w-full h-full rounded-full border border-brand-stone/20 shadow-sm"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest">Size</span>
              <button className="text-xs text-brand-taupe uppercase underline underline-offset-4 hover:text-brand-black">Size Guide</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {product.sizes.map(size => {
                // Check if this size + currently selected color exists in variants and has stock
                const sizeVariant = product.variants.find(v => v.size === size && v.color === selectedColor);
                const isSizeOutOfStock = sizeVariant ? sizeVariant.stock === 0 : true;

                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={isSizeOutOfStock}
                    className={`
                      py-3 text-sm uppercase font-medium tracking-wider transition-all border
                      ${selectedSize === size 
                        ? 'border-brand-black bg-brand-black text-brand-white' 
                        : isSizeOutOfStock 
                          ? 'border-brand-stone/40 text-brand-stone/50 bg-brand-stone/10 cursor-not-allowed line-through' 
                          : 'border-brand-stone hover:border-brand-black bg-brand-white'
                      }
                    `}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Stock Status */}
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest block mb-3">Quantity</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center border border-brand-stone bg-brand-white">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="px-4 py-3 text-brand-black hover:bg-brand-stone/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button 
                  onClick={() => currentVariant && setQuantity(Math.min(currentVariant.stock, quantity + 1))}
                  disabled={!currentVariant || quantity >= currentVariant.stock || isOutOfStock}
                  className="px-4 py-3 text-brand-black hover:bg-brand-stone/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {currentVariant && (
                <div className="text-xs uppercase tracking-widest font-medium">
                  {currentVariant.stock > 0 ? (
                    currentVariant.stock < 10 ? (
                      <span className="text-amber-600">Only {currentVariant.stock} left in stock</span>
                    ) : (
                      <span className="text-green-600">In Stock</span>
                    )
                  ) : (
                    <span className="text-red-500">Out of Stock</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Add to Cart Actions */}
          <div className="flex flex-col gap-4 mb-12">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isSelectionIncomplete}
              className={`
                w-full py-4 text-sm font-semibold uppercase tracking-widest transition-colors
                ${isOutOfStock || isSelectionIncomplete
                  ? 'bg-brand-stone text-brand-taupe cursor-not-allowed'
                  : 'bg-brand-black text-brand-white hover:bg-brand-black/90'
                }
              `}
            >
              {isSelectionIncomplete 
                ? 'Select Size & Color' 
                : isOutOfStock 
                  ? 'Sold Out' 
                  : 'Add to Cart'
              }
            </button>
            <button
              disabled={isOutOfStock || isSelectionIncomplete}
              className={`
                w-full py-4 text-sm font-semibold uppercase tracking-widest transition-colors border border-brand-black
                ${isOutOfStock || isSelectionIncomplete
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-transparent text-brand-black hover:bg-brand-black hover:text-brand-white'
                }
              `}
            >
              Buy it Now
            </button>
          </div>

          {/* Details Accordion Mock */}
          <div className="border-t border-brand-stone divide-y divide-brand-stone">
            <div className="py-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3">Details & Care</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-brand-taupe">
                {product.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
            <div className="py-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3">Shipping & Returns</h3>
              <p className="text-sm text-brand-taupe leading-relaxed">
                Free standard delivery on orders over KES 10,000 within Nairobi. 
                Next day delivery available. Returns accepted within 14 days of receipt.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
