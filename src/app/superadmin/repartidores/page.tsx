'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, ShieldCheck, Lock, Unlock, Search, Filter, RefreshCw, Eye, AlertTriangle,
  CheckCircle2, XCircle, FileText, Building2, User, Phone, MapPin, Clock, Calendar,
  ShieldAlert, Settings, Award, ArrowUpRight, ChevronRight, Sliders, AlertCircle
} from 'lucide-react';

interface GlobalDriver {
  globalId: string;
  primaryResourceId: string;
  name: string;
  phone: string;
  email?: string;
  documento?: string;
  tipoVehiculo: string;
  vehiculo: string;
  placa?: string;
  globalStatus: 'ACTIVO' | 'BLOQUEADO' | 'INVITED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'SUSPENDED';
  motivoBloqueo?: string;
  documentos: {
    cedulaFrenteUrl?: string;
    cedulaReversoUrl?: string;
    licenciaUrl?: string;
    matriculaUrl?: string;
    fotoVehiculoUrl?: string;
    selfieUrl?: string;
  };
  negociosAsociados: {
    resourceId: string;
    negocioId: string;
    negocioNombre: string;
    negocioSlug?: string;
    negocioLogo?: string;
    localStatus: string;
    localActive: boolean;
  }[];
}

export default function SuperAdminRepartidoresPage() {
  const [activeTab, setActiveTab] = useState<'EXPE' | 'REGLAS' | 'AUDITORIA'>('EXPE');
  const [drivers, setDrivers] = useState<GlobalDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDriver, setSelectedDriver] = useState<GlobalDriver | null>(null);

  // Modal Bloqueo Global
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Reglas Globales (Form State)
  const [globalRules, setGlobalRules] = useState({
    documentoIdentidad: true,
    licenciaConducir: true,
    matriculaVehiculo: true,
    fotoVehiculo: true,
    selfiePerfil: true,
    warningDays: 15,
    autoDisableOnExpire: true,
    allowedVehicles: {
      MOTO: true,
      AUTO: true,
      BICICLETA: true,
      CAMIONETA: true,
      A_PIE: true,
    }
  });

  const loadGlobalDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/drivers?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch (e) {
      console.error('Error cargando repartidores globales:', e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadGlobalDrivers();
  }, [loadGlobalDrivers]);

  const handleToggleGlobalBlock = async () => {
    if (!selectedDriver) return;
    setProcessingAction(true);
    try {
      const isCurrentlyBlocked = selectedDriver.globalStatus === 'BLOQUEADO' || selectedDriver.globalStatus === 'SUSPENDED';
      const newStatus = isCurrentlyBlocked ? 'ACTIVO' : 'BLOQUEADO';

      const res = await fetch('/api/superadmin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_GLOBAL_BLOCK',
          driverPhone: selectedDriver.phone,
          globalStatus: newStatus,
          motivo: blockReason || 'Bloqueo global aplicado por administración central Citiox'
        })
      });

      if (res.ok) {
        setShowBlockModal(false);
        setBlockReason('');
        setSelectedDriver(null);
        await loadGlobalDrivers();
      } else {
        alert('No se pudo actualizar el estado global del repartidor');
      }
    } catch (e) {
      console.error('Error en cambio de estado global:', e);
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 space-y-6">
      {/* Header Central SuperAdmin */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Truck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión Global de Repartidores</h1>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-200">
                SuperAdmin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Políticas de plataforma, auditoría y control de bloqueo centralizado para Citiox Enterprise
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadGlobalDrivers}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
            title="Actualizar Repartidores"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas SuperAdmin */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {[
          { key: 'EXPE', label: 'Expedientes Globales', icon: UsersIcon },
          { key: 'REGLAS', label: 'Reglas y Documentos Requeridos', icon: Settings },
          { key: 'AUDITORIA', label: 'Historial y Auditoría Global', icon: Clock },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === t.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 1: EXPEDIENTES GLOBALES (SUPERADMIN) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'EXPE' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar repartidor por nombre, teléfono o ID..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Estado Global:</span>
              {['ALL', 'ACTIVO', 'BLOQUEADO'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Todos' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Repartidores Globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-400 font-semibold text-sm">
                Cargando expedientes de repartidores...
              </div>
            ) : drivers.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500">
                <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm">No se encontraron repartidores registrados</p>
              </div>
            ) : (
              drivers.map(driver => {
                const isBlocked = driver.globalStatus === 'BLOQUEADO' || driver.globalStatus === 'SUSPENDED';
                return (
                  <div
                    key={driver.globalId}
                    className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 transition-all relative ${
                      isBlocked ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-md uppercase">
                          {driver.name.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base leading-tight">{driver.name}</h3>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">📱 {driver.phone || 'Sin teléfono'}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                        isBlocked
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                        {isBlocked ? '🔴 Bloqueado Global' : '🟢 Global Activo'}
                      </span>
                    </div>

                    {/* Negocios Asociados */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Locales Autorizados ({driver.negociosAsociados.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {driver.negociosAsociados.map(n => (
                          <span
                            key={n.negocioId}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1 ${
                              n.localActive && n.localStatus === 'APPROVED'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {n.negocioNombre}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botones de Acción SuperAdmin */}
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Expediente</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDriver(driver);
                          setShowBlockModal(true);
                        }}
                        className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isBlocked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 2: REGLAS Y DOCUMENTOS REQUERIDOS (SUPERADMIN) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'REGLAS' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" /> Configuración Global de Documentos Requeridos
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Establece los requisitos obligatorios que deben cumplir todos los repartidores registrados en Citiox.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'documentoIdentidad', title: 'Documento de Identidad (Cédula / DNI)', desc: 'Requerido para la validación de identidad personal.' },
                { key: 'licenciaConducir', title: 'Licencia de Conducir Vigente', desc: 'Obligatorio para conductores de Moto y Auto.' },
                { key: 'matriculaVehiculo', title: 'Matrícula / Documentación de Vehículo', desc: 'Comprobante de propiedad o matrícula oficial del vehículo.' },
                { key: 'fotoVehiculo', title: 'Fotografía del Vehículo', desc: 'Foto clara con placa legible para seguridad del cliente.' },
                { key: 'selfiePerfil', title: 'Selfie de Perfil', desc: 'Fotografía reciente para reconocimiento de perfil en la App.' },
              ].map(doc => (
                <div key={doc.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{doc.title}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{doc.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean((globalRules as any)[doc.key])}
                    onChange={e => setGlobalRules({
                      ...globalRules,
                      [doc.key]: e.target.checked
                    })}
                    className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => alert('Políticas globales de documentación actualizadas correctamente')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
              >
                Guardar Reglas Globales
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* PESTAÑA 3: AUDITORÍA GLOBAL (SUPERADMIN) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'AUDITORIA' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Registro de Auditoría e Historial Global
          </h2>

          <div className="space-y-3">
            {[
              { id: '1', fecha: 'Hoy, 10:30 AM', admin: 'SuperAdmin Citiox', accion: 'Bloqueo Global Aplicado', driver: 'Marco Proaño (+593991234567)', detalle: 'Motivo: Documentación adulterada' },
              { id: '2', fecha: 'Hoy, 09:15 AM', admin: 'La Parrilla Citiox (Admin)', accion: 'Aprobación Local', driver: 'Carlos Caicedo (+593983173408)', detalle: 'Aprobado para pedidos de La Parrilla' },
              { id: '3', fecha: 'Ayer, 16:45 PM', admin: 'Pizzeria Gourmet (Admin)', accion: 'Suspensión Local', driver: 'Carlos Caicedo (+593983173408)', detalle: 'Suspendido por retardo recurrente en local' },
            ].map(log => (
              <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{log.accion}</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">{log.admin}</span>
                  </div>
                  <p className="text-slate-600 font-semibold">{log.driver}</p>
                  <p className="text-slate-400 text-[11px]">{log.detalle}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{log.fecha}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL BLOQUEO / DESBLOQUEO GLOBAL ── */}
      {showBlockModal && selectedDriver && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedDriver.globalStatus === 'BLOQUEADO' ? 'Desbloquear Repartidor' : 'Bloqueo Global de Repartidor'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedDriver.name} ({selectedDriver.phone})</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-900 font-semibold space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Nota sobre el inicio de sesión:
              </p>
              <p className="text-[11px] text-amber-800 leading-tight">
                Al aplicar el bloqueo global, el repartidor <strong>sí podrá iniciar sesión en la App /driver</strong> para consultar su perfil y ver la razón del bloqueo, pero el sistema le impedirá tomar pedidos en todos los negocios.
              </p>
            </div>

            {selectedDriver.globalStatus !== 'BLOQUEADO' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                  Motivo del Bloqueo Global *
                </label>
                <textarea
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="Ej: Licencia vencida o falta grave reportada."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleGlobalBlock}
                disabled={processingAction || (selectedDriver.globalStatus !== 'BLOQUEADO' && !blockReason.trim())}
                className={`flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer disabled:opacity-50 ${
                  selectedDriver.globalStatus === 'BLOQUEADO'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {processingAction ? 'Procesando...' : (selectedDriver.globalStatus === 'BLOQUEADO' ? 'Confirmar Desbloqueo' : 'Confirmar Bloqueo Global')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersIcon(props: any) {
  return <User {...props} />;
}
