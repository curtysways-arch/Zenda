'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CalendarCheck, 
  ArrowLeft, 
  Flame, 
  Trophy, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Phone, 
  Sparkles,
  Zap,
  Calendar,
  Building2,
  AlertTriangle
} from 'lucide-react';

export default function MisAsistenciasPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

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
      fetchAttendances(storedPhone);
    } else {
      setLoading(false);
    }
  }, [slug]);

  const fetchAttendances = async (phoneNumber: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/${slug}/gym/member/attendances?phone=${encodeURIComponent(phoneNumber)}`);
      const resData = await res.json();

      if (res.ok && resData.found) {
        setData(resData);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${slug}_client_phone`, phoneNumber);
        }
      } else {
        setError(resData.message || 'No se encontraron registros para este número.');
        setData(null);
      }
    } catch (err) {
      setError('Error al consultar tu historial de entrenamientos.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim()) return;
    setPhone(inputPhone.trim());
    fetchAttendances(inputPhone.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <Link 
          href={`/${slug}/mi-membresia`} 
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Mi Membresía</span>
        </Link>
        <span className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" /> Mis Entrenamientos
        </span>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6 pt-6">
        {!phone && !data && !loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 mx-auto flex items-center justify-center">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Historial de Asistencias</h1>
              <p className="text-xs text-slate-400 mt-1">
                Consulta los días que has entrenado y tu constancia mensual.
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
                Ver Mi Progreso
              </button>
            </form>
          </div>
        ) : loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Cargando tus entrenamientos...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-white">Sin registros</h2>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => { setPhone(''); setError(''); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300"
            >
              Buscar otro número
            </button>
          </div>
        ) : data && (
          <div className="space-y-6">
            {/* Tarjetas de Métricas Personales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xl">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-3">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-white">
                  {data.stats?.thisMonth || 0}
                </div>
                <span className="text-xs font-bold text-slate-400 mt-1 block">
                  Días este mes
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-white">
                  {data.stats?.total || 0}
                </div>
                <span className="text-xs font-bold text-slate-400 mt-1 block">
                  Total entrenamientos
                </span>
              </div>
            </div>

            {/* Mensaje de Motivación y Constancia */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                ¡Cada check-in suma puntos para canjear en la tienda del gimnasio y desbloquear recompensas del Club Citiox!
              </p>
            </div>

            {/* Línea de tiempo de Asistencias */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  Historial de Accesos
                </h3>
                <span className="text-[10px] text-slate-400">Últimos entrenamientos</span>
              </div>

              {(!data.attendances || data.attendances.length === 0) ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Aún no tienes asistencias registradas. ¡Pasa tu QR en recepción hoy!
                </div>
              ) : (
                <div className="space-y-3">
                  {data.attendances.map((att: any) => {
                    const d = new Date(att.checkedInAt);
                    const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
                    const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-2xl flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white capitalize">{dateStr}</div>
                            <div className="text-[10px] text-slate-400">{att.branchName}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-slate-300 block">{timeStr}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Check-in</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accesos rápidos */}
            <div className="pt-2 text-center">
              <Link
                href={`/${slug}/mi-qr`}
                className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300"
              >
                <span>Mostrar Mi Código QR de Entrada</span>
                <Clock className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}