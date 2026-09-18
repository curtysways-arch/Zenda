'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Camera, 
  CameraOff, 
  Scan, 
  User, 
  Calendar, 
  LogOut,
  Zap,
  Info
} from 'lucide-react';

export default function MiAccesoPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'MY_QR' | 'SCAN_TOTEM'>('MY_QR');
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [phone, setPhone] = useState('');
  
  // Estados para el escaneo de tótem
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    action?: 'CHECK_IN' | 'CHECK_OUT';
    title: string;
    message: string;
    duration?: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reloj digital en tiempo real con segundero para el pase
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar socio
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
        if (data.member?.telefono) {
          setPhone(data.member.telefono);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`${slug}_client_phone`, data.member.telefono);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Cámara y Escaneo de Tótem
  useEffect(() => {
    if (activeTab === 'SCAN_TOTEM' && !scanFeedback) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, scanFeedback]);

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Iniciar detección con BarcodeDetector si está disponible nativamente en el navegador
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                handleCodeDetected(code);
              }
            } catch (err) {
              // ignore detection frame errors
            }
          }
        }, 500);
      }
    } catch (err) {
      console.warn('Cámara no accesible:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCodeDetected = (code: string) => {
    if (!code || scanLoading) return;
    processTotemScan(code);
  };

  const processTotemScan = async (codeToSubmit: string) => {
    const code = codeToSubmit.trim();
    if (!code || scanLoading) return;

    setScanLoading(true);
    stopCamera();

    try {
      const res = await fetch(`/api/${slug}/gym/attendance/self-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCode: code,
          phone: memberData?.member?.telefono || phone
        })
      });

      const data = await res.json();

      if (res.ok) {
        const isCheckIn = data.action === 'CHECK_IN';
        setScanFeedback({
          type: 'success',
          action: data.action,
          title: isCheckIn ? '¡Bienvenido a Entrenar!' : '¡Excelente Entrenamiento!',
          message: data.message || (isCheckIn ? 'Entrada registrada con éxito.' : `Salida registrada. Tiempo total: ${data.durationMinutes || 0} minutos.`),
          duration: data.durationMinutes
        });
        // Refrescar datos del socio
        fetchMember(phone);
      } else {
        setScanFeedback({
          type: 'error',
          title: 'Acceso No Registrado',
          message: data.error || 'Código de tótem inválido o expirado.'
        });
      }
    } catch (e) {
      setScanFeedback({
        type: 'error',
        title: 'Error de Red',
        message: 'No se pudo validar el acceso con el servidor.'
      });
    } finally {
      setScanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium text-sm">Generando credencial segura...</p>
      </div>
    );
  }

  const member = memberData?.member;
  const activeMembership = memberData?.activeMembership;
  const isExpired = activeMembership && activeMembership.remainingDays <= 0;
  const isInside = memberData?.isInside;

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 space-y-6 pb-28 pt-2">
      {/* Header con botón atrás */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}/mi-gym`}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Mi Gym</span>
        </Link>

        {isInside && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Dentro Ahora</span>
          </div>
        )}
      </div>

      {/* Tabs: Mi QR vs Escanear Tótem */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            setScanFeedback(null);
            setActiveTab('MY_QR');
          }}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'MY_QR'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Mi Pase QR</span>
        </button>

        <button
          onClick={() => {
            setScanFeedback(null);
            setActiveTab('SCAN_TOTEM');
          }}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'SCAN_TOTEM'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>Escanear Tótem</span>
        </button>
      </div>

      {/* TAB 1: MI PASE QR */}
      {activeTab === 'MY_QR' && (
        <div className="space-y-4">
          <div className="relative rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6 shadow-2xl overflow-hidden text-center">
            {/* Decoración superior */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
            
            {/* Reloj y seguridad */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                {currentTime}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Pase Oficial
              </span>
            </div>

            {/* Contenedor del QR */}
            <div className="my-6 p-4 bg-white rounded-3xl shadow-inner border border-slate-100 inline-block">
              {member?.qrCode ? (
                <QRCodeSVG
                  value={member.qrCode}
                  size={210}
                  level="H"
                  includeMargin={false}
                  className="rounded-xl"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-300">
                  <QrCode className="w-16 h-16 animate-pulse" />
                </div>
              )}
            </div>

            {/* Datos del Socio */}
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {member?.nombre || 'Socio'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                ID: {member?.id?.substring(0, 10) || '---'}
              </p>
            </div>

            {/* Estado de Membresía */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Plan Actual
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {activeMembership?.planName || 'Sin Plan'}
                </span>
              </div>

              <div>
                {activeMembership ? (
                  isExpired ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      Vencido
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {activeMembership.remainingDays} Días Restantes
                    </span>
                  )
                ) : (
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-slate-500/10 text-slate-400">
                    Inactivo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <p className="font-bold">¿Cómo ingresar con tu carnet?</p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Muestra esta pantalla frente al lector óptico del torno o recepción. También puedes usar la pestaña <strong>"Escanear Tótem"</strong> para leer el QR de la pantalla del gimnasio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ESCANEAR TÓTEM */}
      {activeTab === 'SCAN_TOTEM' && (
        <div className="space-y-4">
          {scanFeedback ? (
            <div className={`rounded-3xl p-6 border-2 text-center space-y-4 shadow-xl ${
              scanFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                : 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-100'
            }`}>
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg ${
                scanFeedback.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
              }">
                {scanFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-10 h-10" />
                ) : (
                  <AlertTriangle className="w-10 h-10" />
                )}
              </div>

              <div>
                <h3 className="text-2xl font-black">{scanFeedback.title}</h3>
                <p className="text-sm font-medium opacity-90 mt-1">{scanFeedback.message}</p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setScanFeedback(null);
                    startCamera();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs shadow hover:opacity-90 transition-all"
                >
                  Escanear Nuevamente
                </button>
                <Link
                  href={`/${slug}/mi-gym`}
                  className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all"
                >
                  Ir al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Visor de Cámara */}
              <div className="relative aspect-square w-full rounded-3xl bg-slate-950 overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Marco guía de escaneo */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-64 border-2 border-emerald-400 rounded-3xl relative shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/80 animate-pulse shadow-sm" />
                  </div>
                  <span className="mt-4 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                    Apunta a la pantalla del gimnasio
                  </span>
                </div>

                {scanLoading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur flex flex-col items-center justify-center text-white">
                    <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
                    <span className="text-xs font-bold">Validando acceso...</span>
                  </div>
                )}
              </div>

              {/* Formulario alternativo manual por si la cámara falla */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  ¿Problemas con la cámara?
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualCode) processTotemScan(manualCode);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Pega el código del tótem aquí..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={scanLoading || !manualCode.trim()}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all"
                  >
                    Validar
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
