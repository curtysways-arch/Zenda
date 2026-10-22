'use client';

import React, { useState, useEffect } from 'react';
import { ScrollText, Plus, Loader2, Sparkles, Clock, Calculator, ChefHat } from 'lucide-react';

export default function AdminRecetasPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState('10');
  const [yieldUnit, setYieldUnit] = useState('UNIDAD');
  const [prepTimeMin, setPrepTimeMin] = useState('30');
  const [extraCost, setExtraCost] = useState('1.50');

  const [ingredients, setIngredients] = useState<Array<{ ingredientId: string; quantity: number; unit: string }>>([
    { ingredientId: '', quantity: 1, unit: 'KG' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resR, resP] = await Promise.all([
        fetch('/api/admin/recetas'),
        fetch('/api/admin/productos')
      ]);

      if (resR.ok) {
        const d = await resR.json();
        setRecipes(d.recipes || []);
      }
      if (resP.ok) {
        const d = await resP.json();
        setProducts(d.productos || d.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { ingredientId: '', quantity: 1, unit: 'KG' }]);
  };

  const handleRemoveIngredient = (idx: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== idx));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !name.trim()) {
      alert('Completa los campos obligatorios');
      return;
    }

    const validIngs = ingredients.filter(i => i.ingredientId && i.quantity > 0);
    if (validIngs.length === 0) {
      alert('Agrega al menos un ingrediente válido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          name,
          yieldQuantity: parseFloat(yieldQuantity) || 1,
          yieldUnit,
          prepTimeMin: parseInt(prepTimeMin) || 0,
          extraCost: parseFloat(extraCost) || 0,
          ingredients: validIngs
        })
      });

      if (res.ok) {
        setShowModal(false);
        setProductId('');
        setName('');
        setIngredients([{ ingredientId: '', quantity: 1, unit: 'KG' }]);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar receta');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-emerald-400" /> Recetario & Fórmulas de Producción
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Composición de productos elaborados, porciones, insumos requeridos y costos de preparación.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Nueva Receta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {recipes.map(r => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{r.name}</h3>
                    <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                      Para: {r.producto?.nombre}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-400">
                    v{r.version}
                  </span>
                </div>

                <div className="mt-3 flex gap-3 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <span className="flex items-center gap-1">
                    <ChefHat className="h-3.5 w-3.5 text-slate-500" /> Rendimiento: <strong>{r.yieldQuantity} {r.yieldUnit}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500" /> {r.prepTimeMin} min
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">Ingredientes ({r.items?.length || 0}):</h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {r.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-xs py-1 px-2 rounded-lg bg-slate-800/40">
                        <span className="text-slate-300">{it.ingredient?.nombre}</span>
                        <span className="font-bold text-white">{it.quantity} {it.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Costos adicionales:</span>
                <span className="font-bold text-white">${r.extraCost?.toFixed(2)}</span>
              </div>
            </div>
          ))}

          {recipes.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500">
              No tienes recetas registradas aún. Haz clic en "Nueva Receta" para crear la primera.
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVA RECETA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Receta de Elaboración</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre de la Receta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Masa para Croissants Tradicionales"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Producto Terminado *</label>
                  <select
                    required
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  >
                    <option value="">Selecciona producto que produce...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Rendimiento *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={yieldQuantity}
                    onChange={e => setYieldQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unidad</label>
                  <select
                    value={yieldUnit}
                    onChange={e => setYieldUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="PORCION">Porción</option>
                    <option value="KG">KG</option>
                    <option value="BANDEJA">Bandeja</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tiempo (min)</label>
                  <input
                    type="number"
                    value={prepTimeMin}
                    onChange={e => setPrepTimeMin(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Costos Extra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extraCost}
                    onChange={e => setExtraCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Ingredientes */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Ingredientes & Materias Primas</label>
                <div className="space-y-2">
                  {ingredients.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        required
                        value={it.ingredientId}
                        onChange={e => {
                          const updated = [...ingredients];
                          updated[idx].ingredientId = e.target.value;
                          setIngredients(updated);
                        }}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      >
                        <option value="">Seleccionar ingrediente...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Cant"
                        step="0.001"
                        min="0.001"
                        value={it.quantity}
                        onChange={e => {
                          const updated = [...ingredients];
                          updated[idx].quantity = parseFloat(e.target.value) || 0;
                          setIngredients(updated);
                        }}
                        className="w-24 rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-white text-center"
                      />

                      <select
                        value={it.unit}
                        onChange={e => {
                          const updated = [...ingredients];
                          updated[idx].unit = e.target.value;
                          setIngredients(updated);
                        }}
                        className="w-24 rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-white"
                      >
                        <option value="KG">KG</option>
                        <option value="G">G</option>
                        <option value="L">L</option>
                        <option value="ML">ML</option>
                        <option value="UNIDAD">Unidad</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-2 text-rose-400 hover:text-rose-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar otro ingrediente
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  {submitting ? 'Guardando...' : 'Crear Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
