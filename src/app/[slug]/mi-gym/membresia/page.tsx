'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  QrCode, 
  ArrowRight,
  Zap,
  Sparkles,
  Award
} from 'lucide-react';

export default function MiMembresiaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<any>(null);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    let storedPhone = '';
    if (typeof window !== 'undefined') {
      storedPhone = 
        localStorage.getItem(`${slug}_client_phone`) || 
        localStorage.getItem('user_phone') || 
        localStorage.getItem('customer_phone') || '';
    }

    if (storedPhone) {
      setPhone(storedPhone);
      fetchMember(storedPhone);
    } else {
      fetchMember();
    }
  }, [slug]);

  const fetchMember = async (phoneNumber?: string) => {
    setLoading(true);
    try {
      const query = phoneNumber ? `?phone=${encodeURIComponent(phoneNumber)}` : '';
      const res = await fetch(`/api/${slug}/gym/member/me${query}`);
      if (res.ok) {
        const data = await res.json();
        setMemberData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium text-sm">Cargando estado de membresía...</p>
      </div>
    );
  }

  const activeMembership = memberData?.activeMembership;
  const isExpired = activeMembership && activeMembership.remainingDays <= 0;
  const isExpiringSoon = activeMembership && activeMembership.remainingDays > 0 && activeMembership.remainingDays <= 5;

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 space-y-6 pb-28 pt-2">
      {/* Header con volver */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}/mi-gym`}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mi Gym</span>
        </Link>

        <Link
          href={`/${slug}/mi-gym/acceso`}
          className="p-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-emerald-400 hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1 text-xs font-bold shadow"
        >
          <QrCode className="w-4 h-4" />
          <span>Pase QR</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-500" />
          Mi Membresía
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Información detallada de tu suscripción, vigencia y beneficios contratados.
        </p>
      </div>

      {activeMembership ? (
        <div className="space-y-4">
          {/* Tarjeta Principal de Membresía */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-6 shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Plan Activo
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {activeMembership.planName}
                </h2>
              </div>

              <div>
                {isExpired ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Vencida
                  </span>
                ) : isExpiringSoon ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Por Vencer
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Vigente
                  </span>
                )}
              </div>
            </div>

            {/* Días restantes */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-400">
                  {Math.max(0, activeMembership.remainingDays)}
                </span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Días restantes
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, (activeMembership.remainingDays / 30) * 100))}%` }}
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs text-slate-300 relative z-10">
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Fecha Inicio</span>
                <span className="font-semibold text-white">
                  {new Date(activeMembership.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Vence el</span>
                <span className="font-semibold text-white">
                  {new Date(activeMembership.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Beneficios Incluidos */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" />
              Beneficios Incluidos en tu Plan
            </h3>

            {activeMembership.features && activeMembership.features.length > 0 ? (
              <div className="space-y-3">
                {activeMembership.features.map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Acceso ilimitado a sala de pesas y máquinas de musculación</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Área de cardio y zona funcional</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Casilleros, vestidores y duchas</span>
                </div>
              </div>
            )}
          </div>

          {/* CTA de Renovación o Mejora */}
          <div className="pt-2">
            <Link
              href={`/${slug}#planes`}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isExpired ? 'Renovar Mi Membresía Ahora' : 'Renovar o Mejorar de Plan'}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-4 bg-white/50 dark:bg-slate-900/50">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              No tienes una membresía activa actualmente
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Adquiere un plan para tener acceso a las instalaciones, rutinas guiadas y clases.
            </p>
          </div>
          <Link
            href={`/${slug}#planes`}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 transition-all"
          >
            <span>Ver Planes Disponibles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
