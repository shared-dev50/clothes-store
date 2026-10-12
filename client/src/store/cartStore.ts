import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '../types';

export interface PendingOrderItemSnapshot {
  variantId: string;
  quantity: number;
}

export interface PendingOrderRef {
  orderNumber: string;
  itemsSnapshot: PendingOrderItemSnapshot[];
  createdAt?: number;
}

interface CartState {
  cart: CartItem[];
  pendingOrder: PendingOrderRef | null;
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setPendingOrder: (pendingOrder: PendingOrderRef | null) => void;
  clearPendingOrder: () => void;
}

export const isCartMatchingSnapshot = (
  cart: CartItem[],
  snapshot: Array<{ variantId: string; quantity: number }> | undefined | null
): boolean => {
  if (!snapshot || !cart) return false;
  if (cart.length !== snapshot.length) return false;

  for (const item of cart) {
    const match = snapshot.find((s) => s.variantId === item.variantId);
    if (!match || match.quantity !== item.quantity) {
      return false;
    }
  }
  return true;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      pendingOrder: null,

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

      clearCart: () => set({ cart: [], pendingOrder: null }),

      setPendingOrder: (pendingOrder) => set({ pendingOrder }),

      clearPendingOrder: () => set({ pendingOrder: null }),
    }),
    {
      name: 'clothing_store_cart',
    }
  )
);
