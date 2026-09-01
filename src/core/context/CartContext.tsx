/**
 * @file CartContext.tsx
 * @module core/context
 * @description Estado unificado del carrito de compras del cliente (FASE 5D).
 * @responsibility Administrar items seleccionados, cantidades, cálculo de subtotal, costo de envío y total,
 *   estado de apertura de modal/drawer de carrito, con persistencia automática en localStorage por negocio.
 * @dependencies React Context
 * @status Stable (FASE 5D - Customer Ordering Experience)
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartProduct {
  id: string;
  nombre: string;
  precio: number;
  imagenUrl?: string | null;
  descripcion?: string | null;
  categoriaId?: string | null;
  varianteId?: string | null;
  varianteNombre?: string | null;
  sku?: string | null;
  llevaEmpaque?: boolean;
  precioEmpaque?: number;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

export type DeliveryType = 'DOMICILIO' | 'RETIRO' | 'MESA';

export interface CustomerFormData {
  nombre: string;
  telefono: string;
  direccion: string;
  referencia?: string;
  email?: string;
  lat?: number | null;
  lng?: number | null;
  tableName?: string;
  horaEntrega?: string;
}

export function getCartItemKey(product: { id: string; varianteId?: string | null }): string {
  return product.varianteId ? `${product.id}_${product.varianteId}` : product.id;
}

export interface CartContextType {
  cart: CartItem[];
  deliveryType: DeliveryType;
  customerData: CustomerFormData;
  deliveryCost: number;
  subtotal: number;
  total: number;
  totalItemsCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setDeliveryType: (type: DeliveryType) => void;
  setCustomerData: (data: Partial<CustomerFormData>) => void;
  setDeliveryCost: (cost: number) => void;
  getItemQuantity: (productId: string, varianteId?: string | null) => number;
  setItemQuantity: (product: CartProduct, quantity: number) => void;
  addToCart: (product: CartProduct, qtyToAdd?: number) => void;
  removeFromCart: (productId: string, varianteId?: string | null) => void;
  decrementQuantity: (productId: string, varianteId?: string | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
  businessId,
  defaultDeliveryCost = 1.50,
}: {
  children: React.ReactNode;
  businessId: string;
  defaultDeliveryCost?: number;
}) {
  const storageKey = `citiox_cart_${businessId}`;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryType, setDeliveryTypeState] = useState<DeliveryType>('DOMICILIO');
  const [deliveryCost, setDeliveryCost] = useState<number>(defaultDeliveryCost);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const [customerData, setCustomerDataState] = useState<CustomerFormData>({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    lat: null,
    lng: null,
    horaEntrega: 'ASAP',
  });

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);

  // Escuchar eventos globales de apertura de carrito
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    const handleCloseCart = () => setIsCartOpen(false);
    const handleToggleCart = () => setIsCartOpen(prev => !prev);

    window.addEventListener('citiox_open_cart', handleOpenCart);
    window.addEventListener('citiox_close_cart', handleCloseCart);
    window.addEventListener('citiox_toggle_cart', handleToggleCart);

    return () => {
      window.removeEventListener('citiox_open_cart', handleOpenCart);
      window.removeEventListener('citiox_close_cart', handleCloseCart);
      window.removeEventListener('citiox_toggle_cart', handleToggleCart);
    };
  }, []);

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      try {
        const savedCart = localStorage.getItem(storageKey);
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        }
      } catch (err) {
        console.error('[CartProvider] Error cargando carrito desde localStorage:', err);
      }
    }
  }, [businessId, storageKey]);

  // Guardar en localStorage al cambiar el carrito
  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      } catch (err) {
        console.error('[CartProvider] Error guardando carrito en localStorage:', err);
      }
    }
  }, [cart, businessId, storageKey]);

  const setDeliveryType = (type: DeliveryType) => {
    setDeliveryTypeState(type);
  };

  const setCustomerData = (data: Partial<CustomerFormData>) => {
    setCustomerDataState((prev) => ({ ...prev, ...data }));
  };

  const getItemQuantity = (productId: string, varianteId?: string | null): number => {
    const targetKey = getCartItemKey({ id: productId, varianteId });
    const found = cart.find((i) => getCartItemKey(i.product) === targetKey);
    return found ? found.quantity : 0;
  };

  const setItemQuantity = (product: CartProduct, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(product.id, product.varianteId);
      return;
    }

    const targetKey = getCartItemKey(product);

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => getCartItemKey(i.product) === targetKey);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity,
        };
        return updated;
      } else {
        return [...prev, { product, quantity }];
      }
    });
  };

  const addToCart = (product: CartProduct, qtyToAdd: number = 1) => {
    const targetKey = getCartItemKey(product);
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => getCartItemKey(i.product) === targetKey);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qtyToAdd,
        };
        return updated;
      } else {
        return [...prev, { product, quantity: qtyToAdd }];
      }
    });
  };

  const removeFromCart = (productId: string, varianteId?: string | null) => {
    const targetKey = getCartItemKey({ id: productId, varianteId });
    setCart((prev) => prev.filter((i) => getCartItemKey(i.product) !== targetKey));
  };

  const decrementQuantity = (productId: string, varianteId?: string | null) => {
    const targetKey = getCartItemKey({ id: productId, varianteId });
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => getCartItemKey(i.product) === targetKey);
      if (existingIndex >= 0) {
        const currentQty = prev[existingIndex].quantity;
        if (currentQty <= 1) {
          return prev.filter((i) => getCartItemKey(i.product) !== targetKey);
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty - 1,
        };
        return updated;
      }
      return prev;
    });
  };

  const clearCart = () => {
    setCart([]);
    if (typeof window !== 'undefined' && businessId) {
      localStorage.removeItem(storageKey);
    }
  };

  const subtotal = cart.reduce((acc, item) => {
    return acc + (Number(item.product.precio) || 0) * item.quantity;
  }, 0);

  const effectiveDeliveryCost = deliveryType === 'RETIRO' ? 0 : deliveryCost;
  const total = subtotal + effectiveDeliveryCost;
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        deliveryType,
        customerData,
        deliveryCost: effectiveDeliveryCost,
        subtotal: Math.round(subtotal * 100) / 100,
        total: Math.round(total * 100) / 100,
        totalItemsCount,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
        toggleCart,
        setDeliveryType,
        setCustomerData,
        setDeliveryCost,
        getItemQuantity,
        setItemQuantity,
        addToCart,
        removeFromCart,
        decrementQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const fallbackContext: CartContextType = {
  cart: [],
  deliveryType: 'DOMICILIO',
  customerData: { nombre: '', telefono: '', direccion: '' },
  deliveryCost: 0,
  subtotal: 0,
  total: 0,
  totalItemsCount: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
  openCart: () => {},
  closeCart: () => {},
  toggleCart: () => {},
  setDeliveryType: () => {},
  setCustomerData: () => {},
  setDeliveryCost: () => {},
  getItemQuantity: () => 0,
  setItemQuantity: () => {},
  addToCart: () => {},
  removeFromCart: () => {},
  decrementQuantity: () => {},
  clearCart: () => {},
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    return fallbackContext;
  }
  return context;
}
