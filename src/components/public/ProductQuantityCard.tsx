/**
 * @file ProductQuantityCard.tsx
 * @module components/public
 * @description Componente de tarjeta de producto con selector interactivo [-] N [+] y botón de agregar al carrito (FASE 5D).
 * @responsibility Renderizar imagen, nombre, precio, control de cantidad [-] N [+] y botón [Agregar al carrito].
 * @dependencies lucide-react, CartContext
 * @status Stable (FASE 5D - Customer Ordering Experience)
 */

'use client';

import React, { useState } from 'react';
import { Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { useCart, CartProduct } from '@/core/context/CartContext';

interface ProductQuantityCardProps {
  product: CartProduct;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function ProductQuantityCard({
  product,
  primaryColor = '#ff6b2b',
  secondaryColor = '#1c0a00',
}: ProductQuantityCardProps) {
  const { getItemQuantity, setItemQuantity, addToCart } = useCart();
  const currentInCartQty = getItemQuantity(product.id);

  // Cantidad local seleccionada para agregar
  const [selectedQty, setSelectedQty] = useState<number>(currentInCartQty > 0 ? currentInCartQty : 1);
  const [addedToast, setAddedToast] = useState(false);

  const handleDecrement = () => {
    if (selectedQty > 1) {
      setSelectedQty(selectedQty - 1);
    }
  };

  const handleIncrement = () => {
    setSelectedQty(selectedQty + 1);
  };

  const handleAdd = () => {
    setItemQuantity(product, (currentInCartQty > 0 ? 0 : 0) + selectedQty);
    addToCart(product, selectedQty - (currentInCartQty > 0 ? currentInCartQty : 0));
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <div
      className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group"
      style={{ borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {/* Imagen & Tag de Categoría */}
      <div className="relative w-full h-44 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {product.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        {currentInCartQty > 0 && (
          <span
            className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-xs font-black text-white shadow-lg animate-pulse"
            style={{ backgroundColor: primaryColor }}
          >
            {currentInCartQty} en carrito
          </span>
        )}
      </div>

      {/* Información del Producto */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-white font-extrabold text-base leading-snug line-clamp-1">{product.nombre}</h3>
          {product.descripcion && (
            <p className="text-slate-300/70 text-xs mt-1 line-clamp-2 leading-relaxed">{product.descripcion}</p>
          )}
        </div>

        <div className="pt-2 border-t border-white/10 space-y-3">
          {/* Precio */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black" style={{ color: primaryColor }}>
              ${product.precio.toFixed(2)}
            </span>
          </div>

          {/* Selector [-] N [+] + Botón Agregar al Carrito */}
          <div className="flex items-center gap-2 pt-1">
            {/* Controles de cantidad [-] N [+] */}
            <div className="flex items-center bg-black/40 border border-white/15 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={selectedQty <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-7 text-center text-sm font-black text-white">{selectedQty}</span>
              <button
                type="button"
                onClick={handleIncrement}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Botón Agregar al Carrito */}
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              style={{ backgroundColor: addedToast ? '#10b981' : primaryColor }}
            >
              {addedToast ? (
                <>
                  <Check className="w-4 h-4" /> ¡Agregado!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" /> Agregar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
