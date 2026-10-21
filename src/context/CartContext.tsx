'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItemType {
  variantId: string;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  thumbnail?: string;
  sku: string;
  deliveryType: string;
  deliveryModel?: string;
  invitationEmail?: string;
}

interface CartContextType {
  items: CartItemType[];
  addItem: (item: CartItemType, openDrawer?: boolean) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  subtotal: number;
  couponCode: string;
  setCouponCode: (code: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('digipro_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('digipro_cart', JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (newItem: CartItemType, openDrawer: boolean = true) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.variantId === newItem.variantId);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += newItem.quantity;
        return copy;
      }
      return [...prev, newItem];
    });
    if (openDrawer) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode('');
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        subtotal,
        couponCode,
        setCouponCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
