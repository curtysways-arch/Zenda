'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Sparkles, AlertCircle, Layers, Check, Loader2, Palette, Scale, Ruler, Coffee, Scissors, Tag } from 'lucide-react';

interface Variant {
  id?: string;
  nombre: string;
  sku?: string | null;
  atributos?: any;
  precio: number;
  stock: number;
  activo: boolean;
}

interface Props {
  productId: string;
  productName: string;
  basePrice: number;
  baseSku?: string;
  onVariantsChange?: () => void;
}

const DEFAULT_COLOR_HEXES: Record<string, string> = {
  negro: '#000000',
  blanco: '#ffffff',
  rojo: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarillo: '#eab308',
  gris: '#6b7280',
  morado: '#a855f7',
  rosado: '#ec4899',
  rosa: '#ec4899',
  naranja: '#f97316',
  cafe: '#78350f',
  marrón: '#78350f',
  marron: '#78350f',
  dorado: '#eab308',
  plateado: '#9ca3af',
  beige: '#fef3c7',
  cyan: '#06b6d4',
  turquesa: '#14b8a6',
  violeta: '#8b5cf6',
};

const COLOR_PRESETS = [
  { name: 'Negro', hex: '#000000', label: '⬛ Negro' },
  { name: 'Blanco', hex: '#ffffff', label: '⬜ Blanco' },
  { name: 'Rojo', hex: '#ef4444', label: '🔴 Rojo' },
  { name: 'Azul', hex: '#3b82f6', label: '🔵 Azul' },
  { name: 'Verde', hex: '#22c55e', label: '🟢 Verde' },
  { name: 'Amarillo', hex: '#eab308', label: '🟡 Amarillo' },
  { name: 'Morado', hex: '#a855f7', label: '🟣 Morado' },
  { name: 'Rosado', hex: '#ec4899', label: '💖 Rosado' },
  { name: 'Naranja', hex: '#f97316', label: '🟠 Naranja' },
  { name: 'Café', hex: '#78350f', label: '🟤 Café' },
  { name: 'Dorado', hex: '#eab308', label: '🪙 Dorado' },
  { name: 'Gris', hex: '#6b7280', label: '⚪ Gris' },
];

function getDefaultHex(colorName: string): string {
  const clean = colorName.trim().toLowerCase();
  return DEFAULT_COLOR_HEXES[clean] || '#3b82f6';
}

interface GenDimension {
  id: string;
  tipo: 'COLOR' | 'TALLA' | 'TAMANO' | 'PESO' | 'SABOR' | 'MATERIAL' | 'PERSONALIZADO';
  name: string;
  valuesStr: string;
  hexMap?: Record<string, string>;
  imgMap?: Record<string, string>;
}

export default function ProductVariantManager({ productId, productName, basePrice, baseSku = 'SKU', onVariantsChange }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Formulario Manual
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState(basePrice.toString());
  const [stock, setStock] = useState('10');
  const [color, setColor] = useState('');
  const [talla, setTalla] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados Generator Matrix (N Dimensiones)
  const [showGenerator, setShowGenerator] = useState(false);
  const [genPrice, setGenPrice] = useState(basePrice.toString());
  const [genDimensions, setGenDimensions] = useState<GenDimension[]>([
    { id: '1', tipo: 'COLOR', name: 'Color', valuesStr: 'Negro, Blanco', hexMap: { Negro: '#000000', Blanco: '#ffffff' } },
    { id: '2', tipo: 'TALLA', name: 'Talla', valuesStr: 'S, M, L' }
  ]);

  useEffect(() => {
    setGenPrice(basePrice.toString());
  }, [basePrice]);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/productos/${productId}/variantes`);
      if (res.ok) {
        const data = await res.json();
        setVariants(data);
      }
    } catch (e) {
      console.error('Error fetching variants', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !precio) return;

    try {
      setSaving(true);
      const atributos: Record<string, string> = {};
      if (color.trim()) atributos.color = color.trim();
      if (talla.trim()) atributos.talla = talla.trim();

      const payload = {
        nombre: nombre.trim(),
        sku: sku.trim() || null,
        atributos: Object.keys(atributos).length > 0 ? atributos : undefined,
        precio: parseFloat(precio.replace(',', '.')) || 0,
        stock: parseInt(stock) || 0
      };

      let url = `/api/admin/productos/${productId}/variantes`;
      let method = 'POST';

      if (editingId) {
        url += `?id=${editingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        resetForm();
        fetchVariants();
        if (onVariantsChange) onVariantsChange();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar variante');
      }
    } catch (e) {
      console.error(e);
      alert('Error en la petición');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: Variant) => {
    setEditingId(v.id || null);
    setNombre(v.nombre);
    setSku(v.sku || '');
    setPrecio(v.precio.toString());
    setStock(v.stock.toString());
    setColor(v.atributos?.color || '');
    setTalla(v.atributos?.talla || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta variante?')) return;
    try {
      const res = await fetch(`/api/admin/productos/${productId}/variantes?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchVariants();
        if (onVariantsChange) onVariantsChange();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setSku('');
    setPrecio(basePrice.toString());
    setStock('10');
    setColor('');
    setTalla('');
  };

  const updateDimensionHex = (dimId: string, valName: string, newHex: string) => {
    setGenDimensions(prev => prev.map(d => {
      if (d.id !== dimId) return d;
      const currentMap = d.hexMap || {};
      return {
        ...d,
        hexMap: {
          ...currentMap,
          [valName]: newHex
        }
      };
    }));
  };

  const appendPresetValue = (dimId: string, valToAdd: string, presetHex?: string) => {
    setGenDimensions(prev => prev.map(d => {
      if (d.id !== dimId) return d;
      const currentVals = d.valuesStr.split(',').map(v => v.trim()).filter(Boolean);
      if (currentVals.includes(valToAdd)) return d;
      const updatedStr = [...currentVals, valToAdd].join(', ');
      const newHexMap = { ...(d.hexMap || {}) };
      if (presetHex) {
        newHexMap[valToAdd] = presetHex;
      }
      return {
        ...d,
        valuesStr: updatedStr,
        hexMap: newHexMap
      };
    }));
  };

  const setPresetValues = (dimId: string, valuesArray: string[]) => {
    setGenDimensions(prev => prev.map(d => {
      if (d.id !== dimId) return d;
      return {
        ...d,
        valuesStr: valuesArray.join(', ')
      };
    }));
  };

  const handleGenerateMatrix = async () => {
    const validDims = genDimensions
      .map(d => ({
        id: d.id,
        tipo: d.tipo || 'PERSONALIZADO',
        name: d.name.trim(),
        values: d.valuesStr.split(',').map(v => v.trim()).filter(Boolean),
        hexMap: d.hexMap
      }))
      .filter(d => d.name && d.values.length > 0);

    if (validDims.length === 0) {
      alert('Ingresa al menos una dimensión con nombre y valores válidos.');
      return;
    }

    try {
      setSaving(true);

      const dimensionesToSave = validDims.map(d => {
        const opcionesMap: Record<string, { val: string; hex?: string; imagenUrl?: string }> = {};
        d.values.forEach(v => {
          const h = d.hexMap?.[v] || (d.tipo === 'COLOR' ? getDefaultHex(v) : undefined);
          const img = d.imgMap?.[v];
          opcionesMap[v] = {
            val: v,
            ...(h ? { hex: h } : {}),
            ...(img ? { imagenUrl: img } : {})
          };
        });
        return {
          id: d.id,
          name: d.name,
          tipo: d.tipo,
          values: d.values,
          opcionesMap
        };
      });

      await fetch('/api/admin/productos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          nombre: productName,
          precio: basePrice,
          tieneVariantes: true,
          dimensiones: dimensionesToSave
        })
      }).catch(err => console.error('Error al guardar dimensiones en producto:', err));

      const combinations = validDims.reduce<Array<{ parts: string[]; attrs: Record<string, string> }>>((acc, dim) => {
        const key = dim.name.toLowerCase();
        if (acc.length === 0) {
          return dim.values.map(v => ({ parts: [v], attrs: { [key]: v } }));
        }
        const res: Array<{ parts: string[]; attrs: Record<string, string> }> = [];
        for (const prev of acc) {
          for (const v of dim.values) {
            res.push({ parts: [...prev.parts, v], attrs: { ...prev.attrs, [key]: v } });
          }
        }
        return res;
      }, []);

      const cleanBaseSku = (baseSku || 'SKU').toUpperCase().replace(/\s+/g, '-');
      const targetPrice = parseFloat(genPrice.replace(',', '.')) || basePrice;

      for (const c of combinations) {
        const vName = c.parts.join(' / ');
        const skuSuffix = c.parts.map(p => p.replace(/\s+/g, '-').toUpperCase()).join('-');
        await fetch(`/api/admin/productos/${productId}/variantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: vName,
            sku: `${cleanBaseSku}-${skuSuffix}`,
            atributos: c.attrs,
            precio: targetPrice,
            stock: 10
          })
        });
      }

      setShowGenerator(false);
      fetchVariants();
      if (onVariantsChange) onVariantsChange();
    } catch (e) {
      console.error(e);
      alert('Error en el generador de variantes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-600" /> Variantes del Producto
          </h3>
          <p className="text-xs text-slate-500 font-medium">Gestiona opciones de color, talla, peso o tamaño para {productName}.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerator(!showGenerator)}
          className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generador de Variantes</span>
        </button>
      </div>

      {showGenerator && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-950 border border-cyan-500/40 w-full max-w-4xl rounded-2xl p-5 text-white space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-cyan-800 pb-3">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" /> GENERADOR MULTIDIMENSIONAL DE VARIANTES
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowGenerator(false)} className="size-8 rounded-full bg-cyan-900/60 hover:bg-cyan-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar p-1">
              {genDimensions.map((dim, index) => {
                const parsedValues = dim.valuesStr.split(',').map(v => v.trim()).filter(Boolean);

                return (
                  <div key={dim.id} className="bg-cyan-950/60 p-4 rounded-2xl border border-cyan-800/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center">
                      <div className="sm:col-span-3">
                        <label className="block text-cyan-200 font-bold mb-1 text-[11px]">Tipo de Variante</label>
                        <select
                          value={dim.tipo || 'PERSONALIZADO'}
                          onChange={e => {
                            const newTipo = e.target.value as any;
                            const defaultNames: Record<string, string> = {
                              COLOR: 'Color',
                              TALLA: 'Talla',
                              TAMANO: 'Tamaño',
                              PESO: 'Peso',
                              SABOR: 'Sabor',
                              MATERIAL: 'Material',
                              PERSONALIZADO: dim.name || 'Personalizado'
                            };
                            setGenDimensions(prev => prev.map(d => d.id === dim.id ? {
                              ...d,
                              tipo: newTipo,
                              name: (!d.name || Object.values(defaultNames).includes(d.name)) ? (defaultNames[newTipo] || d.name) : d.name
                            } : d));
                          }}
                          className="w-full bg-slate-900 border border-cyan-700 rounded-xl px-2.5 py-2 text-cyan-300 font-bold text-xs focus:ring-2 focus:ring-cyan-400 outline-none cursor-pointer"
                        >
                          <option value="COLOR">🎨 Color</option>
                          <option value="TALLA">📏 Talla</option>
                          <option value="TAMANO">📐 Tamaño</option>
                          <option value="PESO">⚖️ Peso</option>
                          <option value="SABOR">😋 Sabor</option>
                          <option value="MATERIAL">🧵 Material</option>
                          <option value="PERSONALIZADO">⚙️ Personalizado</option>
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-cyan-200 font-bold mb-1 text-[11px]">Nombre Dimensión {index + 1}</label>
                        <input
                          type="text"
                          value={dim.name}
                          onChange={e => {
                            const val = e.target.value;
                            setGenDimensions(prev => prev.map(d => d.id === dim.id ? { ...d, name: val } : d));
                          }}
                          placeholder="Ej. Color, Talla, Memoria"
                          className="w-full bg-slate-900 border border-cyan-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-cyan-400 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-cyan-200 font-bold mb-1 text-[11px]">Valores (separados por coma)</label>
                        <input
                          type="text"
                          value={dim.valuesStr}
                          onChange={e => {
                            const val = e.target.value;
                            setGenDimensions(prev => prev.map(d => d.id === dim.id ? { ...d, valuesStr: val } : d));
                          }}
                          placeholder="Ej. Negro, Blanco, Azul"
                          className="w-full bg-slate-900 border border-cyan-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-cyan-400 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end pt-1 sm:pt-4">
                        {genDimensions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setGenDimensions(prev => prev.filter(d => d.id !== dim.id))}
                            className="p-1.5 rounded-lg text-cyan-300 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar dimensión"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {dim.tipo === 'COLOR' && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-cyan-800/60 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-cyan-400" /> Selección de Colores HEX
                          </span>
                          <span className="text-[10px] text-cyan-400/70">Haz clic en el círculo de color para elegir tono</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PRESETS.map(cp => (
                            <button
                              key={cp.name}
                              type="button"
                              onClick={() => appendPresetValue(dim.id, cp.name, cp.hex)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-cyan-800/70 hover:border-cyan-400 rounded-lg text-[10px] font-bold text-cyan-200 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span className="size-2.5 rounded-full border border-white/20" style={{ backgroundColor: cp.hex }} />
                              {cp.name}
                            </button>
                          ))}
                        </div>
                        {parsedValues.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 border-t border-cyan-900/60">
                            {parsedValues.map(valName => {
                              const currentHex = dim.hexMap?.[valName] || getDefaultHex(valName);
                              return (
                                <div key={valName} className="bg-slate-950/90 border border-cyan-700/60 rounded-xl p-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <label className="relative size-6 rounded-full border border-white/30 shadow-xs overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: currentHex }}>
                                      <input
                                        type="color"
                                        value={currentHex}
                                        onChange={e => updateDimensionHex(dim.id, valName, e.target.value)}
                                        className="opacity-0 absolute inset-0 size-full cursor-pointer"
                                      />
                                    </label>
                                    <div className="overflow-hidden">
                                      <span className="text-white font-black text-xs block truncate">{valName}</span>
                                      <span className="text-[9px] text-cyan-400 font-mono uppercase block leading-none">{currentHex}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {dim.tipo === 'PESO' && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-cyan-800/60 space-y-2">
                        <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-cyan-400" /> Presets de Peso
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setPresetValues(dim.id, ['250g', '500g', '1kg'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">⚖️ 250g, 500g, 1kg</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['1kg', '2kg', '5kg', '10kg'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">⚖️ 1kg, 2kg, 5kg, 10kg</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['0.5 lb', '1 lb', '2 lb', '5 lb'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">⚖️ 0.5 lb, 1 lb, 2 lb, 5 lb</button>
                        </div>
                      </div>
                    )}

                    {dim.tipo === 'TALLA' && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-cyan-800/60 space-y-2">
                        <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5 text-cyan-400" /> Presets de Talla
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setPresetValues(dim.id, ['S', 'M', 'L', 'XL', 'XXL'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">👕 Ropa: S, M, L, XL, XXL</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['28', '30', '32', '34', '36'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">👖 Pantalón: 28, 30, 32, 34, 36</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['38', '39', '40', '41', '42', '43'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">👟 Calzado: 38, 39, 40, 41, 42, 43</button>
                        </div>
                      </div>
                    )}

                    {dim.tipo === 'TAMANO' && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-cyan-800/60 space-y-2">
                        <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-cyan-400" /> Presets de Tamaño
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setPresetValues(dim.id, ['Pequeño', 'Mediano', 'Grande'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">📏 Pequeño, Mediano, Grande</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['10x10 cm', '20x20 cm', '30x30 cm'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">📐 10x10 cm, 20x20 cm, 30x30 cm</button>
                        </div>
                      </div>
                    )}

                    {dim.tipo === 'SABOR' && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-cyan-800/60 space-y-2">
                        <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                          <Coffee className="w-3.5 h-3.5 text-cyan-400" /> Presets de Sabor
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setPresetValues(dim.id, ['Vainilla', 'Chocolate', 'Fresa'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">🍦 Vainilla, Chocolate, Fresa</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['Cookies & Cream', 'Dulce de Leche', 'Frutos Rojos'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">🧁 Cookies & Cream, Dulce de Leche, Frutos Rojos</button>
                        </div>
                      </div>
                    )}

                    {dim.tipo === 'MATERIAL' && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-cyan-800/60 space-y-2">
                        <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-cyan-400" /> Presets de Material
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setPresetValues(dim.id, ['Algodón', 'Poliéster', 'Lino'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">🧵 Algodón, Poliéster, Lino</button>
                          <button type="button" onClick={() => setPresetValues(dim.id, ['Acero Inoxidable', 'Plata 925', 'Oro 18K', 'Cuero'])} className="px-2.5 py-1 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700 rounded-lg text-[10px] font-bold text-cyan-200 transition-all cursor-pointer">💍 Acero, Plata 925, Oro 18K, Cuero</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-cyan-800">
              <div className="flex items-center gap-2">
                <label className="text-cyan-200 font-extrabold text-xs uppercase tracking-wider">Precio Inicial ($):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={genPrice}
                  onChange={e => setGenPrice(e.target.value)}
                  className="w-28 bg-slate-900 border border-cyan-700 rounded-xl px-3 py-1.5 text-white font-bold text-xs focus:ring-2 focus:ring-cyan-400 outline-none"
                />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleGenerateCombinations}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generar Variantes ({totalCombinations})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario Manual de Variante */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {editingId ? 'Editar Variante' : 'Agregar Variante Manual'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Nombre (ej. Negro / M)</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Negro / M"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">SKU Variante</label>
            <input
              type="text"
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="TSH-BLK-M"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Precio ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Stock Actual</label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={e => setStock(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 font-bold"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => handleSaveVariant()}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Guardar' : 'Agregar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNombre('');
                  setSku('');
                }}
                className="p-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Matriz de Variantes */}
      {loading ? (
        <div className="text-center py-6 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1 text-cyan-600" />
          <span className="text-xs">Cargando variantes...</span>
        </div>
      ) : variants.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold text-slate-600">Este producto aún no tiene variantes registradas.</p>
          <p className="text-[11px] text-slate-400">Agrega variantes manualmente o usa el Generador Automático arriba.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider">
                <th className="p-3">Variante</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-900">
                    {v.nombre}
                    {v.atributos && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        {Object.entries(v.atributos).map(([k, val]) => `${k}: ${val}`).join(' | ')}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono font-medium text-slate-600">{v.sku || 'Sin SKU'}</td>
                  <td className="p-3 text-right font-black text-slate-900">${v.precio.toFixed(2)}</td>
                  <td className="p-3 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded-full ${v.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-800'}`}>
                      {v.stock}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {v.stock === 0 ? (
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] uppercase border border-rose-200">
                        AGOTADO
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] uppercase border border-emerald-200">
                        ACTIVO
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(v)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-600 hover:bg-slate-100"
                        title="Editar variante"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => v.id && handleDelete(v.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Eliminar variante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
