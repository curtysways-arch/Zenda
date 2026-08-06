/**
 * @file CartContext.tsx
 * @module core/context
 * @description Estado unificado del carrito de compras del cliente (FASE 5D).
 * @responsibility Administrar items seleccionados, cantidades, cálculo de subtotal, costo de envío y total,
 *   con persistencia automática en localStorage por negocio.
 * @dependencies React Context
 * @status Stable (FASE 5D - Customer Ordering Experience)
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartProduct {
  id: string;
  nombre: string;
  precio: number;
  imagenUrl?: string | null;
  descripcion?: string | null;
  categoriaId?: string | null;
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
  lat?: number | null;
  lng?: number | null;
  tableName?: string;
  horaEntrega?: string;
}

export interface CartContextType {
  cart: CartItem[];
  deliveryType: DeliveryType;
  customerData: CustomerFormData;
  deliveryCost: number;
  subtotal: number;
  total: number;
  totalItemsCount: number;
  setDeliveryType: (type: DeliveryType) => void;
  setCustomerData: (data: Partial<CustomerFormData>) => void;
  setDeliveryCost: (cost: number) => void;
  getItemQuantity: (productId: string) => number;
  setItemQuantity: (product: CartProduct, quantity: number) => void;
  addToCart: (product: CartProduct, qtyToAdd?: number) => void;
  removeFromCart: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
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
  const [customerData, setCustomerDataState] = useState<CustomerFormData>({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    lat: null,
    lng: null,
    horaEntrega: 'ASAP',
  });

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setCart(parsed);
        }
        const savedPhone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || '';
        const savedName = localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name') || '';
        const savedAddr = localStorage.getItem('pinchos_client_address') || '';

        if (savedPhone || savedName || savedAddr) {
          setCustomerDataState(prev => ({
            ...prev,
            nombre: prev.nombre || savedName,
            telefono: prev.telefono || savedPhone,
            direccion: prev.direccion || savedAddr,
          }));
        }
      } catch (e) {
        console.error('[CartProvider] Error cargando localStorage:', e);
      }
    }
  }, [businessId, storageKey]);

  // Guardar en localStorage cada vez que cambie el carrito
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    if (typeof window !== 'undefined' && businessId) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newCart));
      } catch (e) {
        console.error('[CartProvider] Error guardando localStorage:', e);
      }
    }
  };

  const getItemQuantity = (productId: string): number => {
    const found = cart.find(i => i.product.id === productId);
    return found ? found.quantity : 0;
  };

  const setItemQuantity = (product: CartProduct, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(product.id);
      return;
    }
    const existing = cart.find(i => i.product.id === product.id);
    if (existing) {
      saveCart(cart.map(i => i.product.id === product.id ? { ...i, quantity } : i));
    } else {
      saveCart([...cart, { product, quantity }]);
    }
  };

  const addToCart = (product: CartProduct, qtyToAdd: number = 1) => {
    const currentQty = getItemQuantity(product.id);
    setItemQuantity(product, currentQty + qtyToAdd);
  };

  const decrementQuantity = (productId: string) => {
    const currentQty = getItemQuantity(productId);
    if (currentQty <= 1) {
      removeFromCart(productId);
    } else {
      const found = cart.find(i => i.product.id === productId);
      if (found) {
        setItemQuantity(found.product, currentQty - 1);
      }
    }
  };

  const removeFromCart = (productId: string) => {
    saveCart(cart.filter(i => i.product.id !== productId));
  };

  const clearCart = () => {
    saveCart([]);
  };

  const setDeliveryType = (type: DeliveryType) => {
    setDeliveryTypeState(type);
    if (type === 'RETIRO' || type === 'MESA') {
      setDeliveryCost(0);
    } else {
      setDeliveryCost(defaultDeliveryCost);
    }
  };

  const setCustomerData = (data: Partial<CustomerFormData>) => {
    setCustomerDataState(prev => {
      const next = { ...prev, ...data };
      if (typeof window !== 'undefined') {
        if (next.nombre) localStorage.setItem('pinchos_client_name', next.nombre);
        if (next.telefono) localStorage.setItem('pinchos_client_phone', next.telefono);
        if (next.direccion) localStorage.setItem('pinchos_client_address', next.direccion);
      }
      return next;
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.precio * item.quantity, 0);
  const effectiveDeliveryCost = deliveryType === 'DOMICILIO' ? deliveryCost : 0;
  const total = subtotal + effectiveDeliveryCost;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
}
