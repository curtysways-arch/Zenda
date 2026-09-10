'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, Calendar, Tag } from 'lucide-react';
import PromotionDashboard from '@/components/admin/promotions/PromotionDashboard';
import PromotionClient from '@/app/admin/promociones/PromotionClient';

interface PromocionesHybridViewProps {
  initialServicePromotions: any[];
  initialProductPromotions: any[];
  products: any[];
  categories: any[];
  initialMetrics: {
    totalSalesWithPromo: number;
    totalOrdersWithPromo: number;
    totalDiscountsGiven: number;
    avgTicketPromo: number;
    activeCount: number;
  };
  negocio: any;
  defaultTab?: 'SERVICIOS' | 'PRODUCTOS';
}

export default function PromocionesHybridView({
  initialServicePromotions,
  initialProductPromotions,
  products,
  categories,
  initialMetrics,
  negocio,
  defaultTab = 'SERVICIOS'
}: PromocionesHybridViewProps) {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams?.get('tab')?.toUpperCase();

  const [activeTab, setActiveTab] = useState<'SERVICIOS' | 'PRODUCTOS'>(() => {
    if (tabFromQuery === 'PRODUCTOS' || tabFromQuery === 'PRODUCTO') return 'PRODUCTOS';
    if (tabFromQuery === 'SERVICIOS' || tabFromQuery === 'SERVICIO') return 'SERVICIOS';
    return defaultTab;
  });

  const handleTabChange = (tab: 'SERVICIOS' | 'PRODUCTOS') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab.toLowerCase());
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* ── BARRA SUPERIOR DE SELECTOR HÍBRIDO (SERVICIOS VS PRODUCTOS) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-slate-900 text-white shadow-sm">
              <Tag size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Módulo de Marketing</p>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Centro de Promociones</h2>
            </div>
          </div>

          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1.5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleTabChange('SERVICIOS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'SERVICIOS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={15} className={activeTab === 'SERVICIOS' ? 'text-rose-500' : ''} />
              Promociones de Servicios
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'SERVICIOS' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-200/70 text-slate-500'
              }`}>
                {initialServicePromotions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('PRODUCTOS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'PRODUCTOS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag size={15} className={activeTab === 'PRODUCTOS' ? 'text-amber-500' : ''} />
              Promociones de Productos
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'PRODUCTOS' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-200/70 text-slate-500'
              }`}>
                {initialProductPromotions.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA ── */}
      {activeTab === 'SERVICIOS' ? (
        <PromotionClient
          initialPromotions={initialServicePromotions}
          negocio={negocio}
        />
      ) : (
        <PromotionDashboard
          initialPromotions={initialProductPromotions}
          products={products}
          categories={categories}
          initialMetrics={initialMetrics}
          negocio={negocio}
        />
      )}
    </div>
  );
}
