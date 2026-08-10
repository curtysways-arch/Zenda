'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Calendar, Filter } from 'lucide-react';

interface PromotionAnalyticsProps {
  metrics: {
    totalSalesWithPromo: number;
    totalOrdersWithPromo: number;
    totalDiscountsGiven: number;
    avgTicketPromo: number;
    activeCount: number;
  };
  promotions: any[];
}

export default function PromotionAnalytics({
  metrics,
  promotions,
}: PromotionAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'HOY' | 'SEMANA' | 'MES'>('MES');

  const formatCurrency = (val?: number) => `$${(Number(val) || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header & Filtros */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900 uppercase italic">Analytics & Rendimiento de Promociones</h2>
          </div>
          <p className="text-slate-500 text-xs font-medium">
            Mide el impacto real en ventas, retención de clientes y efectividad de cada beneficio comercial.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {(['HOY', 'SEMANA', 'MES'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeframe === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'HOY' ? 'Hoy' : t === 'SEMANA' ? 'Esta Semana' : 'Este Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Ventas con Promoción</span>
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{formatCurrency(metrics.totalSalesWithPromo)}</span>
          <span className="text-[10px] font-extrabold text-emerald-600">📈 Impulso directo en ingresos</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Pedidos Generados</span>
            <ShoppingBag className="size-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{metrics.totalOrdersWithPromo}</span>
          <span className="text-[10px] font-extrabold text-blue-600">📦 Comandas procesadas</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Descuentos Otorgados</span>
            <TrendingUp className="size-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{formatCurrency(metrics.totalDiscountsGiven)}</span>
          <span className="text-[10px] font-extrabold text-amber-600">🎁 Inversión comercial</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Ticket Promedio Promo</span>
            <Users className="size-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{formatCurrency(metrics.avgTicketPromo)}</span>
          <span className="text-[10px] font-extrabold text-purple-600">🍽️ Promedio por pedido</span>
        </div>
      </div>

      {/* Tabla de Rendimiento por Promoción */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Desglose de Efectividad por Promoción</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                <th className="pb-3 font-black">Promoción</th>
                <th className="pb-3 font-black">Tipo</th>
                <th className="pb-3 font-black">Estado</th>
                <th className="pb-3 font-black text-right">Pedidos</th>
                <th className="pb-3 font-black text-right">Ventas Generadas</th>
                <th className="pb-3 font-black text-right">Descuentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">No hay datos de promociones registrados</td>
                </tr>
              ) : (
                promotions.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-extrabold text-slate-900">{p.titulo}</td>
                    <td className="py-3 uppercase text-[10px] font-black text-slate-500">{p.tipoPromo || 'PORCENTAJE'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        p.estado === 'ACTIVA' || p.estado === 'activa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-black">{p.ordersGenerated || 0}</td>
                    <td className="py-3 text-right font-mono font-black text-emerald-600">{formatCurrency(p.salesGenerated)}</td>
                    <td className="py-3 text-right font-mono font-black text-amber-600">{formatCurrency(p.discountGiven)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
