'use client';

import { useState, useEffect } from 'react';
import { 
  Footprints, 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Camera, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  X, 
  Loader2, 
  ChevronRight, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  Eye, 
  CreditCard, 
  Image as ImageIcon,
  History,
  TrendingUp,
  Wind,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface ShoeCareAdminProps {
  negocio: any;
}

const ESTADOS_SECUENCIA = [
  { id: 'PENDIENTE_RETIRO', label: 'Pendiente Retiro', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'RETIRADO', label: 'Retirado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'RECIBIDO', label: 'Recibido en Local', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { id: 'INSPECCIONADO', label: 'Inspeccionado & Cotizado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'EN_LAVADO', label: 'En Lavado', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'EN_SECADO', label: 'En Secado', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { id: 'EN_ACABADOS', label: 'En Acabados', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'LISTO_PARA_ENTREGA', label: 'Listo para Entrega', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'EN_RUTA', label: 'En Ruta de Despacho', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'ENTREGADO', label: 'Entregado & Cerrado', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  { id: 'CANCELADO', label: 'Cancelado', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
];

export default function ShoeCareAdminDashboard({ negocio }: ShoeCareAdminProps) {
  const negocioId = negocio?.id || 'demo-canchas';

  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showNewLocalModal, setShowNewLocalModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<any>(null);
  const [showPhotoModal, setShowPhotoModal] = useState<any>(null);

  // Estados de Formulario Nueva Orden Local
  const [submitting, setSubmitting] = useState(false);
  const [localForm, setLocalForm] = useState({
    nombreCliente: '',
    telefonoCliente: '',
    cantidadPares: '1',
    notas: '',
    fotosRecepcion: [] as string[]
  });
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');

  // Estado de Formulario Inspección
  const [inspectForm, setInspectForm] = useState({
    nivelSuciedad: 'MEDIO',
    precioBase: 6.00,
    serviciosAdicionales: [] as Array<{ nombre: string; precio: number }>,
    costoRetiro: 1.50,
    costoEntrega: 1.50,
    fechaHoraEntregaEstimada: 'Mañana a las 5:00 PM',
    notasInspeccion: ''
  });

  // Estado de Formulario Pago
  const [payForm, setPayForm] = useState({
    metodoPago: 'EFECTIVO',
    monto: 0
  });

  // Historial de cliente seleccionado
  const [clientHistoryData, setClientHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [localCountryCode, setLocalCountryCode] = useState('+593');
  const [clientesList, setClientesList] = useState<any[]>([]);

  const COUNTRY_CODES = [
    { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+57', flag: '🇨🇴', name: 'Colombia' },
    { code: '+51', flag: '🇵🇪', name: 'Perú' },
    { code: '+52', flag: '🇲🇽', name: 'México' },
    { code: '+1', flag: '🇺🇸', name: 'EE.UU.' },
    { code: '+34', flag: '🇪🇸', name: 'España' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: '+56', flag: '🇨🇱', name: 'Chile' },
  ];

  const fetchOrders = async () => {
    try {
      const [resOrd, resCli] = await Promise.all([
        fetch(`/api/shoe-care/orders?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/clients?negocioId=${negocioId}`)
      ]);
      if (resOrd.ok) {
        const data = await resOrd.json();
        setOrdenes(data);
      }
      if (resCli.ok) {
        const clis = await resCli.json();
        setClientesList(clis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [negocioId]);

  // Crear Orden Local
  const handleCreateLocalOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localForm.nombreCliente || !localForm.telefonoCliente) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          modo: 'LOCAL',
          ...localForm
        })
      });

      if (res.ok) {
        setShowNewLocalModal(false);
        setLocalForm({ nombreCliente: '', telefonoCliente: '', cantidadPares: '1', notas: '', fotosRecepcion: [] });
        fetchOrders();
      } else {
        alert('Error al crear la orden');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar Inspección
  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInspectModal) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/shoe-care/orders/${showInspectModal.id}/inspect`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectForm)
      });

      if (res.ok) {
        setShowInspectModal(null);
        fetchOrders();
      } else {
        alert('Error al guardar la inspección');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar Estado
  const handleUpdateStatus = async (orderId: string, newStatus: string, extraData: any = {}) => {
    try {
      const res = await fetch(`/api/shoe-care/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus, ...extraData })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Guardar Pago
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/shoe-care/orders/${showPayModal.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payForm)
      });

      if (res.ok) {
        setShowPayModal(null);
        fetchOrders();
      } else {
        alert('Error registrando pago');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir Historial de Cliente
  const openClientHistory = async (phone: string) => {
    setLoadingHistory(true);
    setShowHistoryModal({ phone });
    try {
      const res = await fetch(`/api/shoe-care/clients/${phone}/history?negocioId=${negocioId}`);
      if (res.ok) {
        const data = await res.json();
        setClientHistoryData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cálculos de Indicadores KPI
  const ordenesPendientes = ordenes.filter(o => o.estado === 'PENDIENTE_RETIRO' || o.estado === 'RECIBIDO').length;
  const ordenesEnProceso = ordenes.filter(o => ['INSPECCIONADO', 'EN_LAVADO', 'EN_SECADO', 'EN_ACABADOS'].includes(o.estado)).length;
  const ordenesListas = ordenes.filter(o => o.estado === 'LISTO_PARA_ENTREGA' || o.estado === 'EN_RUTA').length;
  const entregadasHoy = ordenes.filter(o => o.estado === 'ENTREGADO').length;
  const ingresosDia = ordenes.filter(o => o.estado === 'ENTREGADO').reduce((sum, o) => sum + o.total, 0);
  const ticketPromedio = ordenes.length > 0 ? (ordenes.reduce((sum, o) => sum + o.total, 0) / ordenes.length) : 0;

  // Filtrado de lista
  const filteredOrders = ordenes.filter(o => {
    const matchStatus = filterStatus === 'TODOS' || o.estado === filterStatus;
    const matchSearch = o.nombreCliente.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        o.telefonoCliente.includes(searchQuery) || 
                        o.numeroPedido.toString().includes(searchQuery);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
            <Footprints size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">
              Shoe Care Operations Dashboard
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Gestión del ciclo de vida físico: RECIBIR ➔ PROCESAR ➔ ENTREGAR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewLocalModal(true)}
            className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={3} />
            Nueva Orden en Local
          </button>
        </div>
      </div>

      {/* Indicadores KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Pendientes Retiro / Local', val: ordenesPendientes, color: 'text-amber-400', icon: Clock },
          { label: 'En Proceso Lavado', val: ordenesEnProceso, color: 'text-indigo-400', icon: RefreshCw },
          { label: 'Listas para Entrega', val: ordenesListas, color: 'text-emerald-400', icon: CheckCircle2 },
          { label: 'Entregadas Hoy', val: entregadasHoy, color: 'text-cyan-400', icon: ShoppingBag },
          { label: 'Ingresos del Día', val: `$${ingresosDia.toFixed(2)}`, color: 'text-emerald-400', icon: DollarSign },
          { label: 'Ticket Promedio', val: `$${ticketPromedio.toFixed(2)}`, color: 'text-purple-400', icon: TrendingUp }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">{kpi.label}</span>
                <Icon size={18} />
              </div>
              <span className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</span>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <span className="text-[10px] font-black uppercase text-slate-400 px-2">Estado:</span>
          <button
            onClick={() => setFilterStatus('TODOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === 'TODOS' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-950 text-slate-400'}`}
          >
            Todos ({ordenes.length})
          </button>
          {ESTADOS_SECUENCIA.slice(0, 7).map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === st.id ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-950 text-slate-400'}`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por cliente, teléfono o #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Orders List / Kanban */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <Footprints size={40} className="mx-auto text-slate-600" />
          <h3 className="text-lg font-black text-white uppercase">No hay órdenes registradas</h3>
          <p className="text-xs text-slate-400">Usa el botón "+ Nueva Orden en Local" o simula una solicitud desde la Landing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(ord => {
            const stObj = ESTADOS_SECUENCIA.find(s => s.id === ord.estado) || ESTADOS_SECUENCIA[0];
            const extra = (ord.extraInfo as any) || {};

            return (
              <div key={ord.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-4">
                  {/* Top order info */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      #{ord.numeroPedido}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${stObj.color}`}>
                      {stObj.label}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-white">{ord.nombreCliente}</h3>
                      <button 
                        onClick={() => openClientHistory(ord.telefonoCliente)}
                        className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <History size={12} /> Historial
                      </button>
                    </div>
                    <p className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Phone size={12} /> {ord.telefonoCliente}
                    </p>
                    {ord.direccionCliente && (
                      <div className="pt-1 space-y-1">
                        <p className="text-[11px] text-slate-300 flex items-center gap-1">
                          <MapPin size={12} className="text-emerald-400 shrink-0" /> {ord.direccionCliente}
                        </p>
                        {ord.latitud && ord.longitud && (
                          <a 
                            href={`https://www.google.com/maps?q=${ord.latitud},${ord.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20"
                          >
                            📍 Ver en Mapa GPS ({ord.latitud.toFixed(4)}, {ord.longitud.toFixed(4)})
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Details Badge Box */}
                  <div className="p-4 bg-slate-950 rounded-2xl space-y-2 border border-slate-800/80 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Modo de Ingreso:</span>
                      <span className="font-bold text-white">{extra.modoIngreso || ord.tipoEntrega}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pares de Calzado:</span>
                      <span className="font-bold text-white">{extra.cantidadPares || 1} par(es)</span>
                    </div>
                    {extra.nivelSuciedad && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nivel de Suciedad:</span>
                        <span className="font-bold text-amber-400">{extra.nivelSuciedad}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Monto Total:</span>
                      <span className="font-black text-emerald-400 text-sm">${ord.total?.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Photos indicator */}
                  {(extra.fotosRecepcion?.length > 0 || extra.fotosEntrega?.length > 0) && (
                    <div className="flex items-center gap-2 pt-1">
                      <ImageIcon size={14} className="text-slate-400" />
                      <span className="text-[11px] text-slate-400 font-bold">
                        {(extra.fotosRecepcion?.length || 0) + (extra.fotosEntrega?.length || 0)} fotografía(s) adjunta(s)
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions per state */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  {ord.estado === 'PENDIENTE_RETIRO' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'RETIRADO')}
                      className="w-full py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Truck size={16} /> Confirmar Retirado
                    </button>
                  )}

                  {(ord.estado === 'RETIRADO' || ord.estado === 'RECIBIDO') && (
                    <button
                      onClick={() => {
                        setShowInspectModal(ord);
                        setInspectForm({
                          nivelSuciedad: 'MEDIO',
                          precioBase: 6.00,
                          serviciosAdicionales: [],
                          costoRetiro: ord.tipoEntrega === 'DOMICILIO' ? 1.50 : 0,
                          costoEntrega: ord.tipoEntrega === 'DOMICILIO' ? 1.50 : 0,
                          fechaHoraEntregaEstimada: 'Mañana a las 5:00 PM',
                          notasInspeccion: ''
                        });
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Search size={16} /> Realizar Inspección & Cotizar
                    </button>
                  )}

                  {ord.estado === 'INSPECCIONADO' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'EN_LAVADO')}
                      className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={16} /> Pasar a En Lavado
                    </button>
                  )}

                  {ord.estado === 'EN_LAVADO' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'EN_SECADO')}
                      className="w-full py-3 bg-violet-500 hover:bg-violet-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Wind size={16} /> Pasar a En Secado
                    </button>
                  )}

                  {ord.estado === 'EN_SECADO' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'EN_ACABADOS')}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} /> Pasar a En Acabados
                    </button>
                  )}

                  {ord.estado === 'EN_ACABADOS' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'LISTO_PARA_ENTREGA')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Marcar Listo para Entrega
                    </button>
                  )}

                  {ord.estado === 'LISTO_PARA_ENTREGA' && (
                    <div className="flex gap-2">
                      {ord.tipoEntrega === 'DOMICILIO' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'EN_RUTA')}
                          className="w-1/2 py-3 bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl cursor-pointer"
                        >
                          En Despacho
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowPayModal(ord);
                          setPayForm({ metodoPago: 'EFECTIVO', monto: ord.total });
                        }}
                        className={`${ord.tipoEntrega === 'DOMICILIO' ? 'w-1/2' : 'w-full'} py-3 bg-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl cursor-pointer`}
                      >
                        Cobrar & Entregar
                      </button>
                    </div>
                  )}

                  {ord.estado === 'EN_RUTA' && (
                    <button
                      onClick={() => {
                        setShowPayModal(ord);
                        setPayForm({ metodoPago: 'EFECTIVO', monto: ord.total });
                      }}
                      className="w-full py-3 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CreditCard size={16} /> Confirmar Pago & Entrega
                    </button>
                  )}

                  {ord.estado === 'ENTREGADO' && (
                    <div className="text-center py-2 bg-slate-950 text-slate-400 text-[11px] font-bold rounded-xl border border-slate-800">
                      ✓ Orden Completada & Cerrada
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Nueva Orden Local (Flujo 1) */}
      {showNewLocalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                <Plus className="text-emerald-400" size={20} />
                Nueva Orden en Local (Flujo 1)
              </h2>
              <button onClick={() => setShowNewLocalModal(false)} className="text-slate-400 hover:text-white p-2">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLocalOrder} className="space-y-4">
              {clientesList && clientesList.length > 0 && (
                <div className="space-y-1 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/40">
                  <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span>👤 Cargar Cliente Registrado</span>
                    <span className="text-[9px] text-slate-400 font-normal">({clientesList.length} disponibles)</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = clientesList.find(c => (c.id && c.id === e.target.value) || (c.telefono && c.telefono === e.target.value));
                      if (selected) {
                        setLocalForm(prev => ({
                          ...prev,
                          nombreCliente: selected.nombre || prev.nombreCliente,
                          telefonoCliente: selected.telefono || prev.telefonoCliente
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500 shadow-inner"
                  >
                    <option value="">-- Seleccionar cliente de la lista --</option>
                    {clientesList.map((c, i) => (
                      <option key={c.id || i} value={c.id || c.telefono}>
                        {c.nombre} ({c.telefono})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nombre del Cliente *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Carlos Mendoza"
                  value={localForm.nombreCliente}
                  onChange={e => setLocalForm({ ...localForm, nombreCliente: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Teléfono WhatsApp *</label>
                  <div className="flex gap-1.5">
                    <select
                      value={localCountryCode}
                      onChange={(e) => setLocalCountryCode(e.target.value)}
                      className="px-2 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500 shrink-0"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input 
                      type="tel"
                      required
                      placeholder="Ej: 0987654321"
                      value={localForm.telefonoCliente}
                      onChange={e => setLocalForm({ ...localForm, telefonoCliente: e.target.value })}
                      className="flex-1 px-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Cantidad de Pares *</label>
                  <select
                    value={localForm.cantidadPares}
                    onChange={e => setLocalForm({ ...localForm, cantidadPares: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    <option value="1">1 Par</option>
                    <option value="2">2 Pares</option>
                    <option value="3">3 Pares</option>
                    <option value="4">4 Pares</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Notas de Recepción</label>
                <textarea 
                  rows={2}
                  placeholder="Detalles sobre el calzado, raspones previos o pedidos..."
                  value={localForm.notas}
                  onChange={e => setLocalForm({ ...localForm, notas: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Multiple Photo Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Fotografías de Recepción</label>
                <div className="flex gap-2">
                  <input 
                    type="url"
                    placeholder="https:// URL de imagen o captura..."
                    value={tempPhotoUrl}
                    onChange={e => setTempPhotoUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tempPhotoUrl.trim()) {
                        setLocalForm({ ...localForm, fotosRecepcion: [...localForm.fotosRecepcion, tempPhotoUrl.trim()] });
                        setTempPhotoUrl('');
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl"
                  >
                    + Adjuntar
                  </button>
                </div>
                {localForm.fotosRecepcion.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {localForm.fotosRecepcion.map((url, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded text-emerald-400 border border-slate-800">
                        Foto #{idx + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewLocalModal(false)}
                  className="w-1/3 py-3 bg-slate-800 text-white font-black text-xs uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-3 bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Crear Orden (RECIBIDO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Inspección & Cotización */}
      {showInspectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowInspectModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            <form onSubmit={handleSaveInspection} className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                  <Search className="text-emerald-400" size={22} />
                  Inspección de Calzado #{showInspectModal.numeroPedido}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Evalúa el estado físico y calcula el precio final desglosado.</p>
              </div>

              {/* Dirt level selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nivel de Suciedad *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'POCO', name: 'Poco ($4)', price: 4.00 },
                    { id: 'MEDIO', name: 'Medio ($6)', price: 6.00 },
                    { id: 'ALTO', name: 'Alto ($8)', price: 8.00 },
                    { id: 'RESTAURACION', name: 'Restauración ($10)', price: 10.00 }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setInspectForm({ ...inspectForm, nivelSuciedad: opt.id, precioBase: opt.price })}
                      className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                        inspectForm.nivelSuciedad === opt.id 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Addons */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Servicios Adicionales</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { nombre: 'Impermeabilización', precio: 2.00 },
                    { nombre: 'Cambio de Cordones', precio: 2.50 },
                    { nombre: 'Blanqueamiento Suela', precio: 3.00 },
                    { nombre: 'Pegado / Costura', precio: 3.50 }
                  ].map(item => {
                    const isSelected = inspectForm.serviciosAdicionales.some(s => s.nombre === item.nombre);
                    return (
                      <button
                        key={item.nombre}
                        type="button"
                        onClick={() => {
                          const exists = inspectForm.serviciosAdicionales.some(s => s.nombre === item.nombre);
                          const updated = exists 
                            ? inspectForm.serviciosAdicionales.filter(s => s.nombre !== item.nombre)
                            : [...inspectForm.serviciosAdicionales, item];
                          setInspectForm({ ...inspectForm, serviciosAdicionales: updated });
                        }}
                        className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                          isSelected ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        + {item.nombre} (+${item.precio})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estimated Delivery Date */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Fecha y Hora Estimada de Entrega</label>
                <input 
                  type="text"
                  placeholder="Ej: Martes a las 5:00 PM"
                  value={inspectForm.fechaHoraEntregaEstimada}
                  onChange={e => setInspectForm({ ...inspectForm, fechaHoraEntregaEstimada: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none"
                />
              </div>

              {/* Breakdown Preview */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <span className="font-black uppercase text-[10px] text-slate-400 block">Desglose de Cotización:</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Precio Base ({inspectForm.nivelSuciedad}):</span>
                  <span className="font-bold text-white">${inspectForm.precioBase.toFixed(2)}</span>
                </div>
                {inspectForm.serviciosAdicionales.map(s => (
                  <div key={s.nombre} className="flex justify-between">
                    <span className="text-slate-400">+ {s.nombre}:</span>
                    <span className="font-bold text-white">${s.precio.toFixed(2)}</span>
                  </div>
                ))}
                {inspectForm.costoRetiro > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">+ Costo Retiro:</span>
                    <span className="font-bold text-white">${inspectForm.costoRetiro.toFixed(2)}</span>
                  </div>
                )}
                {inspectForm.costoEntrega > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">+ Costo Entrega:</span>
                    <span className="font-bold text-white">${inspectForm.costoEntrega.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="font-black text-white uppercase">TOTAL DEFINITIVO:</span>
                  <span className="font-black text-emerald-400 text-base">
                    ${(
                      inspectForm.precioBase + 
                      inspectForm.serviciosAdicionales.reduce((a, b) => a + b.precio, 0) + 
                      inspectForm.costoRetiro + 
                      inspectForm.costoEntrega
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="animate-spin" size={16} />}
                Confirmar Cotización & Notificar WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Cobro y Cierre */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <button onClick={() => setShowPayModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                  <CreditCard className="text-emerald-400" size={22} />
                  Cobrar & Finalizar Orden #{showPayModal.numeroPedido}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Registra el pago y entrega el calzado al cliente.</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Total a Cobrar:</span>
                <div className="text-3xl font-black text-emerald-400">${showPayModal.total?.toFixed(2)}</div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MERCADO_PAGO'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayForm({ ...payForm, metodoPago: m })}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        payForm.metodoPago === m ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="animate-spin" size={16} />}
                Registrar Pago & Cerrar Orden
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Historial de Cliente */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowHistoryModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white">
              <X size={20} />
            </button>

            <div>
              <h2 className="text-xl font-black text-white uppercase italic flex items-center gap-2">
                <History className="text-emerald-400" size={22} />
                Historial del Cliente ({showHistoryModal.phone})
              </h2>
              <p className="text-xs text-slate-400 mt-1">Seguimiento de órdenes anteriores, frecuencia y fotografías acumuladas.</p>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-emerald-500" size={30} />
              </div>
            ) : clientHistoryData && (
              <div className="space-y-6">
                {/* Client metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Órdenes Totales</span>
                    <span className="text-xl font-black text-white">{clientHistoryData.metrics.totalOrders}</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Completadas</span>
                    <span className="text-xl font-black text-emerald-400">{clientHistoryData.metrics.completedOrders}</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-black block">Monto Invertido</span>
                    <span className="text-xl font-black text-purple-400">${clientHistoryData.metrics.totalSpent.toFixed(2)}</span>
                  </div>
                </div>

                {/* Orders Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Historial de Órdenes</h4>
                  {clientHistoryData.ordenes.map((o: any) => (
                    <div key={o.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-emerald-400">#{o.numeroPedido}</span>
                        <span className="text-slate-400 ml-2">{new Date(o.createdAt).toLocaleDateString()}</span>
                        <p className="text-slate-300 font-bold mt-0.5">{o.tipoEntrega} — ${o.total.toFixed(2)}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">
                        {o.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
