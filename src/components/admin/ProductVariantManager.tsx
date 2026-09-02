'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Sparkles, AlertCircle, Layers, Check, Loader2 } from 'lucide-react';

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
  const [genDimensions, setGenDimensions] = useState<Array<{ id: string; tipo: 'COLOR' | 'TALLA' | 'TAMANO' | 'PESO' | 'SABOR' | 'MATERIAL' | 'PERSONALIZADO'; name: string; valuesStr: string }>>([
    { id: '1', tipo: 'COLOR', name: 'Color', valuesStr: 'Negro, Blanco' },
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchVariants();
  }, [productId]);

  const handleSaveVariant = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!nombre.trim()) {
      alert('Ingresa el nombre de la variante');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        variantId: editingId || undefined,
        nombre: nombre.trim(),
        sku: sku.trim() || undefined,
        precio: parseFloat(precio.replace(',', '.')) || basePrice,
        stock: Math.max(0, parseInt(stock) || 0),
        atributos: {
          ...(color.trim() ? { color: color.trim() } : {}),
          ...(talla.trim() ? { talla: talla.trim() } : {})
        },
        activo: true
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/productos/${productId}/variantes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/admin/productos/${productId}/variantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setNombre('');
        setSku('');
        setColor('');
        setTalla('');
        setEditingId(null);
        fetchVariants();
        if (onVariantsChange) onVariantsChange();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar la variante');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
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
    const attr = v.atributos || {};
    setColor(attr.color || '');
    setTalla(attr.talla || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro deseas eliminar esta variante?')) return;
    try {
      const res = await fetch(`/api/admin/productos/${productId}/variantes?variantId=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchVariants();
        if (onVariantsChange) onVariantsChange();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al eliminar variante');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generador de Combinaciones Matrix (N Dimensiones)
  const handleGenerateMatrix = async () => {
    const validDims = genDimensions
      .map(d => ({
        name: d.name.trim(),
        values: d.valuesStr.split(',').map(v => v.trim()).filter(Boolean)
      }))
      .filter(d => d.name && d.values.length > 0);

    if (validDims.length === 0) {
      alert('Ingresa al menos una dimensión con nombre y valores válidos.');
      return;
    }

    try {
      setSaving(true);

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

      const generated = combinations.map(c => {
        const vName = c.parts.join(' / ');
        const skuSuffix = c.parts.map(p => p.replace(/\s+/g, '-').toUpperCase()).join('-');
        return {
          nombre: vName,
          sku: `${cleanBaseSku}-${skuSuffix}`,
          atributos: c.attrs,
          precio: targetPrice,
          stock: 10
        };
      });

      let errCount = 0;
      let lastErrMsg = '';

      for (const g of generated) {
        const res = await fetch(`/api/admin/productos/${productId}/variantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(g)
        });
        if (!res.ok) {
          errCount++;
          const errData = await res.json().catch(() => ({}));
          lastErrMsg = errData.error || 'Error al guardar variante';
        }
      }

      if (errCount > 0) {
        alert(`Se generaron las variantes con ${errCount} observaciones: ${lastErrMsg}`);
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
            <Layers className="w-5 h-5 text-cyan-600" />
            Matriz de Variantes — {productName}
          </h3>
          <p className="text-xs text-slate-500">Administra combinaciones de cualquier dimensión (Color, Talla, Memoria, RAM), SKU, precio y stock</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerator(!showGenerator)}
          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 self-start cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {showGenerator ? 'Cerrar Generador' : 'Generador Multidimensional'}
        </button>
      </div>

      {/* Modal Nuevo: Generador de Combinaciones Matrix Multidimensional */}
      {showGenerator && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl p-5 rounded-2xl bg-cyan-950 text-white space-y-4 shadow-2xl border border-cyan-800 text-left">
            <div className="flex items-center justify-between border-b border-cyan-800 pb-3">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" /> GENERADOR MULTIDIMENSIONAL DE VARIANTES
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGenDimensions(prev => [...prev, { id: String(Date.now()), tipo: 'PERSONALIZADO', name: '', valuesStr: '' }])}
                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  + Añadir Dimensión
                </button>
                <button type="button" onClick={() => setShowGenerator(false)} className="size-8 rounded-full bg-cyan-900/60 hover:bg-cyan-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
              {genDimensions.map((dim, index) => (
                <div key={dim.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center bg-cyan-900/40 p-3.5 rounded-xl border border-cyan-800/80">
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
              ))}
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
                onClick={handleGenerateMatrix}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Generar {genDimensions.reduce((acc, d) => acc * (d.valuesStr.split(',').filter(Boolean).length || 1), 1)} Combinaciones</span>
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
