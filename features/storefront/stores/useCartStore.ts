import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import type { CartItem, StorefrontProduct } from '../types';



interface CartState {

  items: CartItem[];

  isOpen: boolean;

  isAuthOpen: boolean;

  addItem: (product: StorefrontProduct) => void;

  updateQuantity: (productId: string, quantity: number) => void;

  removeItem: (productId: string) => void;

  clearCart: () => void;

  openCart: () => void;

  closeCart: () => void;

  openAuth: () => void;

  closeAuth: () => void;

}



export const useCartStore = create<CartState>()(

  persist(

    (set, get) => ({

      items: [],

      isOpen: false,

      isAuthOpen: false,

      addItem: (product) => {

        const existing = get().items.find((item) => item.id === product.id);

        const nextItems = existing

          ? get().items.map((item) =>

              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item

            )

          : [...get().items, { ...product, quantity: 1 }];



        set({ items: nextItems, isOpen: true });

      },

      updateQuantity: (productId, quantity) => {

        if (quantity <= 0) {

          set({ items: get().items.filter((item) => item.id !== productId) });

          return;

        }



        set({

          items: get().items.map((item) =>

            item.id === productId ? { ...item, quantity: Math.min(quantity, 99) } : item

          ),

        });

      },

      removeItem: (productId) => {

        set({ items: get().items.filter((item) => item.id !== productId) });

      },

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),

      closeCart: () => set({ isOpen: false }),

      openAuth: () => set({ isAuthOpen: true }),

      closeAuth: () => set({ isAuthOpen: false }),

    }),

    {

      name: 'tpt-cart',

      partialize: (state) => ({ items: state.items }),

    }

  )

);



export const selectCartCount = (state: CartState) =>

  state.items.reduce((sum, item) => sum + item.quantity, 0);



export const selectCartSubtotal = (state: CartState) =>

  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);



export const selectCartItemCount = (state: CartState) => state.items.length;

