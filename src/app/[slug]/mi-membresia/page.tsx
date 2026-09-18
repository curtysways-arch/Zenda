'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  QrCode, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  ArrowRight,
  Phone,
  User,
  RefreshCw,
  Zap,
  Flame,
  ArrowLeft
} from 'lucide-react';

export default function MiMembresiaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [memberData, setMemberData] = useState<any>(null);
  const [error, setError] = useState('');

  // 1. Cargar teléfono desde sesión o localStorage
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
      fetchMembership(storedPhone);
    } else {
      setLoading(false);
    }
  }, [slug]);

  const fetchMembership = async (phoneNumber: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/${slug}/gym/member/qr?phone=${encodeURIComponent(phoneNumber)}`);
      const data = await res.json();

      if (res.ok && data.found) {
        setMemberData(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${slug}_client_phone`, phoneNumber);
        }
      } else {
        setError(data.message || 'No se encontró membresía registrada para este número.');
        setMemberData(null);
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
      setMemberData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim()) return;
    setPhone(inputPhone.trim());
    fetchMembership(inputPhone.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 selection:bg-orange-500 selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <Link 
          href={`/${slug}`} 
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Gimnasio</span>
        </Link>
        <span className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Carnet Digital
        </span>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6 pt-6">
        {/* Si no hay teléfono registrado */}
        {!phone && !memberData && !loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 mx-auto flex items-center justify-center">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Consulta tu Membresía</h1>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa el número de teléfono con el que te registraste en recepción.
              </p>
            </div>

            <form onSubmit={handleSearchPhone} className="space-y-3">
              <div className="relative">
                <input
                  type="tel"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="Ej: 04121234567 o +58412..."
                  required
                  className="w-full text-sm font-medium px-4 py-3 pl-11 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-white placeholder:text-slate-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 hover:opacity-95 transition-all"
              >
                Buscar Mi Carnet
              </button>
            </form>
          </div>
        ) : loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Verificando estado de membresía...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-white">Socio No Encontrado</h2>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => { setPhone(''); setError(''); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300"
            >
              Intentar con otro teléfono
            </button>
          </div>
        ) : memberData && (
          <div className="space-y-6">
            {/* Tarjeta de Membresía Principal (Estilo Carnet VIP) */}
            <div className={`relative rounded-3xl p-6 border shadow-2xl overflow-hidden transition-all ${
              memberData.status === 'ACTIVE'
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/30'
                : memberData.status === 'FROZEN'
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-blue-500/30'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-rose-500/30'
            }`}>
              {/* Decoración geométrica de fondo */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-black text-lg">
                    {memberData.member?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-white tracking-tight">
                      {memberData.member?.name || 'Socio'}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {memberData.member?.phone || phone}
                    </p>
                  </div>
                </div>

                {/* Badge de Estado */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                  memberData.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : memberData.status === 'FROZEN'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}>
                  {memberData.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {memberData.status === 'FROZEN' && <Clock className="w-3 h-3 mr-1" />}
                  {memberData.status !== 'ACTIVE' && memberData.status !== 'FROZEN' && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {memberData.status === 'ACTIVE' ? 'Membresía Activa' : memberData.status === 'FROZEN' ? 'Congelada' : 'Expirada'}
                </span>
              </div>

              {/* Información del Plan */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 gap-4 relative z-10">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Plan Actual</span>
                  <span className="text-sm font-black text-white mt-0.5 block">
                    {memberData.plan?.name || 'Plan Fitness'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Vence</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                    {memberData.dates?.end ? new Date(memberData.dates.end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>

              {/* Días restantes */}
              {memberData.status === 'ACTIVE' && (
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Tiempo disponible</span>
                  <span className="font-black text-emerald-400">
                    {memberData.daysRemaining} días restantes
                  </span>
                </div>
              )}
            </div>

            {/* Acceso Rápido al QR de Recepción */}
            <Link
              href={`/${slug}/mi-qr`}
              className="w-full p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-between hover:opacity-95 transition-all transform active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950/20 flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-sm uppercase tracking-wide">Abrir Carnet QR</div>
                  <div className="text-[11px] font-semibold opacity-80">Escanear en recepción o torno</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </Link>

            {/* Botón de Renovación si vence pronto o está vencida */}
            {(!memberData.isActive || memberData.daysRemaining <= 7) && (
              <div className="bg-slate-900 border border-orange-500/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                  <Flame className="w-4 h-4" /> ¡No interrumpas tu entrenamiento!
                </div>
                <p className="text-xs text-slate-300">
                  {memberData.isActive 
                    ? `Te quedan solo ${memberData.daysRemaining} días. Renueva ahora y mantén tu tarifa congelada.` 
                    : 'Tu membresía ha vencido. Renueva en línea para volver a ingresar al gimnasio de inmediato.'}
                </p>
                <Link
                  href={`/${slug}#planes`}
                  className="block text-center py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  Ver Planes & Renovar
                </Link>
              </div>
            )}

            {/* Accesos Rápidos Extras */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/${slug}/asistencias`}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-left space-y-2 transition-all block"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">Mis Asistencias</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Historial y racha</span>
                </div>
              </Link>

              <Link
                href={`/${slug}/misiones`}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-left space-y-2 transition-all block"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">Beneficios & Retos</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Puntos y recompensas</span>
                </div>
              </Link>
            </div>

            {/* Cambio de cuenta */}
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(`${slug}_client_phone`);
                  }
                  setPhone('');
                  setMemberData(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
              >
                Consultar con otro número de teléfono
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}