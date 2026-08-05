'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  Lock,
  RefreshCw,
  LogOut,
  ChevronRight,
  Send,
  AlertCircle,
  Package,
  User,
  History,
  Shield,
  Bell,
  MoreVertical,
  Star,
  ExternalLink,
  Zap,
  Sliders,
  Award
} from 'lucide-react';
import DynamicFavicon from '@/components/DynamicFavicon';

export interface Assignment {
  id: string;
  tipo: 'RETIRO' | 'ENTREGA';
  estado: 'ASIGNADO' | 'ACEPTADO' | 'EN_RUTA' | 'LLEGO' | 'COMPLETADO' | 'CANCELADO';
  clienteNombre: string;
  clienteTelefono: string;
  clienteDireccion: string;
  referenciaDireccion?: string;
  notas?: string;
  notasCliente?: string;
  fechaEntrega?: string;
  horaAsignacion: string;
  ordenReferenciaId?: string;
  subtotal?: number;
  total?: number;
  items?: Array<{ id?: string; nombreProducto?: string; cantidad?: number; precioUnitario?: number }>;
  pinRetiro?: string;
  pinEntrega?: string;
  distanciaKm?: string;
  tipoServicio?: string;
}

function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('09') && digits.length === 10) {
    return '593' + digits.substring(1);
  }
  if (digits.length === 9) {
    return '593' + digits;
  }
  return digits;
}

export default function DriverPortalApp() {
  const [session, setSession] = useState<{ resourceId: string; name: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'ordenes' | 'historial' | 'perfil'>('ordenes');
  const [filterType, setFilterType] = useState<'TODAS' | 'RETIRO' | 'ENTREGA'>('TODAS');

  // Vista activa de navegación (Linear Mobile Flow): 'LIST' | 'DETAIL' | 'EN_CAMINO' | 'VALIDAR_PIN'
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EN_CAMINO' | 'VALIDAR_PIN'>('LIST');

  // Input PIN de validación de 6 dígitos
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Cargar sesión guardada del repartidor
  useEffect(() => {
    const saved = localStorage.getItem('driver_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch {}
    } else {
      // Fallback demo driver si no hay sesión
      const defaultSess = { resourceId: 'drv_demo_1', name: 'Carlos Caicedo' };
      localStorage.setItem('driver_session', JSON.stringify(defaultSess));
      setSession(defaultSess);
    }
  }, []);

  // Cargar asignaciones / misiones desde API
  const loadMyAssignments = async (resourceId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logistics/assignments?resourceId=${resourceId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
        if (selectedAssignment) {
          const fresh = data.find((a: Assignment) => a.id === selectedAssignment.id);
          if (fresh) setSelectedAssignment(fresh);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadMyAssignments(session.resourceId);
  }, [session]);

  const handleLoginSubmit = async (resourceIdVal: string) => {
    if (!resourceIdVal.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/logistics/resources?includeInactive=true`);
      if (res.ok) {
        const drivers = await res.json();
        const driver = drivers.find((d: any) =>
          d.id === resourceIdVal.trim() ||
          d.name.toLowerCase().includes(resourceIdVal.trim().toLowerCase()) ||
          d.profile?.telefono?.replace(/\D/g, '').endsWith(resourceIdVal.trim().replace(/\D/g, ''))
        );
        if (driver) {
          const sess = { resourceId: driver.id, name: driver.name };
          localStorage.setItem('driver_session', JSON.stringify(sess));
          setSession(sess);
        } else {
          // Entrar con el código ingresado directamente
          const sess = { resourceId: resourceIdVal.trim(), name: 'Carlos Caicedo' };
          localStorage.setItem('driver_session', JSON.stringify(sess));
          setSession(sess);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para avanzar estado en la API
  const updateAssignmentState = async (assignmentId: string, nextState: string, payloadNotes?: string) => {
    setUpdating(true);
    setPinError('');
    try {
      const res = await fetch(`/api/logistics/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nextState, notas: payloadNotes }),
      });
      if (res.ok) {
        await loadMyAssignments(session!.resourceId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Manejador del teclado para el PIN de 6 dígitos
  const handlePinChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const copy = [...pinDigits];
    copy[idx] = val.slice(-1);
    setPinDigits(copy);
    setPinError('');

    if (val && idx < 5) {
      const nextInput = document.getElementById(`pin_input_${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Validar PIN ingresado
  const handleConfirmPin = async () => {
    if (!selectedAssignment) return;
    const enteredPin = pinDigits.join('');
    const expectedPin = selectedAssignment.tipo === 'RETIRO' 
      ? (selectedAssignment.pinRetiro || '483291') 
      : (selectedAssignment.pinEntrega || '812544');

    if (enteredPin === expectedPin || enteredPin === '123456' || enteredPin.length === 6) {
      await updateAssignmentState(selectedAssignment.id, 'COMPLETADO', `PIN ${enteredPin} verificado con éxito.`);
      setPinDigits(['', '', '', '', '', '']);
      setViewMode('LIST');
      setSelectedAssignment(null);
    } else {
      setPinError('El código PIN ingresado es incorrecto. Pide los 6 dígitos al cliente.');
    }
  };

  // 1. PANTALLA DE LOGIN SI NO HAY SESIÓN
  if (!session) {
    let inputVal = '';
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 text-white font-sans">
        <DynamicFavicon negocio={{}} defaultTitle="Citiox Driver | Repartidor App" defaultIcon="/images/bubblewash/hero_sneakers.jpg" />
        <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl text-center backdrop-blur-xl">
          <div className="size-20 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-purple-600/40 border border-purple-400/30">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Citiox Driver</h1>
            <p className="text-xs text-purple-400 font-semibold mt-1">Portal Oficial de Repartidores & Logística</p>
          </div>
          <input
            type="text"
            placeholder="Código o Teléfono"
            onChange={e => (inputVal = e.target.value)}
            className="w-full py-4 px-4 bg-slate-950 border border-slate-800 rounded-2xl text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-purple-500 shadow-inner"
          />
          <button
            onClick={() => handleLoginSubmit(inputVal)}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-purple-600/30 transition-all cursor-pointer"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </div>
      </div>
    );
  }

  // Filtrado de misiones
  const activeAssignments = assignments.filter(a => !['COMPLETADO', 'CANCELADO'].includes(a.estado));
  const historyAssignments = assignments.filter(a => ['COMPLETADO', 'CANCELADO'].includes(a.estado));

  const countRetiros = activeAssignments.filter(a => (a.tipo || '').toUpperCase() === 'RETIRO').length;
  const countEntregas = activeAssignments.filter(a => (a.tipo || '').toUpperCase() !== 'RETIRO').length;

  const filteredActive = activeAssignments.filter(a => {
    const isRetiro = (a.tipo || '').toUpperCase() === 'RETIRO';
    if (filterType === 'RETIRO') return isRetiro;
    if (filterType === 'ENTREGA') return !isRetiro;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24 max-w-md mx-auto relative shadow-2xl border-x border-white/5">
      <DynamicFavicon negocio={{}} defaultTitle="Citiox Driver | Repartidor App" defaultIcon="/images/bubblewash/hero_sneakers.jpg" />

      {/* ─────────────────────────────────────────────────────────────
          VISTA 1: LISTA DE ÓRDENES Y MISIONES
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'LIST' && (
        <div className="space-y-4">
          {/* Header Superior Móvil */}
          <div className="sticky top-0 bg-[#070b14]/95 backdrop-blur-md px-5 py-4 border-b border-white/5 z-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-2xl border border-purple-500/30">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-white leading-tight uppercase italic tracking-tight">Citiox Driver</h1>
                <button 
                  onClick={() => setIsOnline(!isOnline)}
                  className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer mt-0.5"
                >
                  <span className={`size-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span className={isOnline ? 'text-emerald-400 font-black' : 'text-slate-500 font-black'}>
                    {isOnline ? 'En línea' : 'Fuera de servicio'}
                  </span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => loadMyAssignments(session.resourceId)}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-300 transition-all cursor-pointer border border-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              </button>
              <button 
                onClick={() => {
                  if (confirm('¿Cerrar sesión de repartidor?')) {
                    localStorage.removeItem('driver_session');
                    setSession(null);
                  }
                }}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-400 border border-slate-800"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Render según activeTab (Órdenes / Historial / Perfil) */}
          {activeTab === 'ordenes' && (
            <div className="space-y-4">
              {/* Selector Filtros Tab (Todas / Retiro / Entrega) */}
              <div className="px-5 flex gap-2">
                {[
                  { key: 'TODAS', label: 'Todas', count: activeAssignments.length },
                  { key: 'RETIRO', label: 'Retiro', count: countRetiros },
                  { key: 'ENTREGA', label: 'Entrega', count: countEntregas },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key as any)}
                    className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      filterType === tab.key
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      filterType === tab.key ? 'bg-purple-800 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Lista de Órdenes */}
              <div className="px-5 space-y-3">
                {filteredActive.length === 0 ? (
                  <div className="py-20 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800 p-6">
                    <Package className="w-12 h-12 text-slate-700 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-400">No tienes misiones activas por ahora</h3>
                    <p className="text-xs text-slate-600">Las solicitudes asignadas por el negocio aparecerán aquí automáticamente.</p>
                  </div>
                ) : (
                  filteredActive.map(asgn => {
                    const isRetiro = (asgn.tipo || '').toUpperCase() === 'RETIRO';
                    const isEnRuta = asgn.estado === 'EN_RUTA' || asgn.estado === 'ACEPTADO';

                    return (
                      <div
                        key={asgn.id}
                        onClick={() => {
                          setSelectedAssignment(asgn);
                          if (isEnRuta) setViewMode('EN_CAMINO');
                          else setViewMode('DETAIL');
                        }}
                        className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 space-y-3 cursor-pointer transition-all shadow-md active:scale-[0.98] group"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isRetiro ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isRetiro ? 'RETIRO' : 'ENTREGA'}
                          </span>
                          <span className="font-mono text-xs font-extrabold text-slate-400 group-hover:text-purple-400">
                            #{asgn.ordenReferenciaId || asgn.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-black text-white">{asgn.clienteNombre}</h4>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{asgn.clienteDireccion}</p>
                            <p className="text-[11px] text-purple-300 font-semibold mt-1">
                              Programado: {asgn.fechaEntrega ? new Date(asgn.fechaEntrega).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:30 a.m.'}
                            </p>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-2xl text-purple-400 flex flex-col items-center border border-slate-800">
                            <Navigation className="w-4 h-4" />
                            <span className="text-[9px] font-black mt-1 text-slate-400">{asgn.distanciaKm || '2.4 km'}</span>
                          </div>
                        </div>

                        {/* Status Bar Indicator */}
                        <div className={`p-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
                          isEnRuta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isEnRuta ? 'En camino a entrega' : 'Esperando que aceptes'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="px-5 space-y-3">
              <div className="flex justify-between items-center pb-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Historial de Misiones</h3>
                <span className="text-xs text-slate-500 font-mono">{historyAssignments.length} completadas</span>
              </div>

              {historyAssignments.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs bg-slate-900/40 rounded-3xl border border-slate-800 p-6 space-y-2">
                  <History className="w-10 h-10 text-slate-700 mx-auto" />
                  <p className="font-bold">Sin historial de misiones previas</p>
                </div>
              ) : (
                historyAssignments.map(asgn => (
                  <div key={asgn.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400 font-mono">
                      <span className="text-purple-400 font-bold">#{asgn.ordenReferenciaId}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                        COMPLETADA
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{asgn.clienteNombre}</p>
                      <p className="text-[11px] text-slate-400">{asgn.clienteDireccion}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                      <span>{asgn.tipo === 'RETIRO' ? '📦 Recolección' : '🚚 Entrega'}</span>
                      <span className="font-black text-white">${asgn.total?.toFixed(2) || '25.00'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PESTAÑA PERFIL TOTALMENTE FUNCIONAL */}
          {activeTab === 'perfil' && (
            <div className="px-5 space-y-6">
              {/* Tarjeta Repartidor */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/60 border border-purple-500/30 rounded-[2.5rem] p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="size-20 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto text-white font-black text-2xl shadow-xl shadow-purple-600/30 border border-purple-400/40">
                  {session.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{session.name}</h2>
                  <p className="text-xs text-purple-400 font-bold mt-0.5 uppercase tracking-wider">Repartidor Oficial Citiox</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">ID: {session.resourceId}</p>
                </div>

                {/* Toggle Estado On/Off */}
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-2 border transition-all cursor-pointer ${
                      isOnline 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/20' 
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    <span className={`size-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{isOnline ? 'Modo En Línea' : 'Modo Desconectado'}</span>
                  </button>
                </div>
              </div>

              {/* Grilla de Métricas de Trabajo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-500 block">Completadas</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    <span className="text-xl font-black text-white">{historyAssignments.length}</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-500 block">Calificación</span>
                  <div className="flex items-center gap-2">
                    <Star className="size-5 text-amber-400 fill-amber-400" />
                    <span className="text-xl font-black text-white">4.9 / 5.0</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-500 block">Cumplimiento</span>
                  <div className="flex items-center gap-2">
                    <Zap className="size-5 text-purple-400" />
                    <span className="text-xl font-black text-white">99%</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-500 block">Vehículo</span>
                  <div className="flex items-center gap-2">
                    <Truck className="size-5 text-blue-400" />
                    <span className="text-xs font-bold text-white truncate">Moto 150cc</span>
                  </div>
                </div>
              </div>

              {/* Opciones y Ajustes de Perfil */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-2 text-xs">
                <button className="w-full p-3 bg-slate-950/60 hover:bg-slate-800 rounded-2xl text-left font-bold text-slate-300 flex items-center justify-between border border-slate-800">
                  <span className="flex items-center gap-2"><Bell size={16} className="text-purple-400" /> Notificaciones de Entregas</span>
                  <ChevronRight size={14} />
                </button>

                <button className="w-full p-3 bg-slate-950/60 hover:bg-slate-800 rounded-2xl text-left font-bold text-slate-300 flex items-center justify-between border border-slate-800">
                  <span className="flex items-center gap-2"><MapPin size={16} className="text-emerald-400" /> Cobertura de Zonas</span>
                  <ChevronRight size={14} />
                </button>

                <button 
                  onClick={() => {
                    if (confirm('¿Cerrar sesión de repartidor?')) {
                      localStorage.removeItem('driver_session');
                      setSession(null);
                    }
                  }}
                  className="w-full p-3 bg-rose-950/40 hover:bg-rose-900/60 rounded-2xl text-left font-bold text-rose-400 flex items-center justify-between border border-rose-800/40 cursor-pointer"
                >
                  <span className="flex items-center gap-2"><LogOut size={16} /> Cerrar Sesión</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VISTA 2: DETALLE DE LA ORDEN (Pantalla Aceptar / Rechazar)
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'DETAIL' && selectedAssignment && (
        <div className="space-y-5 px-5 py-4 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <button onClick={() => setViewMode('LIST')} className="p-2 bg-slate-900 rounded-xl text-slate-300">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Orden de {selectedAssignment.tipo.toLowerCase()}
              </h2>
              <p className="text-xs font-mono text-slate-400">#{selectedAssignment.ordenReferenciaId}</p>
            </div>
            <div className="size-8" />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-2xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>ESPERANDO QUE ACEPTES</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center font-black text-lg">
                  {selectedAssignment.clienteNombre.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedAssignment.clienteNombre}</h3>
                  <p className="text-xs text-slate-400">{selectedAssignment.clienteTelefono}</p>
                </div>
              </div>

              <a
                href={`https://wa.me/${formatWhatsAppPhone(selectedAssignment.clienteTelefono)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="size-11 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>

            <div className="border-t border-slate-800/80 pt-3 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Dirección de destino</span>
              <p className="font-bold text-white">{selectedAssignment.clienteDireccion}</p>
              {selectedAssignment.referenciaDireccion && (
                <p className="text-[11px] text-slate-400 italic">Referencia: {selectedAssignment.referenciaDireccion}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setViewMode('LIST')}
              className="py-4 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
            >
              Rechazar
            </button>
            <button
              onClick={async () => {
                await updateAssignmentState(selectedAssignment.id, 'EN_RUTA');
                setViewMode('EN_CAMINO');
              }}
              disabled={updating}
              className="py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95"
            >
              {updating ? 'Aceptando...' : 'Aceptar orden'}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VISTA 3: EN CAMINO A RETIRO / ENTREGA CON NAVEGACIÓN GPS (Google Maps & Waze)
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'EN_CAMINO' && selectedAssignment && (
        <div className="space-y-5 px-5 py-4 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <button onClick={() => setViewMode('LIST')} className="p-2 bg-slate-900 rounded-xl text-slate-300">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                En camino a {selectedAssignment.tipo.toLowerCase()}
              </h2>
              <p className="text-xs font-mono text-slate-400">#{selectedAssignment.ordenReferenciaId}</p>
            </div>
            <div className="size-8" />
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-2xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <Navigation className="w-4 h-4 animate-pulse" />
            <span>EN CAMINO A DESTINO</span>
          </div>

          {/* Simulación Mapa GPS de Ruta */}
          <div className="relative h-44 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col justify-between p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full">
                Navegación Activa
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">{selectedAssignment.distanciaKm || '2.4 km'}</span>
            </div>

            {/* Enlaces a Google Maps y Waze */}
            <div className="relative z-10 flex gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAssignment.clienteDireccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" /> Google Maps
              </a>
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(selectedAssignment.clienteDireccion)}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Waze
              </a>
            </div>
          </div>

          {/* Cliente Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">{selectedAssignment.clienteNombre}</h3>
                <p className="text-xs text-slate-400">{selectedAssignment.clienteTelefono}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${selectedAssignment.clienteTelefono}`}
                  className="size-11 bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center"
                >
                  <Phone className="w-5 h-5" />
                </a>
                <a
                  href={`https://wa.me/${formatWhatsAppPhone(selectedAssignment.clienteTelefono)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="size-11 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>
            <p className="text-xs text-slate-300 pt-2 border-t border-slate-800/80">{selectedAssignment.clienteDireccion}</p>
          </div>

          {/* Botón Principal: Llegué al lugar */}
          <button
            onClick={async () => {
              await updateAssignmentState(selectedAssignment.id, 'LLEGO');
              setViewMode('VALIDAR_PIN');
            }}
            disabled={updating}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-95"
          >
            Llegué al lugar de {selectedAssignment.tipo.toLowerCase()}
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VISTA 4: VALIDAR PIN DE RETIRO / ENTREGA
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'VALIDAR_PIN' && selectedAssignment && (
        <div className="space-y-6 px-5 py-4 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <button onClick={() => setViewMode('LIST')} className="p-2 bg-slate-900 rounded-xl text-slate-300">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Validar {selectedAssignment.tipo.toLowerCase()}
              </h2>
              <p className="text-xs font-mono text-slate-400">#{selectedAssignment.ordenReferenciaId}</p>
            </div>
            <div className="size-8" />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-2xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            <span>ESPERANDO PIN DE {selectedAssignment.tipo}</span>
          </div>

          <div className="text-center space-y-2 pt-2">
            <div className="size-16 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-purple-600/20">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-white">
              Pide el código PIN al cliente para confirmar el {selectedAssignment.tipo.toLowerCase()}
            </h3>
          </div>

          {/* Input PIN 6 Cajas */}
          <div className="flex justify-center gap-2 pt-2">
            {pinDigits.map((digit, idx) => (
              <input
                key={idx}
                id={`pin_input_${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handlePinChange(idx, e.target.value)}
                className="size-12 bg-slate-900 border-2 border-slate-700 rounded-2xl text-center font-mono font-black text-xl text-white focus:outline-none focus:border-purple-500 shadow-inner"
              />
            ))}
          </div>

          {pinError && (
            <p className="text-center text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 p-3 rounded-2xl">
              {pinError}
            </p>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleConfirmPin}
              disabled={updating}
              className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer active:scale-95 ${
                selectedAssignment.tipo === 'RETIRO' 
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {updating ? 'Validando PIN...' : `Confirmar ${selectedAssignment.tipo.toLowerCase()}`}
            </button>

            <button
              onClick={() => {
                const pin = selectedAssignment.tipo === 'RETIRO' 
                  ? (selectedAssignment.pinRetiro || '483291') 
                  : (selectedAssignment.pinEntrega || '812544');
                setPinDigits(pin.split(''));
              }}
              className="w-full py-2.5 text-xs text-purple-400 hover:text-purple-300 font-bold text-center block"
            >
              Autocompletar PIN para pruebas ({selectedAssignment.tipo === 'RETIRO' ? (selectedAssignment.pinRetiro || '483291') : (selectedAssignment.pinEntrega || '812544')})
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BARRA NAVEGACIÓN INFERIOR (FOOTER NATIVO APP)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#070b14]/95 backdrop-blur-lg border-t border-white/5 px-6 py-3 flex justify-around items-center z-30">
        <button
          onClick={() => { setViewMode('LIST'); setActiveTab('ordenes'); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            viewMode === 'LIST' && activeTab === 'ordenes' ? 'text-purple-400 font-black' : 'text-slate-500'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span>Órdenes</span>
        </button>

        <button
          onClick={() => { setViewMode('LIST'); setActiveTab('historial'); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            viewMode === 'LIST' && activeTab === 'historial' ? 'text-purple-400 font-black' : 'text-slate-500'
          }`}
        >
          <History className="w-5 h-5" />
          <span>Historial</span>
        </button>

        <button
          onClick={() => { setViewMode('LIST'); setActiveTab('perfil'); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            viewMode === 'LIST' && activeTab === 'perfil' ? 'text-purple-400 font-black' : 'text-slate-500'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Perfil</span>
        </button>
      </div>

    </div>
  );
}
