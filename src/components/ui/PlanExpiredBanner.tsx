'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface PlanExpiredBannerProps {
  reason?: 'PLAN_FREE' | 'PLAN_EXPIRED' | 'TRIAL_EXPIRED' | 'PAYMENT_PAST_DUE' | string;
  className?: string;
  actionUrl?: string;
  customTitle?: string;
  customDescription?: string;
  compact?: boolean;
}

export default function PlanExpiredBanner({
  reason = 'PLAN_FREE',
  className = '',
  actionUrl = '/admin/plan',
  customTitle,
  customDescription,
  compact = false
}: PlanExpiredBannerProps) {
  const getBadgeAndText = () => {
    switch (reason) {
      case 'PLAN_EXPIRED':
        return {
          badge: 'Suscripción Vencida',
          title: customTitle || 'Información Estratégica Protegida',
          desc: customDescription || 'Tu período de suscripción ha culminado y tu cuenta pasó al Plan Free de tu vertical. La actividad pública de tus clientes sigue ingresando normalmente, pero los detalles sensibles están protegidos.',
          btnText: 'Reactivar Plan'
        };
      case 'TRIAL_EXPIRED':
        return {
          badge: 'Periodo de Prueba Finalizado',
          title: customTitle || 'Desbloquea tus Datos Completos',
          desc: customDescription || 'Tu período de prueba ha terminado. Elige un plan para acceder a los números de teléfono, correos, detalles y reportes de tus clientes.',
          btnText: 'Elegir Plan'
        };
      case 'PAYMENT_PAST_DUE':
        return {
          badge: 'Pago Pendiente',
          title: customTitle || 'Regulariza tu Suscripción',
          desc: customDescription || 'Existe un pago pendiente en tu cuenta. Los datos recibidos están protegidos hasta que se procese la renovación.',
          btnText: 'Pagar Ahora'
        };
      case 'PLAN_FREE':
      default:
        return {
          badge: 'Plan Free',
          title: customTitle || '🔒 Información Protegida',
          desc: customDescription || 'Esta orden/reserva fue recibida correctamente. Tu Plan Free actual no permite consultar la información estratégica de clientes ni montos. Actualiza tu suscripción para desbloquearla.',
          btnText: 'Actualizar Plan'
        };
    }
  };

  const info = getBadgeAndText();

  if (compact) {
    return (
      <div className={`p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-sm flex items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">{info.badge}</p>
            <p className="text-xs text-amber-800 font-medium">{info.desc}</p>
          </div>
        </div>
        <Link
          href={actionUrl}
          className="shrink-0 px-4 py-2 bg-amber-700 text-white rounded-xl text-xs font-bold hover:bg-amber-800 transition-colors shadow-sm flex items-center gap-1.5"
        >
          {info.btnText}
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/50 ${className}`}>
      {/* Glow ambiental */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Lock size={24} />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <ShieldAlert size={12} />
              {info.badge}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{info.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              {info.desc}
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <Link
            href={actionUrl}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <span>{info.btnText}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
