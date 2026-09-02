'use client';

/**
 * @file ProductVariantModal.tsx
 * @module components/public
 * @description Modal unificado de Detalle de Producto / Quick View para E-Commerce CITIOX.
 * @responsibility Presentar información completa del producto (simple o con variantes),
 *   selección intuitiva de atributos dinámicos (Color, Talla, Memoria, etc.),
 *   control estricto de cantidad según stock real, cálculo visual de subtotal y feedback de adición al carrito.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, ShoppingBag, Check, AlertCircle, PackageCheck, Tag, Info, Layers, ChevronRight, Sparkles } from 'lucide-react';
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

  // Filtrar variantes activas
  const activeVariants = useMemo(() => {
    return (product?.variantes || []).filter(v => v.activo);
  }, [product]);

  const hasVariants = Boolean(product?.tieneVariantes || activeVariants.length > 0);

  // Extraer mapa de atributos dinámicos (e.g. { Color: ["Negro", "Blanco"], Talla: ["S", "M", "L"] })
  const attributeKeys = useMemo(() => {
    if (!hasVariants || activeVariants.length === 0) return [];
    
    // 1. Intentar obtener desde la propiedad `atributos` de las variantes
    const keysSet = new Set<string>();
    activeVariants.forEach(v => {
      if (v.atributos && typeof v.atributos === 'object') {
        Object.keys(v.atributos).forEach(k => keysSet.add(k));
      }
    });

    if (keysSet.size > 0) {
      return Array.from(keysSet);
    }

    // 2. Si las variantes no tienen un objeto JSON `atributos`, inferir de `nombre` (ej: "Negro / M")
    const hasSlashes = activeVariants.some(v => v.nombre.includes('/'));
    if (hasSlashes) {
      const firstParts = activeVariants[0].nombre.split('/').map(p => p.trim());
      if (firstParts.length === 2) return ['Color', 'Talla'];
      if (firstParts.length === 3) return ['Color', 'Talla', 'Versión'];
      return firstParts.map((_, idx) => `Opción ${idx + 1}`);
    }

    return ['Opción'];
  }, [hasVariants, activeVariants]);

  // Mapa de valores disponibles por cada clave de atributo
  const attributeValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    attributeKeys.forEach(key => { map[key] = []; });

    activeVariants.forEach(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        Object.entries(v.atributos).forEach(([k, val]) => {
          const strVal = String(val).trim();
          if (map[k] && !map[k].includes(strVal)) {
            map[k].push(strVal);
          }
        });
      } else if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        attributeKeys.forEach((key, idx) => {
          if (parts[idx] && map[key] && !map[key].includes(parts[idx])) {
            map[key].push(parts[idx]);
          }
        });
      } else if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
        if (!map['Opción'].includes(v.nombre)) {
          map['Opción'].push(v.nombre);
        }
      }
    });

    return map;
  }, [attributeKeys, activeVariants]);

  // Inicializar variante preseleccionada al abrir modal
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setAddedToast(false);

      if (activeVariants.length > 0) {
        // Encontrar la primera variante activa con stock > 0
        const firstAvailable = activeVariants.find(v => v.stock > 0) || activeVariants[0];
        setSelectedVariantId(firstAvailable.id);

        // Establecer sus atributos
        if (firstAvailable.atributos && typeof firstAvailable.atributos === 'object' && Object.keys(firstAvailable.atributos).length > 0) {
          const initialAttr: Record<string, string> = {};
          Object.entries(firstAvailable.atributos).forEach(([k, v]) => {
            initialAttr[k] = String(v);
          });
          setSelectedAttributes(initialAttr);
        } else if (firstAvailable.nombre.includes('/')) {
          const parts = firstAvailable.nombre.split('/').map(p => p.trim());
          const initialAttr: Record<string, string> = {};
          attributeKeys.forEach((key, idx) => {
            if (parts[idx]) initialAttr[key] = parts[idx];
          });
          setSelectedAttributes(initialAttr);
        } else if (attributeKeys.length === 1) {
          setSelectedAttributes({ [attributeKeys[0]]: firstAvailable.nombre });
        }
      } else {
        setSelectedVariantId(null);
        setSelectedAttributes({});
      }
    }
  }, [isOpen, product, activeVariants, attributeKeys]);

  // Encontrar variante seleccionada a partir de los atributos elegidos
  const selectedVariant = useMemo(() => {
    if (!hasVariants || activeVariants.length === 0) return null;

    // Si ya tenemos selectedVariantId directo, verificar coincidencia
    if (selectedVariantId) {
      const byId = activeVariants.find(v => v.id === selectedVariantId);
      if (byId) return byId;
    }

    // Si tenemos atributos seleccionados
    return activeVariants.find(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        return Object.entries(selectedAttributes).every(([k, val]) => String(v.atributos?.[k]) === val);
      }
      if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        return attributeKeys.every((key, idx) => selectedAttributes[key] === parts[idx]);
      }
      if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
        return selectedAttributes['Opción'] === v.nombre;
      }
      return false;
    }) || null;
  }, [hasVariants, activeVariants, selectedVariantId, selectedAttributes, attributeKeys]);

  // Manejar cambio de opción de atributo
  const handleSelectAttribute = (attrKey: string, attrVal: string) => {
    const nextAttr = { ...selectedAttributes, [attrKey]: attrVal };
    setSelectedAttributes(nextAttr);

    // Buscar la variante que corresponda a estas opciones
    const match = activeVariants.find(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        return Object.entries(nextAttr).every(([k, val]) => String(v.atributos?.[k]) === val);
      }
      if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        return attributeKeys.every((key, idx) => nextAttr[key] === parts[idx]);
      }
      if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
        return nextAttr['Opción'] === v.nombre;
      }
      return false;
    });

    if (match) {
      setSelectedVariantId(match.id);
    } else {
      setSelectedVariantId(null);
    }
  };

  if (!isOpen || !product) return null;

  // Calculos de precio, stock e imágenes
  const effectivePrice = (selectedVariant && selectedVariant.precio !== null && selectedVariant.precio !== undefined && selectedVariant.precio > 0)
    ? selectedVariant.precio
    : product.precio;

  const effectivePreviousPrice = selectedVariant?.precioAnterior ?? null;
  
  const effectiveStock = selectedVariant 
    ? selectedVariant.stock 
    : (product.stock !== null && product.stock !== undefined ? product.stock : 999);

  const isOutOfStock = effectiveStock <= 0;
  const isVariantSelectionIncomplete = hasVariants && !selectedVariant;
  const currentSku = selectedVariant?.sku || product.sku || null;
  const subtotal = Math.round(effectivePrice * quantity * 100) / 100;

  const handleAddToCart = () => {
    if (isOutOfStock || isVariantSelectionIncomplete) return;

    const cartProduct: CartProduct = {
      id: product.id,
      nombre: product.nombre,
      precio: effectivePrice,
      imagenUrl: selectedVariant?.imagenUrl || product.imagenUrl,
      descripcion: product.descripcion,
      categoriaId: product.categoriaId,
      varianteId: selectedVariant ? selectedVariant.id : null,
      varianteNombre: selectedVariant ? selectedVariant.nombre : null,
      sku: currentSku,
      llevaEmpaque: false,
      precioEmpaque: 0,
    };

    addToCart(cartProduct, quantity);
    setAddedToast(true);

    setTimeout(() => {
      setAddedToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden h-full w-full animate-in slide-in-from-bottom duration-300 text-left">
      
      {/* ── 1. HEADER SUPERIOR FULL SCREEN CON BOTÓN VOLVER ── */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 rotate-180 text-slate-600" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
            <Tag className="w-3 h-3 text-cyan-600" />
            {hasVariants ? 'Producto con Opciones' : 'Detalle del Producto'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 2. CUERPO DE CONTENIDO SCROLLABLE ── */}
      <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          {/* Hero Image Container (Full Width Sin Márgenes) */}
          <div className="relative w-full h-72 sm:h-96 bg-slate-100 overflow-hidden flex items-center justify-center p-0 border-b border-slate-100 group">
            {selectedVariant?.imagenUrl || product.imagenUrl ? (
              <>
                {/* Fondo ambiental suave */}
                <img
                  src={selectedVariant?.imagenUrl || product.imagenUrl || ''}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20 scale-125 select-none pointer-events-none"
                />
                {/* Imagen principal borde a borde */}
                <img
                  src={selectedVariant?.imagenUrl || product.imagenUrl || ''}
                  alt={product.nombre}
                  className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </>
            ) : (
              <span className="text-6xl">🛍️</span>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest shadow-xl">
                  Agotado Temporalmente
                </span>
              </div>
            )}

            {/* Badges Flotantes en Foto */}
            {currentSku && (
              <span className="absolute bottom-3 left-3 z-20 px-3 py-1 bg-slate-950/80 text-white rounded-xl text-[10px] font-mono font-bold backdrop-blur-md">
                SKU: {currentSku}
              </span>
            )}
          </div>

          {/* Información del Producto & Selector de Variantes */}
          <div className="p-4 sm:p-8 space-y-6">
            
            {/* Título & Descripción */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
                {product.nombre}
              </h1>
              {product.descripcion && (
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {product.descripcion.replace(/<!--[\s\S]*?-->/g, '')}
                </p>
              )}
            </div>

            {/* Precio & Stock Banner */}
            <div className="p-4 bg-slate-50/90 rounded-3xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    ${(Number(effectivePrice) || 0).toFixed(2)}
                  </span>
                  {effectivePreviousPrice !== null && effectivePreviousPrice > effectivePrice && (
                    <span className="text-xs sm:text-sm font-bold text-slate-400 line-through">
                      ${(Number(effectivePreviousPrice) || 0).toFixed(2)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  Precio final (Impuestos incluidos)
                </span>
              </div>

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
                    <PackageCheck className="w-4 h-4 text-emerald-600" /> {effectiveStock} Disponibles
                  </span>
                )}
              </div>
            </div>

            {/* Atributos Dinámicos de Variantes */}
            {hasVariants && attributeKeys.length > 0 && (
              <div className="space-y-5 pt-2 border-t border-slate-100">
                {attributeKeys.map(attrKey => {
                  const availableValues = attributeValuesMap[attrKey] || [];
                  const currentSelectedVal = selectedAttributes[attrKey];

                  return (
                    <div key={attrKey} className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                          <span>{attrKey}</span>
                        </span>
                        {currentSelectedVal && (
                          <span className="font-extrabold text-cyan-600">
                            {currentSelectedVal}
                          </span>
                        )}
                      </div>

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
                                  ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-900/30 scale-[1.02]'
                                  : !valExists
                                  ? 'bg-slate-100 text-slate-300 border border-slate-200 line-through cursor-not-allowed opacity-50'
                                  : !valInStock
                                  ? 'bg-white text-slate-700 border border-rose-200 hover:border-rose-300'
                                  : 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                              }`}
                            >
                              <span>{val}</span>
                              {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                              {valExists && !valInStock && (
                                <span className="text-[9px] font-black text-rose-500 uppercase ml-1">
                                  (Agotado)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Resumen de Variante Elegida */}
                {selectedVariant ? (
                  <div className="p-3.5 bg-cyan-50/80 border border-cyan-200 rounded-2xl text-xs flex items-center justify-between text-cyan-950 font-bold shadow-2xs">
                    <span>Opción elegida: {selectedVariant.nombre}</span>
                    <span className="text-cyan-700 font-black">${(Number(effectivePrice) || 0).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Selecciona todas las opciones requeridas para continuar.</span>
                  </div>
                )}
              </div>
            )}

            {/* Selector de Cantidad */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Cantidad
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
                  className="w-9 h-9 rounded-xl bg-white text-slate-800 font-black flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 transition-colors shadow-xs cursor-pointer text-sm"
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
                  className="w-9 h-9 rounded-xl bg-white text-slate-800 font-black flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 transition-colors shadow-xs cursor-pointer text-sm"
                >
                  +
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── 3. BOTÓN STICKY INFERIOR PRINCIPAL (SIN NINGUNA BARRA DE NAVEGACIÓN DEBAJO) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-150 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={isOutOfStock || isVariantSelectionIncomplete}
            onClick={handleAddToCart}
            className="w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm text-white shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ backgroundColor: addedToast ? '#10b981' : primaryColor }}
          >
            {addedToast ? (
              <>
                <Check className="w-5 h-5 text-white" /> ¡AGREGADO AL CARRITO!
              </>
            ) : isOutOfStock ? (
              'PRODUCTO AGOTADO'
            ) : isVariantSelectionIncomplete ? (
              'SELECCIONA LAS OPCIONES REQUERIDAS'
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
