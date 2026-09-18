'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Sparkles,
  Phone,
  User,
  Zap,
  Info
} from 'lucide-react';

export default function MiQrPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [memberData, setMemberData] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Reloj en tiempo real para verificación visual de recepcionista
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar teléfono
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
      fetchQr(storedPhone);
    } else {
      setLoading(false);
    }
  }, [slug]);

  const fetchQr = async (phoneNumber: string) => {
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
        setError(data.message || 'No se encontró socio registrado con este teléfono.');
        setMemberData(null);
      }
    } catch (err) {
      setError('Error al generar código de acceso.');
      setMemberData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim()) return;
    setPhone(inputPhone.trim());
    fetchQr(inputPhone.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <Link 
          href={`/${slug}/mi-membresia`} 
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Mi Membresía</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400">
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span>{currentTime}</span>
        </div>
      </header>

      {/* Contenedor Central */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full space-y-5">
        {!phone && !memberData && !loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 w-full shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 mx-auto flex items-center justify-center">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">QR de Acceso</h1>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tu teléfono para cargar tu carnet QR de acceso al gimnasio.
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
                Generar Mi QR
              </button>
            </form>
          </div>
        ) : loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Generando credencial de acceso...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 w-full">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-white">No se pudo generar el QR</h2>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              onClick={() => { setPhone(''); setError(''); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300"
            >
              Probar otro teléfono
            </button>
          </div>
        ) : memberData && (
          <div className="w-full space-y-4">
            {/* Tarjeta de Código QR de Alta Legibilidad */}
            <div className={`p-6 rounded-3xl border-2 text-center relative overflow-hidden shadow-2xl transition-all ${
              memberData.isActive
                ? 'bg-slate-900 border-emerald-500/50 shadow-emerald-500/10'
                : 'bg-slate-900 border-rose-500/50 shadow-rose-500/10'
            }`}>
              {/* Badge superior */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  memberData.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {memberData.isActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Acceso Habilitado
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Membresía Inactiva
                    </>
                  )}
                </span>
              </div>

              {/* Contenedor Blanco del QR para escaneo óptimo */}
              <div className="bg-white p-5 rounded-2xl inline-block shadow-inner mx-auto my-2">
                <QRCodeSVG
                  value={memberData.qrPayload || `CITIOX_GYM:${memberData.member?.id}`}
                  size={230}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Datos del socio */}
              <div className="mt-4 space-y-1">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {memberData.member?.name || 'Socio'}
                </h2>
                <p className="text-xs text-slate-400">
                  {memberData.plan?.name || 'Membresía General'}
                </p>
                {memberData.isActive && (
                  <p className="text-xs font-bold text-emerald-400 pt-1">
                    {memberData.daysRemaining} días restantes de entrenamiento
                  </p>
                )}
              </div>

              {/* Instrucción para el socio */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>Pasa este código frente al lector de recepción para ingresar</span>
              </div>
            </div>

            {/* Si no está activo: botón para renovar */}
            {!memberData.isActive && (
              <Link
                href={`/${slug}#planes`}
                className="block text-center py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/20 hover:opacity-95 transition-all"
              >
                Renovar Membresía Ahora
              </Link>
            )}

            <div className="flex items-center justify-between px-2 text-xs text-slate-500">
              <button
                onClick={() => fetchQr(phone)}
                className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refrescar carnet</span>
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(`${slug}_client_phone`);
                  }
                  setPhone('');
                  setMemberData(null);
                }}
                className="hover:text-slate-300 transition-colors"
              >
                Cambiar socio
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer discreto */}
      <footer className="p-4 text-center text-[10px] text-slate-600 font-medium">
        Citiox Gym Access Engine • Código QR dinámico personal e intransferible
      </footer>
    </div>
  );
}