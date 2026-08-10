'use client';

import React from 'react';
import { Tags, Calendar, Clock, Edit2, Pause, Play, Copy, BarChart3, Store, Utensils, Truck, ShoppingBag, Globe, Percent, Gift, ShoppingCart } from 'lucide-react';

interface PromotionCardProps {
  promotion: any;
  onEdit: (promo: any) => void;
  onToggleStatus: (promo: any) => void;
  onDuplicate: (promo: any) => void;
  onViewStats: (promo: any) => void;
}

export default function PromotionCard({
  promotion,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onViewStats,
}: PromotionCardProps) {
  const isActiva = promotion.estado === 'ACTIVA' || promotion.estado === 'activa';
  const isPausada = promotion.estado === 'PAUSADA' || promotion.estado === 'borrador';
  const isFinalizada = promotion.estado === 'FINALIZADA' || promotion.estado === 'caducada';

  const formatCurrency = (val?: number) => `$${(Number(val) || 0).toFixed(2)}`;

  const getTypeBadge = (type?: string) => {
    const t = (type || 'PORCENTAJE').toUpperCase();
    if (t === '2X1' || t === 'DOS_POR_UNO') return { label: '2x1 🎁', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (t === '3X2' || t === 'TRES_POR_DOS') return { label: '3x2 🎉', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    if (t === 'ENVIO_GRATIS') return { label: 'Envío Gratis 🛵', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (t === 'COMBO') return { label: 'Combo 🍔', color: 'bg-amber-100 text-amber-900 border-amber-200' };
    if (t === 'CUPON') return { label: 'Cupón 🎫', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (t === 'DESCUENTO_FIJO') return { label: 'Descuento Fijo 💵', color: 'bg-teal-100 text-teal-800 border-teal-200' };
    return { label: 'Porcentaje %', color: 'bg-orange-100 text-orange-800 border-orange-200' };
  };

  const typeInfo = getTypeBadge(promotion.tipoPromo);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      {/* Header & Badges */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isActiva ? 'bg-emerald-500 text-white shadow-xs' : isPausada ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-500'
          }`}>
            {isActiva ? '🟢 ACTIVA' : isPausada ? '⏸️ PAUSADA' : 'FINALIZADA'}
          </span>
        </div>

        <div>
          <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">{promotion.titulo}</h3>
          {promotion.descripcion && (
            <p className="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">{promotion.descripcion}</p>
          )}
        </div>

        {/* Beneficio & Precio */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-extrabold">Beneficio:</span>
          <div className="text-right">
            <span className="text-sm font-black text-amber-600">
              {promotion.tipoPromo === 'PORCENTAJE' ? `${promotion.precioPromo || promotion.porcentajeDescuento || 0}% OFF` : formatCurrency(promotion.precioPromo)}
            </span>
            {promotion.precioAnterior && (
              <span className="text-[10px] text-slate-400 line-through block font-bold">
                {formatCurrency(promotion.precioAnterior)}
              </span>
            )}
          </div>
        </div>

        {/* Canales Activos */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Canales Activos:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
              <Store className="size-3" /> POS
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
              <Utensils className="size-3" /> Meseros
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
              <Truck className="size-3" /> Delivery
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
              <ShoppingBag className="size-3" /> Pickup
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
              <Globe className="size-3" /> Landing
            </span>
          </div>
        </div>

        {/* Fechas & Horario */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <Calendar className="size-3 text-slate-400" />
            <span>Hasta {new Date(promotion.fechaFin).toLocaleDateString('es-EC')}</span>
          </div>
          {promotion.horaInicioValida && promotion.horaFinValida && (
            <div className="flex items-center gap-1 text-amber-600 font-bold">
              <Clock className="size-3" />
              <span>{promotion.horaInicioValida} - {promotion.horaFinValida}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Metrics & Actions */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white p-2 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 font-black uppercase block">Pedidos</span>
            <span className="text-xs font-black text-slate-900">{promotion.ordersGenerated || 0}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 font-black uppercase block">Ventas</span>
            <span className="text-xs font-black text-emerald-600">{formatCurrency(promotion.salesGenerated)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onEdit(promotion)}
            className="py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Editar"
          >
            <Edit2 className="size-3" /> Editar
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(promotion)}
            className={`py-2 text-[10px] font-bold rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              isActiva ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title={isActiva ? 'Pausar' : 'Activar'}
          >
            {isActiva ? <Pause className="size-3" /> : <Play className="size-3" />}
            {isActiva ? 'Pausar' : 'Activar'}
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(promotion)}
            className="py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Duplicar"
          >
            <Copy className="size-3" /> Copiar
          </button>
          <button
            type="button"
            onClick={() => onViewStats(promotion)}
            className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-xl border border-blue-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            title="Métricas"
          >
            <BarChart3 className="size-3" /> Muestras
          </button>
        </div>
      </div>
    </div>
  );
}
