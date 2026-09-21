'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  ShieldCheck, 
  Printer, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Save, 
  Loader2, 
  Tv, 
  Smartphone, 
  Key, 
  RefreshCw, 
  FileText, 
  X,
  ExternalLink,
  Users,
  Check,
  Zap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { ALLOWED_DYNAMIC_INTERVALS, GymAccessConfig, DEFAULT_GYM_ACCESS_CONFIG } from '@/modules/gym/types/gymAccessConfig';

interface Props {
  negocio: any;
  primaryColor?: string;
}

export default function GymAccessConfigSection({ negocio, primaryColor = '#0ea5e9' }: Props) {
  const [config, setConfig] = useState<GymAccessConfig>(DEFAULT_GYM_ACCESS_CONFIG);
  const [staticToken, setStaticToken] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>(negocio?.nombre || 'Gimnasio');
  const [businessLogo, setBusinessLogo] = useState<string | null>(negocio?.logoUrl || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Cargar configuración actual
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/gym/access/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          if (data.config.adminQr?.staticToken) {
            setStaticToken(data.config.adminQr.staticToken);
          }
        }
        if (data.business) {
          setBusinessName(data.business.nombre || negocio?.nombre || 'Gimnasio');
          setBusinessLogo(data.business.logoUrl || negocio?.logoUrl || null);
        }
      }
    } catch (e) {
      console.error('Error fetching gym access config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Guardar configuración
  const handleSave = async () => {
    // Validar que no queden todos los métodos deshabilitados
    const isQrActive = config.primaryMethod === 'QR' || config.backupMethods.qr;
    const isManualActive = config.primaryMethod === 'MANUAL' || config.backupMethods.manual;

    if (!isQrActive && !isManualActive) {
      setMessage({
        type: 'error',
        text: 'Debes mantener al menos un método de acceso activo (QR o Manual).'
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/gym/access/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Configuración de acceso de socios actualizada correctamente.'
        });
        if (data.config) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Error al guardar la configuración.'
        });
      }
    } catch (e) {
      setMessage({
        type: 'error',
        text: 'Error de conexión con el servidor.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-8 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-slate-400" size={24} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando configuración de accesos...</span>
      </div>
    );
  }

  const isQrEnabled = config.primaryMethod === 'QR' || config.backupMethods.qr;
  const isManualEnabled = config.primaryMethod === 'MANUAL' || config.backupMethods.manual;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
      {/* Encabezado Principal */}
      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <Key className="w-3 h-3 mr-1 text-emerald-500" /> Control de Ingresos & Socios
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Scan className="w-6 h-6 text-emerald-600" />
            Acceso de Socios
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Configura los métodos de registro de entradas en recepción y la seguridad de los códigos QR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/accesos"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Scan className="w-4 h-4 text-slate-500" />
            <span>Ir al Scanner</span>
          </Link>
          <Link
            href="/admin/accesos/pantalla"
            target="_blank"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>Modo Pantalla</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* Alerta de Mensaje */}
      {message && (
        <div className={`mx-8 mt-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={20} className="shrink-0 text-rose-600" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="p-8 space-y-10">
        {/* ================= SECCIÓN 1: MÉTODOS DE ACCESO ================= */}
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              1. Control de Ingreso (Recepción / Mostrador)
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Establece el método principal de verificación y los respaldos permitidos.
            </p>
          </div>

          {/* Selector de Método Principal */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
              Método Principal de Acceso
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opción 1: QR */}
              <div 
                onClick={() => setConfig(prev => ({ ...prev, primaryMethod: 'QR' }))}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                  config.primaryMethod === 'QR'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-500/10'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <div className={`p-3 rounded-xl ${config.primaryMethod === 'QR' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                  <Scan size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-sm">QR del Socio</h4>
                    {config.primaryMethod === 'QR' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                        <Check size={12} className="mr-0.5" /> Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Escaneo mediante cámara del dispositivo o lector de pistola externo. El socio puede mostrar el QR en su celular o en un carnet físico impreso.
                  </p>
                </div>
              </div>

              {/* Opción 2: Registro Manual */}
              <div 
                onClick={() => setConfig(prev => ({ ...prev, primaryMethod: 'MANUAL' }))}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                  config.primaryMethod === 'MANUAL'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-500/10'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <div className={`p-3 rounded-xl ${config.primaryMethod === 'MANUAL' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                  <FileText size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 text-sm">Registro Manual</h4>
                    {config.primaryMethod === 'MANUAL' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                        <Check size={12} className="mr-0.5" /> Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Búsqueda de socio por cédula, número de identificación o nombre desde la recepción. Conserva la auditoría de cada registro.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Métodos de Respaldo */}
          <div className="pt-2 border-t border-gray-100">
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-3">
              Métodos de Respaldo Habilitados
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Respaldo Manual */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                config.primaryMethod === 'MANUAL' 
                  ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed' 
                  : config.backupMethods.manual 
                    ? 'bg-emerald-50/30 border-emerald-300' 
                    : 'bg-white border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  disabled={config.primaryMethod === 'MANUAL'}
                  checked={config.primaryMethod === 'MANUAL' || config.backupMethods.manual}
                  onChange={(e) => {
                    if (config.primaryMethod !== 'MANUAL') {
                      setConfig(prev => ({
                        ...prev,
                        backupMethods: { ...prev.backupMethods, manual: e.target.checked }
                      }));
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">
                    Permitir Registro Manual como respaldo
                  </span>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    {config.primaryMethod === 'MANUAL' 
                      ? 'Activo por ser el método principal.' 
                      : 'Habilita la búsqueda manual en recepción si el socio olvidó su carnet o celular.'}
                  </span>
                </div>
              </label>

              {/* Respaldo QR */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                config.primaryMethod === 'QR' 
                  ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed' 
                  : config.backupMethods.qr 
                    ? 'bg-emerald-50/30 border-emerald-300' 
                    : 'bg-white border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  disabled={config.primaryMethod === 'QR'}
                  checked={config.primaryMethod === 'QR' || config.backupMethods.qr}
                  onChange={(e) => {
                    if (config.primaryMethod !== 'QR') {
                      setConfig(prev => ({
                        ...prev,
                        backupMethods: { ...prev.backupMethods, qr: e.target.checked }
                      }));
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">
                    Permitir Escaneo QR como respaldo
                  </span>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    {config.primaryMethod === 'QR' 
                      ? 'Activo por ser el método principal.' 
                      : 'Permite pasar carnet QR cuando el flujo prioritario sea manual.'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Nota Aclaratoria */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
            <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-800 font-bold">Nota operativa:</strong> El lector óptico USB (pistola de hardware), la cámara web y el carnet impreso utilizan la misma tecnología QR estándar. No requieren configuraciones separadas y responden al interruptor unificado de <strong>QR del socio</strong>.
            </p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ================= SECCIÓN 2: QR DE RECEPCIÓN / AUTO-ESCANEO ================= */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Tv className="w-5 h-5 text-purple-600" />
                2. Seguridad del QR de Administración (Tótem / Auto-ingreso)
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Define cómo el socio auto-registra su ingreso escaneando el código de tu gimnasio.
              </p>
            </div>
          </div>

          {/* Opciones: Dinámico vs Fijo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opción Dinámica */}
            <div 
              onClick={() => setConfig(prev => ({
                ...prev,
                adminQr: { ...prev.adminQr, mode: 'DYNAMIC' }
              }))}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                config.adminQr.mode === 'DYNAMIC'
                  ? 'border-purple-500 bg-purple-50/30 shadow-md shadow-purple-500/10'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl ${config.adminQr.mode === 'DYNAMIC' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">QR Dinámico (Pantalla / TV / Tablet)</h4>
                      <span className="text-[10px] text-emerald-600 font-extrabold uppercase">Máxima Seguridad</span>
                    </div>
                  </div>
                  {config.adminQr.mode === 'DYNAMIC' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-purple-200" />
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  El código cambia automáticamente en la pantalla de recepción para impedir que los socios lo fotografíen o compartan por chat.
                </p>
              </div>

              {/* Selector de Intervalo */}
              <div className="pt-4 border-t border-purple-100/60" onClick={(e) => e.stopPropagation()}>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-2">
                  Intervalo de Renovación del Código
                </label>
                <select
                  disabled={config.adminQr.mode !== 'DYNAMIC'}
                  value={config.adminQr.dynamicIntervalSeconds}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    adminQr: { ...prev.adminQr, dynamicIntervalSeconds: Number(e.target.value) }
                  }))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-purple-500 disabled:opacity-50"
                >
                  <option value={30}>Cada 30 segundos (Ultra seguro)</option>
                  <option value={60}>Cada 60 segundos (1 minuto)</option>
                  <option value={90}>Cada 90 segundos (Recomendado)</option>
                  <option value={120}>Cada 120 segundos (2 minutos)</option>
                  <option value={180}>Cada 180 segundos (3 minutos)</option>
                </select>
              </div>
            </div>

            {/* Opción Fija para Imprimir */}
            <div 
              onClick={() => setConfig(prev => ({
                ...prev,
                adminQr: { ...prev.adminQr, mode: 'STATIC_PRINTABLE' }
              }))}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                config.adminQr.mode === 'STATIC_PRINTABLE'
                  ? 'border-purple-500 bg-purple-50/30 shadow-md shadow-purple-500/10'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl ${config.adminQr.mode === 'STATIC_PRINTABLE' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Printer size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">QR Fijo / Para Imprimir</h4>
                      <span className="text-[10px] text-amber-600 font-extrabold uppercase">Sin Pantalla Física</span>
                    </div>
                  </div>
                  {config.adminQr.mode === 'STATIC_PRINTABLE' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-purple-200" />
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Diseñado para gimnasios que no cuentan con pantalla o tablet en el mostrador. Genera un afiche físico permanente firmado criptográficamente.
                </p>
              </div>

              {/* Botón Abrir Afiche */}
              <div className="pt-4 border-t border-purple-100/60 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Printer size={15} />
                  Generar QR para Imprimir
                </button>
              </div>
            </div>
          </div>

          {/* Advertencia de Seguridad */}
          {config.adminQr.mode === 'STATIC_PRINTABLE' && (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-800 animate-in fade-in duration-300">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold">Advertencia de Seguridad sobre el QR Impreso:</strong>
                <p className="mt-0.5 text-amber-700">
                  Cualquier socio puede fotografiar este afiche estático. Aunque el sistema valida que el socio tenga una membresía activa y aplica un temporizador anti-duplicados, se recomienda instalar una tablet o pantalla con <strong>QR Dinámico</strong> para control estricto.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botón Guardar Cambios */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-400">
            Los cambios se aplican inmediatamente en el scanner de recepción y en los dispositivos de los socios.
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Guardar Configuración de Acceso</span>
          </button>
        </div>
      </div>

      {/* ================= MODAL DE IMPRESIÓN DE QR FIJO ================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Afiche de Acceso de Recepción</h3>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido Imprimible */}
            <div className="p-8 flex flex-col items-center text-center space-y-6" ref={printRef} id="printable-totem-poster">
              {businessLogo ? (
                <img src={businessLogo} alt={businessName} className="h-16 max-w-[180px] object-contain" />
              ) : (
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-700 font-black text-lg">
                  {businessName}
                </div>
              )}

              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 mb-2">
                  <Zap className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Punto de Acceso Oficial
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Registra tu Entrada Aquí
                </h2>
                <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                  Abre la app de {businessName} en tu celular y escanea este código para ingresar.
                </p>
              </div>

              {/* Código QR Generado */}
              <div className="p-6 bg-white border-4 border-slate-900 rounded-3xl shadow-lg">
                <QRCodeSVG
                  value={staticToken || 'CITIOX_TOTEM_STATIC_PENDING'}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-1 text-xs text-slate-400 max-w-xs">
                <p className="font-bold text-slate-600">Código seguro firmado criptográficamente</p>
                <p className="text-[10px]">Válido únicamente para socios con membresía activa.</p>
              </div>
            </div>

            {/* Footer Modal con Botón Imprimir */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md transition"
              >
                <Printer size={16} />
                Imprimir Afiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
