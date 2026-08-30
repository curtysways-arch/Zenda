'use client';

/**
 * @file ItemDetailModal.tsx
 * @module components/public
 * @description Modal interactivo de detalle completo para Promociones y Productos.
 * @responsibility Mostrar imagen HD, insignias de oferta, desglose de precio con descuento,
 *   lista de ítems incluidos en combos, observaciones personalizadas y botón de agregar al pedido.
 */

import React, { useState, useEffect } from 'react';
import { X, Heart, Plus, Minus, CheckCircle2, ShoppingBag, Sparkles, Flame, Tag, ShieldCheck } from 'lucide-react';

export interface DetailItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image?: string;
  category?: string;
  includedItems?: string[];
}

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DetailItem | null;
  primaryColor?: string;
  onAddToCart: (item: DetailItem, quantity: number, notes?: string) => void;
}

export function cleanDescriptionText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/CITIOX_META:\s*\{[\s\S]*?\}/gi, '')
    .replace(/CITIOX_META:[\s\S]*/gi, '')
    .trim();
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  primaryColor = '#ff5500',
  onAddToCart,
}: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const discountAmount = item.originalPrice && item.originalPrice > item.price
    ? Number((item.originalPrice - item.price).toFixed(2))
    : 0;

  const discountPercentage = item.originalPrice && item.originalPrice > item.price
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
    : 0;

  const totalPrice = Number((item.price * quantity).toFixed(2));

  const rawCleanDesc = cleanDescriptionText(item.description);

  // Generar lista de productos incluidos en el combo a partir de la descripción si no se proveyó
  const displayIncludedItems = item.includedItems && item.includedItems.length > 0
    ? item.includedItems.map(s => cleanDescriptionText(s)).filter(Boolean)
    : (rawCleanDesc && (rawCleanDesc.includes('+') || rawCleanDesc.toLowerCase().startsWith('incluye:'))
        ? rawCleanDesc
            .replace(/^Incluye:\s*/i, '')
            .split('+')
            .map(s => cleanDescriptionText(s))
            .filter(Boolean)
        : null);

  const isDescOnlyIncludedItems = !!(
    displayIncludedItems &&
    displayIncludedItems.length > 0 &&
    (rawCleanDesc.toLowerCase().startsWith('incluye:') || rawCleanDesc.includes('+'))
  );

  const shouldShowDescription = rawCleanDesc && !isDescOnlyIncludedItems;

  const handleAdd = () => {
    onAddToCart(item, quantity, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none">
      {/* Contenedor Modal */}
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* HEADER CON IMAGEN A ANCHO COMPLETO */}
        <div className="relative w-full h-56 sm:h-64 bg-slate-100 overflow-hidden shrink-0">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-100">
              🍲
            </div>
          )}

          {/* Gradiente sutil superior */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Botón Cerrar (X) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-all cursor-pointer shadow-md"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Botón Favorito (Corazón) */}
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-3.5 left-3.5 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-all cursor-pointer shadow-md"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>

          {/* Badge de Oferta / Promoción Flotante en la Imagen */}
          {item.badge && (
            <div
              style={{ backgroundColor: primaryColor }}
              className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 border border-white/20"
            >
              <Flame className="w-3.5 h-3.5 text-white" />
              <span>{item.badge}</span>
            </div>
          )}
        </div>

        {/* CUERPO INFORMATIVO CON SCROLL */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Categoría y Título */}
          <div className="space-y-1">
            {item.category && (
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                {item.category}
              </span>
            )}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              {item.title}
            </h2>
          </div>

          {/* Desglose de Precio y Descuento */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span style={{ color: primaryColor }} className="text-xl sm:text-2xl font-black">
              ${item.price.toFixed(2)}
            </span>

            {item.originalPrice && item.originalPrice > item.price && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 line-through">
                  ${item.originalPrice.toFixed(2)}
                </span>
                <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-rose-200">
                  Ahorras ${discountAmount.toFixed(2)} ({discountPercentage}% OFF)
                </span>
              </div>
            )}
          </div>

          {/* Descripción Completa */}
          {shouldShowDescription && (
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Descripción
              </span>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {rawCleanDesc}
              </p>
            </div>
          )}

          {/* Componentes Incluidos en la Promoción / Combo */}
          {displayIncludedItems && displayIncludedItems.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Sparkles style={{ color: primaryColor }} className="w-3.5 h-3.5" />
                Incluye en esta Promoción
              </span>
              <div className="bg-orange-50/60 rounded-2xl p-3 border border-orange-100/80 space-y-1.5">
                {displayIncludedItems.map((inc, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <CheckCircle2 style={{ color: primaryColor }} className="w-4 h-4 shrink-0" />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campo de Notas Adicionales / Instrucciones */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Instrucciones Especiales (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Sin cebolla, aderezo aparte, bien cocido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
            />
          </div>
        </div>

        {/* BARRA INFERIOR DE ACCIÓN (CANTIDAD + BOTÓN AGREGAR) */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0 shadow-lg">
          {/* Selector de Cantidad [- N +] */}
          <div className="flex items-center bg-slate-100 rounded-2xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="w-8 h-8 bg-white text-slate-800 rounded-xl font-black text-sm flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-black text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(prev => prev + 1)}
              style={{ backgroundColor: primaryColor, color: '#ffffff' }}
              className="w-8 h-8 text-white rounded-xl font-black text-sm flex items-center justify-center shadow-2xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Botón Agregar al Pedido */}
          <button
            type="button"
            onClick={handleAdd}
            style={{ backgroundColor: primaryColor, color: '#ffffff' }}
            className="flex-1 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl flex items-center justify-between hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Agregar al Pedido</span>
            </div>
            <span className="text-sm font-black">${totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
