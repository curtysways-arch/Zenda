'use client';

/**
 * @file ProductVariantModal.tsx
 * @module components/public
 * @description Modal unificado de Detalle de Producto / Quick View para E-Commerce CITIOX.
 *   Copia exact del diseño premium de la tienda (Galería lateral de miniaturas, insignias de envío/devolución,
 *   guía de tallas, opciones con círculos de color, resumen de opción seleccionada y botón flotante con favorito).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, ShoppingBag, Check, AlertCircle, PackageCheck, Tag, 
  ChevronRight, Heart, Share2, Search, ShieldCheck, Truck, RotateCcw, 
  Star, Ruler, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useCart, CartProduct } from '@/core/context/CartContext';

export interface Variant {
  id: string;
  productoId: string;
  sku?: string | null;
  nombre: string;
  atributos?: Record<string, any> | null;
  precio?: number | null;
  precioAnterior?: number | null;
  stock: number;
  imagenUrl?: string | null;
  activo: boolean;
}

export interface DetailedProduct extends CartProduct {
  tieneVariantes?: boolean;
  variantes?: Variant[];
  stock?: number | null;
  activo?: boolean;
  sku?: string | null;
  precioAnterior?: number | null;
  extraInfo?: any;
}

interface ProductVariantModalProps {
  product: DetailedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export default function ProductVariantModal({
  product,
  isOpen,
  onClose,
  primaryColor = '#06b6d4',
}: ProductVariantModalProps) {
  const { addToCart } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToast, setAddedToast] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showOptionsAccordion, setShowOptionsAccordion] = useState<boolean>(true);

  // Filtrar variantes activas
  const activeVariants = useMemo(() => {
    return (product?.variantes || []).filter(v => v.activo);
  }, [product]);

  // Lista unificada de imágenes del producto (galería)
  const productImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];

    // 1. Galería de extraInfo.imagenes subida desde el admin
    if (product.extraInfo && typeof product.extraInfo === 'object' && Array.isArray(product.extraInfo.imagenes)) {
      list.push(...product.extraInfo.imagenes.filter(Boolean));
    }

    // 2. Imagen principal si no está repetida
    if (product.imagenUrl && !list.includes(product.imagenUrl)) {
      list.unshift(product.imagenUrl);
    }

    // 3. Imágenes de las variantes
    if (product.variantes) {
      product.variantes.forEach(v => {
        if (v.imagenUrl && !list.includes(v.imagenUrl)) {
          list.push(v.imagenUrl);
        }
      });
    }

    return list.length > 0 ? list : [];
  }, [product]);

  // Manejar el mapa de llaves y valores de atributos dinámicos
  const { attributeKeys, attributeValuesMap } = useMemo(() => {
    if (!product?.tieneVariantes || activeVariants.length === 0) {
      return { attributeKeys: [], attributeValuesMap: {} };
    }

    const map: Record<string, Set<string>> = {};

    activeVariants.forEach(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        Object.entries(v.atributos).forEach(([key, val]) => {
          if (val) {
            if (!map[key]) map[key] = new Set();
            map[key].add(String(val));
          }
        });
      } else if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        const defaultKeys = ['Color', 'Talla', 'Versión'];
        parts.forEach((part, idx) => {
          const keyName = defaultKeys[idx] || `Opción ${idx + 1}`;
          if (!map[keyName]) map[keyName] = new Set();
          map[keyName].add(part);
        });
      } else {
        const keyName = 'Opción';
        if (!map[keyName]) map[keyName] = new Set();
        map[keyName].add(v.nombre);
      }
    });

    const resultKeys = Object.keys(map);
    const resultMap: Record<string, string[]> = {};
    resultKeys.forEach(k => {
      resultMap[k] = Array.from(map[k]);
    });

    return { attributeKeys: resultKeys, attributeValuesMap: resultMap };
  }, [product, activeVariants]);

  // Autoseleccionar la primera variante / atributos al abrir
  useEffect(() => {
    if (!product || !isOpen) return;

    setQuantity(1);
    setAddedToast(false);
    setSelectedImageIndex(0);

    if (product.tieneVariantes && activeVariants.length > 0) {
      const firstAvailable = activeVariants.find(v => v.stock > 0) || activeVariants[0];

      if (firstAvailable) {
        setSelectedVariantId(firstAvailable.id);

        if (firstAvailable.atributos && typeof firstAvailable.atributos === 'object' && Object.keys(firstAvailable.atributos).length > 0) {
          const initialAttr: Record<string, string> = {};
          Object.entries(firstAvailable.atributos).forEach(([k, v]) => {
            initialAttr[k] = String(v);
          });
          setSelectedAttributes(initialAttr);
        } else if (firstAvailable.nombre.includes('/')) {
          const parts = firstAvailable.nombre.split('/').map(p => p.trim());
          const initialAttr: Record<string, string> = {};
          attributeKeys.forEach((keyName, idx) => {
            if (parts[idx]) initialAttr[keyName] = parts[idx];
          });
          setSelectedAttributes(initialAttr);
        } else if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
          setSelectedAttributes({ Opción: firstAvailable.nombre });
        }
      }
    } else {
      setSelectedVariantId(null);
      setSelectedAttributes({});
    }
  }, [product, isOpen, activeVariants, attributeKeys]);

  // Buscar la variante que coincide exactamente con los atributos seleccionados
  const selectedVariant = useMemo(() => {
    if (!product?.tieneVariantes || activeVariants.length === 0) return null;
    if (Object.keys(selectedAttributes).length < attributeKeys.length) return null;

    return activeVariants.find(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        return Object.entries(selectedAttributes).every(([k, val]) => String(v.atributos?.[k]) === val);
      }
      if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        return attributeKeys.every((k, idx) => selectedAttributes[k] === parts[idx]);
      }
      if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
        return selectedAttributes['Opción'] === v.nombre;
      }
      return false;
    }) || null;
  }, [product, activeVariants, selectedAttributes, attributeKeys]);

  // Actualizar imagen al cambiar variante
  useEffect(() => {
    if (selectedVariant?.imagenUrl) {
      const idx = productImages.indexOf(selectedVariant.imagenUrl);
      if (idx !== -1) setSelectedImageIndex(idx);
    }
  }, [selectedVariant, productImages]);

  if (!isOpen || !product) return null;

  const hasVariants = Boolean(product.tieneVariantes && activeVariants.length > 0);
  const isVariantSelectionIncomplete = hasVariants && !selectedVariant;

  const effectivePrice = selectedVariant
    ? (selectedVariant.precio ?? product.precio)
    : product.precio;

  const effectivePreviousPrice = selectedVariant
    ? (selectedVariant.precioAnterior ?? product.precioAnterior ?? null)
    : (product.precioAnterior ?? null);

  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : (product.stock !== null && product.stock !== undefined ? product.stock : 99);

  const isOutOfStock = effectiveStock <= 0;
  const currentSku = selectedVariant?.sku || product.sku;

  const handleSelectAttribute = (key: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [key]: value }));
  };

  const subtotal = (Number(effectivePrice) || 0) * quantity;

  const handleAddToCart = () => {
    if (isOutOfStock || isVariantSelectionIncomplete) return;

    const cartProduct: CartProduct = {
      ...product,
      precio: effectivePrice,
      imagenUrl: productImages[selectedImageIndex] || selectedVariant?.imagenUrl || product.imagenUrl,
      varianteId: selectedVariant ? selectedVariant.id : (selectedVariantId || null),
      varianteNombre: selectedVariant ? selectedVariant.nombre : null,
      sku: currentSku || product.sku,
    };

    addToCart(cartProduct, quantity);

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onClose();
    }, 1200);
  };

  // Ayudante de color dot
  const getColorDot = (colorName: string) => {
    const lower = colorName.toLowerCase();
    if (lower.includes('negro') || lower.includes('black')) return 'bg-slate-950';
    if (lower.includes('verde') || lower.includes('green')) return 'bg-emerald-700';
    if (lower.includes('azul') || lower.includes('blue')) return 'bg-blue-700';
    if (lower.includes('rojo') || lower.includes('red')) return 'bg-rose-600';
    if (lower.includes('blanco') || lower.includes('white')) return 'bg-white border border-slate-300';
    if (lower.includes('amarillo') || lower.includes('yellow')) return 'bg-amber-400';
    if (lower.includes('gris') || lower.includes('grey')) return 'bg-slate-400';
    return 'bg-cyan-500';
  };

  const currentDisplayImage = productImages[selectedImageIndex] || selectedVariant?.imagenUrl || product.imagenUrl;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden h-full w-full animate-in slide-in-from-bottom duration-300 text-left">
      
      {/* ── 1. HEADER SUPERIOR EXACTO AL MOCKUP DE LA IMAGEN ── */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-150 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 shrink-0 shadow-2xs">
        {/* Botón Volver Redondeado */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-black shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 rotate-180 text-slate-600" />
          <span>Volver</span>
        </button>

        {/* Insignia central cyan "PRODUCTO CON OPCIONES" */}
        <div className="flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-full bg-cyan-50 border border-cyan-150 text-cyan-600 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
            <Tag className="w-3.5 h-3.5 text-cyan-600" />
            {hasVariants ? 'PRODUCTO CON OPCIONES' : 'DETALLE DEL PRODUCTO'}
          </span>
        </div>

        {/* Botones Derecha: Favorito, Compartir & Cerrar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite ? 'text-rose-500 bg-rose-50 border-rose-200' : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="Favorito"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.nombre, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Compartir"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. CUERPO DE CONTENIDO SCROLLABLE ── */}
      <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
          
          {/* ── HERO IMAGE CONTAINER CON GALERÍA DE MINIATURAS VERTICAL EN LA ESQUINA SUPERIOR IZQUIERDA ── */}
          <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs group flex items-center justify-center p-0">
            {currentDisplayImage ? (
              <>
                {/* Fondo ambiental de desenfoque */}
                <img
                  src={currentDisplayImage}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20 scale-125 select-none pointer-events-none"
                />
                {/* Imagen principal */}
                <img
                  src={currentDisplayImage}
                  alt={product.nombre}
                  className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </>
            ) : (
              <span className="text-6xl">🛍️</span>
            )}

            {/* GALERÍA LATERAL IZQUIERDA DE MINIATURAS SOBREPUESTAS EN LA FOTO */}
            {productImages.length > 1 && (
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                {productImages.slice(0, 3).map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`size-13 rounded-xl overflow-hidden border-2 bg-white shadow-md transition-all cursor-pointer relative ${
                      selectedImageIndex === idx
                        ? 'ring-2 ring-cyan-500 border-white scale-105 shadow-lg'
                        : 'border-white/80 opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}

                {/* 4ta miniatura con badge overlay */}
                {productImages.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex(3)}
                    className="size-13 rounded-xl overflow-hidden border-2 border-white bg-slate-900 shadow-md transition-all cursor-pointer relative group/more"
                  >
                    <img src={productImages[3]} alt="More" className="w-full h-full object-cover opacity-40 group-hover/more:opacity-30" />
                    <div className="absolute inset-0 flex items-center justify-center text-white font-black text-xs shadow-md">
                      +{productImages.length - 3}
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Insignia SKU abajo a la izquierda */}
            {currentSku && (
              <span className="absolute bottom-4 left-4 z-20 px-3.5 py-1.5 bg-slate-950/80 text-white rounded-xl text-[10px] font-mono font-bold backdrop-blur-md shadow-md">
                SKU: {currentSku}
              </span>
            )}

            {/* Botón Zoom Lupa abajo a la derecha */}
            <button
              type="button"
              onClick={() => {
                if (currentDisplayImage) window.open(currentDisplayImage, '_blank');
              }}
              className="absolute bottom-4 right-4 z-20 size-10 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Ampliar imagen"
            >
              <Search className="w-4.5 h-4.5 text-slate-700" />
            </button>

            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-30">
                <span className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest shadow-xl">
                  Agotado Temporalmente
                </span>
              </div>
            )}
          </div>

          {/* ── TÍTULO Y RATING DEL PRODUCTO ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug tracking-tight">
                {product.nombre}
              </h1>
              {product.descripcion && (
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  {product.descripcion.replace(/<!--[\s\S]*?-->/g, '')}
                </p>
              )}
            </div>

            {/* Rating Estrellas */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-slate-900 shrink-0 shadow-2xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-black text-xs">4.8</span>
              <span className="text-slate-400 text-[11px] font-bold">(124)</span>
            </div>
          </div>

          {/* ── CARD DE PRECIO, DISPONIBILIDAD Y GARANTÍAS ── */}
          <div className="p-4 sm:p-5 bg-slate-50/90 rounded-3xl border border-slate-200/80 space-y-4 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-cyan-600">
                    ${(Number(effectivePrice) || 0).toFixed(2)}
                  </span>
                  {effectivePreviousPrice !== null && effectivePreviousPrice > effectivePrice && (
                    <span className="text-sm font-bold text-slate-400 line-through">
                      ${(Number(effectivePreviousPrice) || 0).toFixed(2)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                  Precio final (impuestos incluidos)
                </span>
              </div>

              {/* Stock Status Pill */}
              <div>
                {isOutOfStock ? (
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200 block">
                    Agotado
                  </span>
                ) : effectiveStock <= 3 ? (
                  <span className="text-xs font-black text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 block">
                    ¡Últimas {effectiveStock} uds!
                  </span>
                ) : (
                  <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" /> {effectiveStock} Disp.
                  </span>
                )}
              </div>
            </div>

            {/* Badges de Garantía y Envío */}
            <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Compra 100% segura</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Truck className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Envío en 24 – 48h</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Devolución gratuita</span>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN DESPLEGABLE DE OPCIONES ── */}
          {hasVariants && attributeKeys.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOptionsAccordion(!showOptionsAccordion)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider cursor-pointer"
              >
                <span>OPCIONES</span>
                {showOptionsAccordion ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showOptionsAccordion && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {attributeKeys.map(attrKey => {
                    const availableValues = attributeValuesMap[attrKey] || [];
                    const currentSelectedVal = selectedAttributes[attrKey];
                    const isColorAttr = attrKey.toLowerCase().includes('color');
                    const isSizeAttr = attrKey.toLowerCase().includes('talla') || attrKey.toLowerCase().includes('size');

                    return (
                      <div key={attrKey} className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            {isColorAttr ? '🎨' : isSizeAttr ? '📐' : '🏷️'}
                            <span>{attrKey}</span>
                            {currentSelectedVal && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                          </span>

                          {isSizeAttr ? (
                            <button
                              type="button"
                              onClick={() => setShowSizeGuide(!showSizeGuide)}
                              className="text-cyan-600 font-extrabold flex items-center gap-1 hover:underline cursor-pointer text-xs"
                            >
                              <Ruler className="w-3.5 h-3.5" /> Guía de tallas
                            </button>
                          ) : currentSelectedVal ? (
                            <span className="font-black text-cyan-600">{currentSelectedVal}</span>
                          ) : null}
                        </div>

                        {/* Pills de Selección */}
                        <div className="flex flex-wrap gap-2.5">
                          {availableValues.map(val => {
                            const isSelected = currentSelectedVal === val;

                            const tempAttr = { ...selectedAttributes, [attrKey]: val };
                            const matchingVariant = activeVariants.find(v => {
                              if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
                                return Object.entries(tempAttr).every(([k, vVal]) => String(v.atributos?.[k]) === vVal);
                              }
                              if (v.nombre.includes('/')) {
                                const parts = v.nombre.split('/').map(p => p.trim());
                                return attributeKeys.every((k, idx) => tempAttr[k] === parts[idx]);
                              }
                              if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
                                return tempAttr['Opción'] === v.nombre;
                              }
                              return false;
                            });

                            const valExists = !!matchingVariant;
                            const valInStock = matchingVariant && matchingVariant.stock > 0;

                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={!valExists}
                                onClick={() => handleSelectAttribute(attrKey, val)}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all relative flex items-center gap-2 cursor-pointer ${
                                  isSelected
                                    ? isSizeAttr
                                      ? 'bg-cyan-500 text-white shadow-md ring-2 ring-cyan-500/30'
                                      : 'bg-cyan-50/80 text-slate-900 border-2 border-cyan-400 shadow-2xs'
                                    : !valExists
                                    ? 'bg-slate-100 text-slate-300 border border-slate-200 line-through cursor-not-allowed opacity-50'
                                    : !valInStock
                                    ? 'bg-white text-slate-700 border border-rose-200 hover:border-rose-300'
                                    : 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                                }`}
                              >
                                {isColorAttr && (
                                  <span className={`size-3.5 rounded-full ${getColorDot(val)}`} />
                                )}
                                <span>{val}</span>
                                {isSelected && <Check className={`w-3.5 h-3.5 ${isSizeAttr ? 'text-white' : 'text-cyan-600'}`} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumen de Opción Elegida */}
                  {selectedVariant ? (
                    <div className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl text-xs flex items-center justify-between text-slate-900 font-bold shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img
                            src={selectedVariant.imagenUrl || currentDisplayImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black block">Opción elegida:</span>
                          <span className="text-slate-900 font-black text-sm">{selectedVariant.nombre}</span>
                        </div>
                      </div>
                      <span className="text-cyan-600 font-black text-base">${(Number(effectivePrice) || 0).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2 shadow-2xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Selecciona todas las opciones requeridas para continuar.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SELECTOR DE CANTIDAD ── */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦 CANTIDAD</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Máximo {effectiveStock} unidades por pedido
              </span>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || isOutOfStock || isVariantSelectionIncomplete}
                className="w-9 h-9 rounded-xl bg-white text-slate-800 font-black flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer text-sm"
              >
                -
              </button>
              <span className="w-8 text-center font-black text-base text-slate-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                disabled={quantity >= effectiveStock || isOutOfStock || isVariantSelectionIncomplete}
                className="w-9 h-9 rounded-xl bg-white text-slate-800 font-black flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer text-sm"
              >
                +
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. BOTÓN STICKY FLOTANTE INFERIOR CON FAVORITO ── */}
      <div className="fixed bottom-0 left-0 right-0 z-[100000] bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Botón Corazón Favoritos */}
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`size-13 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              isFavorite ? 'text-rose-500 bg-rose-50 border-rose-200' : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="Añadir a favoritos"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Botón Principal Cyan */}
          <button
            type="button"
            disabled={isOutOfStock || isVariantSelectionIncomplete}
            onClick={handleAddToCart}
            className="w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm text-white shadow-xl shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-1"
            style={{ backgroundColor: addedToast ? '#10b981' : (primaryColor || '#06b6d4') }}
          >
            {addedToast ? (
              <>
                <Check className="w-5 h-5 text-white" /> ¡AGREGADO AL CARRITO!
              </>
            ) : isOutOfStock ? (
              'PRODUCTO AGOTADO'
            ) : isVariantSelectionIncomplete ? (
              'SELECCIONA LAS OPCIONES'
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" /> AGREGAR AL CARRITO — ${subtotal.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
