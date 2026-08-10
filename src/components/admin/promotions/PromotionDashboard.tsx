'use client';

import React, { useState } from 'react';
import { Tags, Plus, BarChart3, Ticket, Utensils, Lightbulb, TrendingUp, DollarSign, ShoppingBag, Clock, Sparkles } from 'lucide-react';
import PromotionCard from './PromotionCard';
import PromotionBuilder from './PromotionBuilder';
import ComboBuilder from './ComboBuilder';
import CouponManager from './CouponManager';
import PromotionOpportunities from './PromotionOpportunities';
import PromotionAnalytics from './PromotionAnalytics';

interface PromotionDashboardProps {
  initialPromotions: any[];
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
}

export default function PromotionDashboard({
  initialPromotions,
  products,
  categories,
  initialMetrics,
  negocio,
}: PromotionDashboardProps) {
  const [promotions, setPromotions] = useState<any[]>(initialPromotions);
  const [metrics, setMetrics] = useState(initialMetrics);

  // Tab activo: 'DASHBOARD' | 'BUILDER' | 'COMBO' | 'COUPONS' | 'OPPORTUNITIES' | 'ANALYTICS'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'BUILDER' | 'COMBO' | 'COUPONS' | 'OPPORTUNITIES' | 'ANALYTICS'>('DASHBOARD');

  const [builderPrefilledData, setBuilderPrefilledData] = useState<any>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<any>(null);

  const fetchLatestPromotions = async () => {
    try {
      const res = await fetch('/api/admin/promociones');
      if (res.ok) {
        const data = await res.json();
        if (data.promotions) setPromotions(data.promotions);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (_) {}
  };

  const handleCreatePromoClick = (prefilledData?: any) => {
    setBuilderPrefilledData(prefilledData || null);
    setSelectedPromotion(null);
    setActiveTab('BUILDER');
  };

  const handleEditPromo = (promo: any) => {
    setSelectedPromotion(promo);
    setBuilderPrefilledData(promo);
    setActiveTab('BUILDER');
  };

  const handleToggleStatus = async (promo: any) => {
    try {
      const res = await fetch('/api/admin/promociones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, action: 'TOGGLE_STATUS' })
      });
      if (res.ok) {
        await fetchLatestPromotions();
      }
    } catch (e) {
      console.error('Error cambiando estado:', e);
    }
  };

  const handleDuplicate = async (promo: any) => {
    try {
      const res = await fetch('/api/admin/promociones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, action: 'DUPLICATE' })
      });
      if (res.ok) {
        await fetchLatestPromotions();
      }
    } catch (e) {
      console.error('Error duplicando promoción:', e);
    }
  };

  const handleSavePromotion = async (promoData: any) => {
    try {
      const method = selectedPromotion ? 'PUT' : 'POST';
      const payload = selectedPromotion ? { ...promoData, id: selectedPromotion.id } : promoData;

      const res = await fetch('/api/admin/promociones', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchLatestPromotions();
        setActiveTab('DASHBOARD');
        setSelectedPromotion(null);
        setBuilderPrefilledData(null);
      } else {
        const err = await res.json();
        alert(`Error al guardar: ${err.error || 'Error en el servidor'}`);
      }
    } catch (e) {
      console.error('Error al guardar promoción:', e);
    }
  };

  const formatCurrency = (val?: number) => `$${(Number(val) || 0).toFixed(2)}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Principal */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tags className="size-6 text-amber-400" />
            <h1 className="text-2xl font-black italic uppercase tracking-tight">Módulo de Promociones & Crecimiento</h1>
          </div>
          <p className="text-slate-300 text-xs font-medium max-w-xl">
            Aumenta tus ventas, incrementa el ticket promedio y llena horas de baja demanda reutilizando tu infraestructura actual de Citiox.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleCreatePromoClick()}
          className="py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="size-4" />
          <span>Crear Promoción</span>
        </button>
      </div>

      {/* Resumen de Métricas KPI Clave */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Ventas Generadas</span>
          <span className="text-lg font-black text-emerald-600 block">{formatCurrency(metrics.totalSalesWithPromo)}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Pedidos Con Promo</span>
          <span className="text-lg font-black text-slate-900 block">{metrics.totalOrdersWithPromo}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Descuento Otorgado</span>
          <span className="text-lg font-black text-amber-600 block">{formatCurrency(metrics.totalDiscountsGiven)}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Ticket Promedio</span>
          <span className="text-lg font-black text-purple-600 block">{formatCurrency(metrics.avgTicketPromo)}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Promos Activas</span>
          <span className="text-lg font-black text-blue-600 block">{metrics.activeCount}</span>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Estado Sistema</span>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block text-center mt-1">✓ ONLINE</span>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
        {[
          { id: 'DASHBOARD', label: 'Dashboard & Activas', icon: Tags },
          { id: 'BUILDER', label: 'Constructor', icon: Plus },
          { id: 'COMBO', label: 'Combos', icon: Utensils },
          { id: 'COUPONS', label: 'Cupones', icon: Ticket },
          { id: 'OPPORTUNITIES', label: '💡 Oportunidades', icon: Lightbulb },
          { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
        ].map(tab => {
          const IconC = tab.icon;
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                isAct ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <IconC className={`size-4 ${isAct ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDERIZADO SEGÚN PESTAÑA */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Promociones Activas & Programadas ({promotions.length})</h2>
          </div>

          {promotions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
              <div className="size-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="size-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Aún no tienes promociones creadas</h3>
              <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto">
                Incrementa las ventas de tu restaurante creando tu primera oferta, combo o cupón de descuento.
              </p>
              <button
                type="button"
                onClick={() => handleCreatePromoClick()}
                className="py-3 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-lg cursor-pointer transition-all inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> Crear Primera Promoción
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(promo => (
                <PromotionCard
                  key={promo.id}
                  promotion={promo}
                  onEdit={handleEditPromo}
                  onToggleStatus={handleToggleStatus}
                  onDuplicate={handleDuplicate}
                  onViewStats={() => setActiveTab('ANALYTICS')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'BUILDER' && (
        <PromotionBuilder
          products={products}
          categories={categories}
          initialData={builderPrefilledData}
          onSave={handleSavePromotion}
          onCancel={() => setActiveTab('DASHBOARD')}
        />
      )}

      {activeTab === 'COMBO' && (
        <ComboBuilder
          products={products}
          categories={categories}
          onSaveCombo={handleSavePromotion}
        />
      )}

      {activeTab === 'COUPONS' && (
        <CouponManager
          promotions={promotions}
          onCreateCoupon={handleCreatePromoClick}
        />
      )}

      {activeTab === 'OPPORTUNITIES' && (
        <PromotionOpportunities
          products={products}
          categories={categories}
          onSelectOpportunity={handleCreatePromoClick}
        />
      )}

      {activeTab === 'ANALYTICS' && (
        <PromotionAnalytics
          metrics={metrics}
          promotions={promotions}
        />
      )}
    </div>
  );
}
