'use client';

import React, { useState, useEffect } from 'react';
import {
  Layout, Plus, QrCode, Printer, CheckCircle2, XCircle, Bell, Clock, MapPin,
  Utensils, Settings, RefreshCw, AlertCircle, Trash2, Edit3, ShieldCheck, Check, ChevronRight
} from 'lucide-react';
import TableQRPrintModal from '@/components/admin/mesas/TableQRPrintModal';

interface RestaurantTableItem {
  id: string;
  nombre: string;
  numero: number | null;
  token: string;
  activa: boolean;
  permitePedidos: boolean;
  estado: string;
  _count?: {
    orderRequests: number;
    waiterCalls: number;
  };
}

interface TableOrderRequestItem {
  id: string;
  negocioId: string;
  tableId: string;
  tableSessionId: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  items: any[];
  subtotal: number;
  total: number;
  notas: string | null;
  estado: string;
  locationValidated: boolean;
  distanceFromBusiness: number | null;
  createdAt: string;
  table?: {
    id: string;
    nombre: string;
    numero: number | null;
  };
}

interface WaiterCallItem {
  id: string;
  tableId: string;
  tableSessionId: string;
  estado: string;
  notas: string | null;
  createdAt: string;
  table?: {
    id: string;
    nombre: string;
  };
}

export default function AdminMesasPage() {
  const [mounted, setMounted] = useState(false);
  const [originUrl, setOriginUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'mesas' | 'solicitudes' | 'llamadas' | 'configuracion'>('mesas');
  const [loading, setLoading] = useState(true);
  const [mesas, setMesas] = useState<RestaurantTableItem[]>([]);
  const [requests, setRequests] = useState<TableOrderRequestItem[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallItem[]>([]);
  const [businessName, setBusinessName] = useState('Restaurante');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [slug, setSlug] = useState('tienda');

  // Configuración de mesa
  const [config, setConfig] = useState({
    mesaPedidosHabilitados: true,
    mesaRadioPermitido: 100,
    mesaLlamarMeseroHabilitado: true,
    mesaCooldownLlamada: 120,
    latitudNegocio: -0.180653,
    longitudNegocio: -78.467838
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTableItem | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableNumberInput, setTableNumberInput] = useState('');
  const [tableAllowOrders, setTableAllowOrders] = useState(true);
  const [savingTable, setSavingTable] = useState(false);

  // Modal de Impresión
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedTableForPrint, setSelectedTableForPrint] = useState<string | null>(null);

  // Procesando confirmación/rechazo
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [resMesas, resReq, resConfig, resNegocio] = await Promise.all([
        fetch('/api/admin/mesas'),
        fetch('/api/admin/mesas/requests'),
        fetch('/api/admin/mesas/config'),
        fetch('/api/negocio')
      ]);

      if (resMesas.ok) {
        const d = await resMesas.json();
        setMesas(d.mesas || []);
      }
      if (resReq.ok) {
        const d = await resReq.json();
        setRequests(d.orderRequests || []);
        setWaiterCalls(d.waiterCalls || []);
      }
      if (resConfig.ok) {
        const d = await resConfig.json();
        if (d.config) setConfig(d.config);
      }
      if (resNegocio.ok) {
        const d = await resNegocio.json();
        if (d.nombre) setBusinessName(d.nombre);
        if (d.logoUrl) setBusinessLogo(d.logoUrl);
        if (d.slug) setSlug(d.slug);
      }
    } catch (e) {
      console.error('Error cargando datos de mesas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
    fetchAllData();
    const interval = setInterval(fetchAllData, 12000); // Polling cada 12s para nuevas solicitudes
    return () => clearInterval(interval);
  }, []);

  // Crear / Editar Mesa
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNameInput.trim()) return;

    setSavingTable(true);
    try {
      if (editingTable) {
        const res = await fetch(`/api/admin/mesas/${editingTable.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: tableNameInput.trim(),
            numero: tableNumberInput ? parseInt(tableNumberInput, 10) : null,
            permitePedidos: tableAllowOrders
          })
        });
        if (res.ok) {
          await fetchAllData();
          setIsCreateModalOpen(false);
          setEditingTable(null);
        }
      } else {
        const res = await fetch('/api/admin/mesas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: tableNameInput.trim(),
            numero: tableNumberInput ? parseInt(tableNumberInput, 10) : null,
            permitePedidos: tableAllowOrders
          })
        });
        if (res.ok) {
          await fetchAllData();
          setIsCreateModalOpen(false);
        }
      }
    } catch (err) {
      alert('Error al guardar la mesa.');
    } finally {
      setSavingTable(false);
    }
  };

  // Toggle Activa / Inactiva
  const handleToggleActive = async (table: RestaurantTableItem) => {
    try {
      await fetch(`/api/admin/mesas/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: !table.activa })
      });
      await fetchAllData();
    } catch (_) {}
  };

  // Eliminar Mesa
  const handleDeleteTable = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta mesa? Los registros históricos se conservarán.')) return;
    try {
      await fetch(`/api/admin/mesas/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (_) {}
  };

  // Confirmar Solicitud de Pedido (Pase a Cocina / Pedido Definitivo)
  const handleConfirmRequest = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/mesas/requests/${id}/confirm`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert('✅ ¡Pedido de mesa confirmado con éxito! Fue enviado a cocina/KDS.');
        await fetchAllData();
      } else {
        alert(`❌ Error: ${data.error || 'No se pudo confirmar el pedido'}`);
      }
    } catch (err) {
      alert('Error al confirmar el pedido de mesa.');
    } finally {
      setProcessingId(null);
    }
  };

  // Rechazar Solicitud de Pedido
  const handleRejectRequest = async (id: string) => {
    const motivo = prompt('Motivo del rechazo (opcional):', 'Mesa fuera del local o solicitud cancelada');
    if (motivo === null) return;

    setProcessingId(id);
    try {
      await fetch(`/api/admin/mesas/requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      await fetchAllData();
    } catch (_) {} finally {
      setProcessingId(null);
    }
  };

  // Resolver Llamada de Mesero
  const handleResolveWaiterCall = async (id: string) => {
    try {
      await fetch(`/api/admin/mesas/waiter-call/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      await fetchAllData();
    } catch (_) {}
  };

  // Guardar Configuración
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await fetch('/api/admin/mesas/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('¡Configuración de mesas guardada con éxito!');
      await fetchAllData();
    } catch (_) {
      alert('Error al guardar la configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  const pendingRequestsCount = requests.filter(r => r.estado === 'PENDING_ADMIN_CONFIRMATION').length;
  const pendingCallsCount = waiterCalls.filter(w => w.estado === 'PENDING' || w.estado === 'ACKNOWLEDGED').length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 pb-36">

      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-md">
            <Layout className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Mesas & Códigos QR</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Administra tus mesas físicas, QR permanentes y solicitudes de pedidos con geolocalización
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTableForPrint(null);
              setIsPrintModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir QRs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTable(null);
              setTableNameInput('');
              setTableNumberInput('');
              setTableAllowOrders(true);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Mesa</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE INDICADORES EN TIEMPO REAL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Mesas</span>
            <span className="text-2xl font-black text-slate-900">{mesas.length}</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Layout className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Mesas Activas</span>
            <span className="text-2xl font-black text-emerald-600">{mesas.filter(m => m.activa).length}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className={`bg-white p-4 rounded-3xl border shadow-xs flex items-center justify-between transition-colors ${pendingRequestsCount > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Solicitudes Pendientes</span>
            <span className={`text-2xl font-black ${pendingRequestsCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-900'}`}>{pendingRequestsCount}</span>
          </div>
          <div className={`p-3 rounded-2xl ${pendingRequestsCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        <div className={`bg-white p-4 rounded-3xl border shadow-xs flex items-center justify-between transition-colors ${pendingCallsCount > 0 ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'}`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Llamadas de Mesero</span>
            <span className={`text-2xl font-black ${pendingCallsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>{pendingCallsCount}</span>
          </div>
          <div className={`p-3 rounded-2xl ${pendingCallsCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN POR PESTAÑAS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('mesas')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'mesas' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Mesas ({mesas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 relative ${
            activeTab === 'solicitudes' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Solicitudes de Pedido</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('llamadas')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 relative ${
            activeTab === 'llamadas' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Llamadas Mesero</span>
          {pendingCallsCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full">
              {pendingCallsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('configuracion')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'configuracion' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>
      </div>

      {/* PESTAÑA 1: LISTADO Y TARJETAS DE MESAS */}
      {activeTab === 'mesas' && (
        <div className="space-y-6">
          {mesas.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Layout className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-800 uppercase">Sin mesas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                Crea tu primera mesa para generar su código QR permanente e instalarlo físicamente.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingTable(null);
                  setTableNameInput('');
                  setTableNumberInput('');
                  setTableAllowOrders(true);
                  setIsCreateModalOpen(true);
                }}
                className="px-5 py-2.5 bg-slate-900 text-white font-black text-xs uppercase rounded-xl shadow-md cursor-pointer"
              >
                + Crear Primera Mesa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {mesas.map(table => {
                const tokenStr = table?.token || '';
                const baseHost = originUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://citiox.com');
                const tableUrl = `${baseHost}/${slug}/mesa/${tokenStr}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableUrl)}`;

                return (
                  <div
                    key={table.id}
                    className={`bg-white rounded-3xl p-5 border shadow-sm transition-all space-y-4 flex flex-col justify-between ${
                      !table.activa ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{table.nombre}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          table.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {table.activa ? '🟢 Activa' : '⚪ Inactiva'}
                        </span>
                      </div>

                      {/* Vista previa QR */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                        <img src={qrUrl} alt={table.nombre} className="w-28 h-28 object-contain rounded-lg" />
                        <span className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-full">
                          {tokenStr ? `${tokenStr.slice(0, 18)}...` : ''}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600 font-medium">
                        <p className="flex items-center gap-1.5">
                          <span>Pedidos desde mesa:</span>
                          <span className={table.permitePedidos ? 'font-black text-emerald-600' : 'font-black text-slate-400'}>
                            {table.permitePedidos ? '✓ Habilitados' : '✕ Ver menú solo'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTableForPrint(table.id);
                          setIsPrintModalOpen(true);
                        }}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingTable(table);
                          setTableNameInput(table.nombre);
                          setTableNumberInput(table.numero ? String(table.numero) : '');
                          setTableAllowOrders(table.permitePedidos);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                        title="Editar mesa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(table)}
                        className={`p-2 rounded-xl cursor-pointer ${table.activa ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={table.activa ? 'Desactivar mesa' : 'Activar mesa'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTable(table.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                        title="Eliminar mesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: SOLICITUDES DE PEDIDOS DESDE MESA */}
      {activeTab === 'solicitudes' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Aprobación en 2 Pasos para Pedidos de Mesa</p>
              <p className="text-amber-800 font-medium">
                Las solicitudes creadas por clientes desde mesa requieren confirmación administrativa. Al presionar **[CONFIRMAR PEDIDO]**, se creará la orden oficial en el sistema, se descontará stock y pasará a cocina/KDS.
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
              <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black uppercase text-slate-800">Sin solicitudes de mesa</h3>
              <p className="text-xs text-slate-400">Las nuevas ordenes escaneadas desde las mesas aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(req => {
                const isPending = req.estado === 'PENDING_ADMIN_CONFIRMATION';
                const isConfirmed = req.estado === 'CONFIRMED';
                const isRejected = req.estado === 'REJECTED';

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 transition-all ${
                      isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-xl uppercase">
                            📍 {req.table?.nombre || 'Mesa'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isPending ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            isConfirmed ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                          }`}>
                            {isPending ? '🔴 Pendiente Confirmación' : isConfirmed ? '🟢 Confirmado & Enviado a Cocina' : '⚪ Rechazado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Cliente: <span className="font-bold text-slate-900">{req.nombreCliente || 'Anónimo'}</span> • {new Date(req.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Insignia de Validación de Geolocalización */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>📍 Ubicación Verificada ({req.distanceFromBusiness || 0}m del restaurante)</span>
                      </div>
                    </div>

                    {/* Lista de Items */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Productos Solicitados</span>
                      <div className="space-y-1.5 divide-y divide-slate-200/60">
                        {Array.isArray(req.items) && req.items.map((item: any, idx: number) => (
                          <div key={idx} className="pt-1.5 flex items-center justify-between text-xs font-bold text-slate-900">
                            <div>
                              <span>{item.cantidad}x {item.nombre || item.nombreProducto}</span>
                              {item.varianteNombre && (
                                <span className="text-[11px] text-slate-500 font-normal ml-1">({item.varianteNombre})</span>
                              )}
                            </div>
                            <span>${(Number(item.precioUnitario || item.precio || 0) * Number(item.cantidad || 1)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-900">
                        <span>TOTAL SOLICITADO:</span>
                        <span className="text-emerald-600">${req.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {req.notas && (
                      <p className="text-xs italic text-slate-500 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        💬 Nota: "{req.notas}"
                      </p>
                    )}

                    {/* Botones de Acción (Confirmar / Rechazar) */}
                    {isPending && (
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={processingId === req.id}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          Rechazar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConfirmRequest(req.id)}
                          disabled={processingId === req.id}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>CONFIRMAR PEDIDO Y ENVIAR A COCINA</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: LLAMADAS DE MESERO */}
      {activeTab === 'llamadas' && (
        <div className="space-y-4">
          {waiterCalls.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
              <Bell className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black uppercase text-slate-800">Sin llamadas activas de mesero</h3>
              <p className="text-xs text-slate-400">Cuando un cliente presione "Llamar Mesero" desde su mesa se emitirá una alerta aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {waiterCalls.map(call => {
                const isPending = call.estado === 'PENDING';

                return (
                  <div
                    key={call.id}
                    className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3 ${
                      isPending ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-slate-900 text-white font-black text-xs rounded-xl uppercase">
                        📍 {call.table?.nombre || 'Mesa'}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isPending ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isPending ? '🔔 Solicitando Mesero' : '✓ Atendido'}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">{call.notas || 'Atención en mesa'}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Hace {Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 1000)}s</p>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleResolveWaiterCall(call.id)}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Marcar como Atendido</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: CONFIGURACIÓN DE PEDIDOS EN MESA */}
      {activeTab === 'configuracion' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 max-w-2xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 uppercase">Configuración de Pedidos desde Mesa</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Controla la geolocalización, radio en metros y permisos de pedido</p>
          </div>

          <div className="space-y-5 text-xs">
            {/* Switch Pedidos Habilitados */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="font-black text-slate-900 block text-sm">Permitir Pedidos desde las Mesas</span>
                <span className="text-slate-500 text-xs">Si está desactivado, el QR únicamente funcionará para ver el catálogo</span>
              </div>
              <input
                type="checkbox"
                checked={config.mesaPedidosHabilitados}
                onChange={e => setConfig(prev => ({ ...prev, mesaPedidosHabilitados: e.target.checked }))}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Radio Permitido */}
            <div className="space-y-2">
              <label className="font-black uppercase text-slate-700 tracking-wider block">
                Radio Permitido para Pedidos (Geolocalización GPS)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[50, 75, 100, 150].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, mesaRadioPermitido: m }))}
                    className={`py-2.5 font-black rounded-xl border text-xs cursor-pointer ${
                      config.mesaRadioPermitido === m
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m} metros
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 font-medium italic mt-1">
                🔒 El cliente debe estar a menos de {config.mesaRadioPermitido}m del restaurante para poder solicitar pedido desde la mesa.
              </p>
            </div>

            {/* Switch Llamar Mesero */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="font-black text-slate-900 block text-sm">Mostrar Botón "Llamar Mesero"</span>
                <span className="text-slate-500 text-xs">Permite a los clientes enviar una alerta rápida de atención</span>
              </div>
              <input
                type="checkbox"
                checked={config.mesaLlamarMeseroHabilitado}
                onChange={e => setConfig(prev => ({ ...prev, mesaLlamarMeseroHabilitado: e.target.checked }))}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Cooldown Llamar Mesero */}
            <div className="space-y-2">
              <label className="font-black uppercase text-slate-700 tracking-wider block">
                Tiempo de Espera entre Llamadas (Anti-Spam)
              </label>
              <select
                value={config.mesaCooldownLlamada}
                onChange={e => setConfig(prev => ({ ...prev, mesaCooldownLlamada: Number(e.target.value) }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none"
              >
                <option value={30}>30 Segundos</option>
                <option value={60}>1 Minuto (60s)</option>
                <option value={120}>2 Minutos (120s)</option>
                <option value={300}>5 Minutos (300s)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer transition-all disabled:opacity-50"
            >
              {savingConfig ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </form>
      )}

      {/* MODAL CREAR / EDITAR MESA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm uppercase text-slate-900">
                {editingTable ? 'Editar Mesa' : 'Crear Nueva Mesa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nombre de la Mesa</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Mesa 1, Terraza VIP, Barra 2"
                  value={tableNameInput}
                  onChange={e => setTableNameInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Número de Orden (Opcional)</label>
                <input
                  type="number"
                  placeholder="ej. 1, 2, 3"
                  value={tableNumberInput}
                  onChange={e => setTableNumberInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Permitir Pedidos desde esta Mesa</span>
                  <span className="text-[10px] text-slate-400">Si se desactiva, solo mostrará el menú</span>
                </div>
                <input
                  type="checkbox"
                  checked={tableAllowOrders}
                  onChange={e => setTableAllowOrders(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTable}
                  className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingTable ? 'Guardando...' : editingTable ? 'Guardar Cambios' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESIÓN QR */}
      {isPrintModalOpen && (
        <TableQRPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          tables={mesas}
          businessName={businessName}
          businessLogo={businessLogo}
          slug={slug}
          selectedTableId={selectedTableForPrint}
        />
      )}

    </div>
  );
}
