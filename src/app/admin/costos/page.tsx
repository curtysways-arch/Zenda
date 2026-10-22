'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, Loader2, Search, ArrowUpRight } from 'lucide-react';

export default function AdminCostosPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCosting = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/costos');
      if (res.ok) {
        const d = await res.json();
        setCatalog(d.catalog || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosting();
  }, []);

  const filtered = catalog.filter(c =>
    c.productName.toLowerCase().includes(search.toLowerCase()) ||
    (c.recipeName && c.recipeName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-400" /> Costeo & Rentabilidad de Productos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Análisis financiero de ingredientes, mano de obra, costos unitarios de elaboración y margen comercial.
          </p>
        </div>
      </div>

      <div className="my-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar producto o receta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Receta / Fórmula</th>
                  <th className="px-4 py-3 text-right">Costo Unitario</th>
                  <th className="px-4 py-3 text-right">Precio Venta</th>
                  <th className="px-4 py-3 text-right">Margen Bruto ($)</th>
                  <th className="px-4 py-3 text-right">Margen (%)</th>
                  <th className="px-4 py-3 text-center">Rentabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map(item => {
                  const marginPct = item.grossMarginPercentage;
                  const isHigh = marginPct >= 40;
                  const isMedium = marginPct >= 20 && marginPct < 40;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3.5 font-bold text-white">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {item.hasRecipe ? (
                          <span className="text-emerald-400 font-semibold">{item.recipeName}</span>
                        ) : (
                          <span className="text-slate-500 ">Sin receta (Costo directo)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-300">
                        ${item.unitCost?.toFixed(3)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                        ${item.salePrice?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                        ${item.grossMarginAmount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold">
                        {item.grossMarginPercentage?.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
 isHigh
 ? 'bg-emerald-500/20 text-emerald-400'
 : isMedium
 ? 'bg-amber-500/20 text-amber-400'
 : 'bg-rose-500/20 text-rose-400'
 }`}>
                          {isHigh ? 'Óptima' : isMedium ? 'Aceptable' : 'Bajo Margen'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No hay productos registrados en el catálogo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
