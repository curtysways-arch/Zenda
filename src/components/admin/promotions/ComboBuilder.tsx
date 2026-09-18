'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Utensils, Plus, Check, DollarSign, Sparkles, Store, Search, ArrowLeft, Image as ImageIcon } from 'lucide-react';

interface ComboBuilderProps {
  products: any[];
  categories: any[];
  onSaveCombo: (comboData: any) => void;
  onCancel?: () => void;
  initialData?: any;
  negocio?: any;
}

function extractInitialProductIds(initialData: any): string[] {
  if (!initialData) return [];
  const set = new Set<string>();

  // 1. productosRelacionados directo
  if (Array.isArray(initialData.productosRelacionados)) {
    initialData.productosRelacionados.forEach((id: any) => {
      if (typeof id === 'string' && id.trim()) set.add(id.trim());
      else if (id && typeof id.id === 'string') set.add(id.id.trim());
    });
  } else if (typeof initialData.productosRelacionados === 'string') {
    try {
      const parsed = JSON.parse(initialData.productosRelacionados);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: any) => {
          if (typeof id === 'string') set.add(id.trim());
          else if (id && id.id) set.add(id.id.trim());
        });
      }
    } catch (_) {
      initialData.productosRelacionados.split(',').forEach((s: string) => {
        const tr = s.trim();
        if (tr) set.add(tr);
      });
    }
  }

  // 2. Metadata dentro de descripcion (<!-- CITIOX_META: ... -->)
  if (typeof initialData.descripcion === 'string' && initialData.descripcion.includes('<!-- CITIOX_META:')) {
    try {
      const jsonStr = initialData.descripcion.split('<!-- CITIOX_META:')[1].split('-->')[0].trim();
      const meta = JSON.parse(jsonStr);
      if (Array.isArray(meta.productosRelacionados)) {
        meta.productosRelacionados.forEach((id: any) => {
          if (typeof id === 'string' && id.trim()) set.add(id.trim());
          else if (id && typeof id.id === 'string') set.add(id.id.trim());
        });
      }
      if (Array.isArray(meta.serviciosRelacionados)) {
        meta.serviciosRelacionados.forEach((id: any) => {
          if (typeof id === 'string' && id.trim()) set.add(id.trim());
        });
      }
      if (typeof meta.productoRequeridoId === 'string' && meta.productoRequeridoId.trim()) {
        set.add(meta.productoRequeridoId.trim());
      }
    } catch (_) {}
  }

  // 3. productoRequeridoId directo
  if (typeof initialData.productoRequeridoId === 'string' && initialData.productoRequeridoId.trim()) {
    set.add(initialData.productoRequeridoId.trim());
  }
  if (typeof initialData.servicioRequeridoId === 'string' && initialData.servicioRequeridoId.trim()) {
    set.add(initialData.servicioRequeridoId.trim());
  }

  return Array.from(set);
}

function cleanDescription(desc?: string): string {
  if (!desc) return '';
  if (desc.includes('<!-- CITIOX_META:')) {
    return desc.split('<!-- CITIOX_META:')[0].trim();
  }
  return desc.trim();
}

export default function ComboBuilder({
  products = [],
  categories = [],
  onSaveCombo,
  onCancel,
  initialData,
  negocio,
}: ComboBuilderProps) {
  const tipoUpper = (negocio?.tipoNegocio || '').toUpperCase();
  const blueprintId = (negocio?.configuracion as any)?.blueprintId;
  const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || blueprintId === 'RESTAURANT';
  const isBeautySpa = tipoUpper === 'SPA' || tipoUpper === 'CENTRO_ESTETICA' || tipoUpper === 'PELUQUERIA' || tipoUpper === 'BARBERIA';
  const isLaundry = tipoUpper === 'SHOE_CARE' || tipoUpper === 'LAVANDERIA';
  const isStore = tipoUpper === 'TIENDA' || tipoUpper === 'STORE' || blueprintId === 'STORE';

  const isEditing = Boolean(initialData && initialData.id);

  const defaultName = isRestaurant
    ? '🍔 Combo Dúo Especial'
    : isBeautySpa
    ? '✨ Paquete Spa Relax Total'
    : isLaundry
    ? '👟 Kit de Limpieza Profunda'
    : isStore
    ? '🎁 Pack Promocional (3 Prendas)'
    : '🎁 Paquete Promocional Especial';

  const defaultDesc = isRestaurant
    ? 'Plato Principal + Acompañante + Bebida a precio especial.'
    : isBeautySpa
    ? 'Servicio Principal + Servicio Complementario a tarifa preferencial.'
    : isLaundry
    ? 'Limpieza Principal + Servicio Extra a precio promocional.'
    : isStore
    ? 'Llévate este conjunto exclusivo de prendas combinadas a un precio especial.'
    : 'Combinación de servicios seleccionados con descuento preferencial.';

  const defaultChannels = isRestaurant
    ? ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING']
    : isBeautySpa
    ? ['POS', 'CITAS', 'DOMICILIO', 'LOCAL', 'LANDING']
    : isLaundry
    ? ['POS', 'SOLICITUDES', 'RETIRO', 'LOCAL', 'LANDING']
    : ['POS', 'ONLINE', 'DELIVERY', 'LOCAL', 'LANDING'];

  // Estados locales
  const [comboName, setComboName] = useState<string>(() => initialData?.titulo || defaultName);
  const [comboDescription, setComboDescription] = useState<string>(() => {
    const cleaned = cleanDescription(initialData?.descripcion);
    return cleaned || defaultDesc;
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => extractInitialProductIds(initialData));
  const [comboPrice, setComboPrice] = useState<number>(() => {
    if (initialData?.precioPromo !== undefined && initialData?.precioPromo !== null) {
      return Number(initialData.precioPromo) || 0;
    }
    return 10.99;
  });
  const [imagenUrl, setImagenUrl] = useState<string>(() => initialData?.imagenUrl || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Sincronizar estados cuando cambie initialData
  useEffect(() => {
    if (initialData) {
      setComboName(initialData.titulo || defaultName);
      const cleaned = cleanDescription(initialData.descripcion);
      setComboDescription(cleaned || defaultDesc);
      setSelectedProductIds(extractInitialProductIds(initialData));
      if (initialData.precioPromo !== undefined && initialData.precioPromo !== null) {
        setComboPrice(Number(initialData.precioPromo) || 0);
      }
      setImagenUrl(initialData.imagenUrl || '');
    } else {
      setComboName(defaultName);
      setComboDescription(defaultDesc);
      setSelectedProductIds([]);
      setComboPrice(10.99);
      setImagenUrl('');
    }
  }, [initialData]);

  // Lista de productos seleccionados
  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  const normalTotalPrice = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
  }, [selectedProducts]);

  const savings = Math.max(0, normalTotalPrice - comboPrice);
  const firstProductImage = selectedProducts.find(p => p.imagenUrl)?.imagenUrl || '';
  const finalComboImage = imagenUrl || firstProductImage;

  // Filtrado de catálogo
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchQuery.trim() || 
        p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.descripcion?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || 
        p.categoriaId === selectedCategory || 
        p.categoriaProductoId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const nextIds = prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id];
      const sel = products.filter(p => nextIds.includes(p.id));
      if (sel.length > 0 && (!comboDescription || comboDescription === defaultDesc || comboDescription.startsWith('Incluye:'))) {
        setComboDescription(`Incluye: ${sel.map(p => p.nombre).join(' + ')}`);
      }
      return nextIds;
    });
  };

  const handleSave = () => {
    if (selectedProductIds.length === 0) {
      alert('Por favor selecciona al menos 1 producto o servicio para armar el paquete.');
      return;
    }

    const finalDesc = comboDescription && comboDescription !== defaultDesc
      ? comboDescription 
      : (selectedProducts.length > 0 ? `Incluye: ${selectedProducts.map(p => p.nombre).join(' + ')}` : comboDescription);

    const payload: any = {
      titulo: comboName.trim(),
      descripcion: finalDesc.trim(),
      tipoPromo: 'COMBO',
      alcance: 'COMBO',
      precioPromo: comboPrice,
      precioAnterior: normalTotalPrice > 0 ? normalTotalPrice : undefined,
      imagenUrl: finalComboImage,
      productosRelacionados: selectedProductIds,
      canales: initialData?.canales || defaultChannels,
      estado: initialData?.estado || 'ACTIVA'
    };

    if (initialData?.id) {
      payload.id = initialData.id;
    }

    onSaveCombo(payload);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors mr-1 cursor-pointer"
                title="Volver"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <Utensils className="size-5 text-amber-500" />
            <h2 className="text-xl font-black text-slate-900 uppercase italic">
              {isEditing ? '✏️ Editar Combo / Pack de Productos' : '✨ Constructor Visual de Combos'}
            </h2>
            {isEditing && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded-lg">
                Editando ID: {initialData.id.slice(0, 10)}...
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs font-medium max-w-lg">
            Agrupa productos existentes (ej. Pantalón + Camiseta + Gorra) en un solo paquete promocional sin duplicar productos en el catálogo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-right">
            <span className="text-[10px] text-amber-800 font-extrabold uppercase block">Precio Combo Sugerido</span>
            <span className="text-xl font-black text-amber-600">${comboPrice.toFixed(2)}</span>
            {normalTotalPrice > 0 && (
              <span className="text-[10px] text-slate-400 line-through block font-bold">Antes: ${normalTotalPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna 1 & 2: Configuración & Selector de Productos */}
        <div className="md:col-span-2 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">Nombre del Combo / Pack</label>
              <input
                type="text"
                value={comboName}
                onChange={e => setComboName(e.target.value)}
                placeholder="Ej. Combo Urbano Táctico (3 Prendas)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">Descripción Promocional</label>
              <input
                type="text"
                value={comboDescription}
                onChange={e => setComboDescription(e.target.value)}
                placeholder="Ej. Llévate este conjunto exclusivo de prendas..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                URL de Imagen del Combo (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={imagenUrl}
                  onChange={e => setImagenUrl(e.target.value)}
                  placeholder="https://... (Si está vacía, usará la foto del primer producto seleccionado)"
                  className="w-full p-3 pl-9 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <ImageIcon className="size-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          {/* Filtros de Productos */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Selecciona los Productos Incluidos ({selectedProductIds.length} seleccionados)
              </label>
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                {selectedProductIds.length} artículo{selectedProductIds.length === 1 ? '' : 's'} en el combo
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="size-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="ALL">Todas las Categorías</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Grid de Productos con scroll */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs italic">
                  No se encontraron productos con ese filtro.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = selectedProductIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectProduct(p.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs gap-3 ${
                        isSelected 
                          ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {p.imagenUrl ? (
                          <img 
                            src={p.imagenUrl} 
                            alt={p.nombre} 
                            className="size-10 rounded-xl object-contain bg-white border border-slate-200 shrink-0" 
                          />
                        ) : (
                          <div className="size-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 font-bold shrink-0">
                            📦
                          </div>
                        )}
                        <div className="truncate">
                          <span className="font-extrabold text-slate-900 block truncate">{p.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">${(Number(p.precio) || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <span className={`size-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isSelected ? '✓' : '+'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Columna 3: Previsualización & Guardar */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="size-4" />
              <span className="text-xs font-black uppercase tracking-wider">Previsualización del Combo</span>
            </div>

            {/* Imagen del Combo */}
            {finalComboImage && (
              <div className="w-full h-32 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center">
                <img 
                  src={finalComboImage} 
                  alt={comboName} 
                  className="w-full h-full object-contain p-2" 
                />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white leading-tight">{comboName || 'Combo Nombre'}</h3>
              <p className="text-slate-300 text-xs leading-relaxed font-medium">{comboDescription}</p>
            </div>

            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-amber-300 block">
                  Artículos Incluidos ({selectedProducts.length}):
                </span>
                {normalTotalPrice > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Suma: ${normalTotalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {selectedProducts.length === 0 ? (
                <p className="text-slate-400 text-xs italic">Ningún producto seleccionado</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedProducts.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-slate-200 font-bold text-[11px] gap-2">
                      <span className="truncate">• {p.nombre}</span>
                      <span className="text-slate-400 font-mono shrink-0">${(Number(p.precio) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-xs text-slate-400 font-bold block">Precio Oferta Combo:</span>
              <input
                type="number"
                step="0.5"
                value={comboPrice}
                onChange={e => setComboPrice(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-black/40 border border-amber-500/50 rounded-xl text-right text-xl font-black text-amber-400 focus:outline-none"
              />
              {savings > 0 && (
                <span className="text-[10px] text-emerald-400 font-extrabold block">
                  🎉 ¡El cliente ahorra ${savings.toFixed(2)}!
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-3">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="size-4" />
              <span>{isEditing ? 'Guardar Cambios del Combo' : 'Guardar & Activar Combo'}</span>
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer text-center"
              >
                Volver a la Lista
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
