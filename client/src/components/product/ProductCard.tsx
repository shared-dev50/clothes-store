import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);

  const hasImages = Array.isArray(product.images) && product.images.length > 0;
  const hasMultipleImages = hasImages && product.images.length > 1;

  const displayImage = hasImages
    ? (isHovered && hasMultipleImages ? product.images[1] : product.images[0])
    : undefined;

  return (
    <div 
      className="group flex flex-col cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-brand-stone/30 mb-4 block">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-stone/10 text-brand-taupe/50 text-xs font-medium uppercase tracking-widest">
            No Image
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.newArrival && (
            <span className="bg-brand-white text-brand-black text-[10px] uppercase font-bold tracking-wider px-2 py-1">
              New
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-brand-black text-brand-white text-[10px] uppercase font-bold tracking-wider px-2 py-1">
              Sold Out
            </span>
          )}
        </div>
      </Link>
      
      <div className="flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <Link to={`/product/${product.slug}`}>
            <h3 className="text-sm font-medium text-brand-black hover:text-brand-taupe transition-colors">
              {product.name}
            </h3>
          </Link>
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
            KES {product.price.toLocaleString()}
          </span>
        </div>
        
        <p className="text-xs text-brand-taupe mb-3">
          {product.colors.length} {product.colors.length === 1 ? 'Color' : 'Colors'}
        </p>
        
        {/* Color swatches preview */}
        <div className="flex gap-1.5 mt-auto">
          {product.colors.map((color) => (
            <div 
              key={color.name}
              className="w-3.5 h-3.5 rounded-full border border-brand-stone/50 shadow-sm"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
