import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../types';

interface CartState {
  cart: CartItem[];
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      
      addToCart: (product, variant, quantity) => {
        set((state) => {
          const existingItemIndex = state.cart.findIndex((item) => item.variantId === variant.id);
          
          if (existingItemIndex >= 0) {
            const newCart = [...state.cart];
            const newQuantity = Math.min(newCart[existingItemIndex].quantity + quantity, variant.stock);
            newCart[existingItemIndex].quantity = newQuantity;
            return { cart: newCart };
          } else {
            const newItem: CartItem = {
              id: variant.id,
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              color: variant.color,
              size: variant.size,
              quantity: Math.min(quantity, variant.stock),
              image: product.images[0],
            };
            return { cart: [...state.cart, newItem] };
          }
        });
      },
      
      removeFromCart: (cartItemId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== cartItemId),
        }));
      },
      
      updateQuantity: (cartItemId, quantity) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
      },
      
      clearCart: () => set({ cart: [] }),
      
      get subtotal() {
        return get().cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      get itemCount() {
        return get().cart.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'studio_nairobi_cart',
    }
  )
);
