'use client';
// src/app/admin/mesas/page.tsx
// Módulo de Gestión de Mesas y Cuentas Abiertas (Citiox POS Enterprise)

import { useState, useEffect, useMemo } from 'react';
import { 
  Layout, Plus, Edit3, Trash2, Loader2, RefreshCw, Users, Clock, 
  ShoppingBag, ChefHat, CreditCard, ArrowRightLeft, X, AlertCircle, 
  PlusCircle, Sparkles, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Table {
  id: string;
  name: string;
  estado: string; // DISPONIBLE | OCUPADA | RESERVADA | PENDIENTE_COBRO
  capacity: number;
}

interface OrderItem {
  id: string;
  productoId?: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

interface Pedido {
  id: string;
  numeroPedido: number;
  tipoEntrega: string;
  nombreCliente: string;
  telefonoCliente: string;
  referenciaCliente?: string;
  subtotal: number;
  costoEnvio: number;
  total: number;
  estado: string;
  createdAt: string;
  items: OrderItem[];
  notas?: string;
  extraInfo?: any;
}

const TABLE_STATES = ['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'PENDIENTE_COBRO'];

const TABLE_COLORS: Record<string, { bg: string; border: string; text: string; badgeBg: string; badgeText: string; label: string }> = {
  DISPONIBLE: {
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    label: 'Libre'
  },
  OCUPADA: {
    bg: 'bg-amber-50/50',
    border: 'border-amber-300',
    text: 'text-[#ea580c]',
    badgeBg: 'bg-[#ea580c]',
    badgeText: 'text-white',
    label: 'Ocupada'
  },
  RESERVADA: {
    bg: 'bg-indigo-50/50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    badgeBg: 'bg-indigo-500',
    badgeText: 'text-white',
    label: 'Reservada'
  },
  PENDIENTE_COBRO: {
    bg: 'bg-purple-50/50',
    border: 'border-purple-300',
    text: 'text-purple-800',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
    label: 'Por Cobrar'
  }
};

export default function AdminMesasPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  
  // Selection & Side Panel
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [tableForm, setTableForm] = useState({ id: '', name: '', capacity: 4, estado: 'DISPONIBLE' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Cargar Slug del negocio
  useEffect(() => {
    async function loadNegocio() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const neg = await res.json();
          setSlug(neg.slug);
        }
      } catch (_) {}
    }
    loadNegocio();
  }, []);

  // Cargar Mesas y Órdenes
  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  async function loadData() {
    setLoading(true);
    try {
      const [resT, resO] = await Promise.all([
        fetch(`/api/${slug}/tables`),
        fetch('/api/admin/pedidos')
      ]);

      if (resT.ok) {
        const dataT = await resT.json();
        setTables(dataT.tables || []);
      }

      if (resO.ok) {
        const dataO = await resO.json();
        setOrders(Array.isArray(dataO) ? dataO : []);
      }
    } catch (err) {
      console.error('Error cargando datos de mesas/órdenes:', err);
    } finally {
      setLoading(false);
    }
  }

  // Mapa de Órdenes Activas por ID de Mesa
  const activeOrdersByMesa = useMemo(() => {
    const map: Record<string, Pedido> = {};

    orders.forEach(p => {
      const isFinished = ['CANCELADO', 'CANCELLED', 'RECHAZADO', 'FINALIZADO', 'COMPLETADO'].includes(p.estado);
      if (isFinished) return;

      let extra: any = {};
      if (typeof p.extraInfo === 'string') {
        try { extra = JSON.parse(p.extraInfo); } catch { extra = {}; }
      } else if (p.extraInfo && typeof p.extraInfo === 'object') {
        extra = p.extraInfo;
      }

      // Match mesa by name or code
      tables.forEach(t => {
        const cleanRef = (p.referenciaCliente || '').toLowerCase();
        const cleanName = t.name.toLowerCase();
        const cleanMesaCode = (extra.mesaCode || '').toLowerCase();

        if (
          cleanMesaCode === cleanName ||
          cleanRef.includes(cleanName) ||
          (p.tipoEntrega === 'TABLE_ORDER' && cleanRef.startsWith(cleanName))
        ) {
          map[t.id] = p;
        }
      });
    });

    return map;
  }, [orders, tables]);

  // Orden asociada a la mesa seleccionada
  const activeOrderForSelectedTable = selectedTable ? activeOrdersByMesa[selectedTable.id] : null;

  // Formato de tiempo transcurrido (hh:mm)
  function getElapsedTime(dateStr?: string) {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }

  // Guardar / Editar Mesa (CRUD Infraestructura)
  async function saveTable() {
    if (!tableForm.name || !slug) return;
    setActionLoading(true);
    try {
      const isEdit = !!tableForm.id;
      const res = isEdit
        ? await fetch(`/api/${slug}/tables/${tableForm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableForm) })
        : await fetch(`/api/${slug}/tables`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableForm) });

      if (res.ok) {
        setShowTableModal(false);
        setTableForm({ id: '', name: '', capacity: 4, estado: 'DISPONIBLE' });
        showToast(isEdit ? 'Mesa actualizada' : 'Mesa agregada');
        loadData();
      }
    } finally {
      setActionLoading(false);
    }
  }

  // Eliminar Mesa
  async function deleteTable(id: string) {
    if (!confirm('¿Eliminar esta mesa?')) return;
    await fetch(`/api/${slug}/tables/${id}`, { method: 'DELETE' });
    setTables(prev => prev.filter(t => t.id !== id));
    if (selectedTable?.id === id) setSelectedTable(null);
    showToast('Mesa eliminada');
  }

  // Cambiar Estado Manual de la Mesa
  async function changeTableState(tableId: string, estado: string) {
    await fetch(`/api/${slug}/tables/${tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, estado } : t));
    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, estado } : null);
    }
  }

  // ACCIÓN 1: Enviar Orden a Cocina
  async function sendOrderToKitchen() {
    if (!activeOrderForSelectedTable) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrderForSelectedTable.id,
          action: 'CONFIRMAR_DISPONIBILIDAD',
          estado: 'EN_PREPARACION'
        })
      });
      if (res.ok) {
        showToast(`Orden #${activeOrderForSelectedTable.numeroPedido} enviada a Cocina`);
        loadData();
      } else {
        showToast('Error enviando a cocina', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  }

  // ACCIÓN 2: Enviar a Caja para Cobro
  async function sendTableToCashier() {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      await changeTableState(selectedTable.id, 'PENDIENTE_COBRO');
      showToast(`${selectedTable.name} enviada a Caja para cobro`);
    } finally {
      setActionLoading(false);
    }
  }

  // ACCIÓN 3: Mover / Cambiar de Mesa
  async function moveTableOrder() {
    if (!activeOrderForSelectedTable || !targetTableId) return;
    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    setActionLoading(true);
    try {
      // 1. Actualizar orden con nueva mesa
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrderForSelectedTable.id,
          extraInfoUpdates: { mesaCode: targetTable.name },
          referenciaCliente: targetTable.name
        })
      });

      if (res.ok) {
        // 2. Liberar mesa origen y ocupar mesa destino
        if (selectedTable) {
          await changeTableState(selectedTable.id, 'DISPONIBLE');
        }
        await changeTableState(targetTable.id, 'OCUPADA');

        setShowMoveTableModal(false);
        setSelectedTable(targetTable);
        showToast(`Cuenta movida exitosamente a ${targetTable.name}`);
        loadData();
      }
    } finally {
      setActionLoading(false);
    }
  }

  // ACCIÓN 4: Ir al POS para agregar productos a esta cuenta
  function navigateToPOSForAddition() {
    if (!selectedTable) return;
    const addOrderId = activeOrderForSelectedTable?.id || '';
    router.push(`/admin/ventas?addOrderId=${addOrderId}&tableName=${encodeURIComponent(selectedTable.name)}`);
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] space-y-3">
        <Loader2 className="animate-spin text-[#ea580c] size-10" />
        <p className="text-xs font-bold text-slate-500">Cargando Centro de Gestión de Cuentas...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-in slide-in-from-top-4 ${
          toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <Sparkles className="size-4" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layout className="text-[#ea580c] size-7" />
            Centro de Cuentas y Mesas
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Gestión en tiempo real de consumo en salón, comandas y estado de mesas
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={loadData} 
            className="flex-1 sm:flex-none bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className="size-3.5 text-slate-500" /> Recargar
          </button>
          
          <button 
            onClick={() => { 
              setTableForm({ id: '', name: `Mesa ${tables.length + 1}`, capacity: 4, estado: 'DISPONIBLE' }); 
              setShowTableModal(true); 
            }}
            className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="size-4" /> Nueva Mesa
          </button>
        </div>
      </div>

      {/* Badges de Resumen de Estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TABLE_STATES.map(s => {
          const cfg = TABLE_COLORS[s] || TABLE_COLORS['DISPONIBLE'];
          const count = tables.filter(t => {
            const hasOrder = !!activeOrdersByMesa[t.id];
            if (s === 'OCUPADA') return t.estado === 'OCUPADA' || (hasOrder && t.estado !== 'PENDIENTE_COBRO');
            return t.estado === s;
          }).length;

          return (
            <div key={s} className={`bg-white border ${cfg.border} p-3.5 rounded-2xl flex items-center justify-between shadow-sm`}>
              <div className="flex items-center gap-2.5">
                <span className={`size-3 rounded-full ${cfg.badgeBg}`} />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{cfg.label}</span>
              </div>
              <span className={`text-base font-black ${cfg.text}`}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* ─── GRID DE MESAS + PANEL LATERAL DE CUENTA ─── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* GRID DE TARJETAS DE MESAS */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tables.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <Layout className="size-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold">No hay mesas configuradas aún.</p>
              <button 
                onClick={() => { setTableForm({ id: '', name: 'Mesa 1', capacity: 4, estado: 'DISPONIBLE' }); setShowTableModal(true); }}
                className="px-4 py-2 bg-[#ea580c] text-white text-xs font-bold rounded-xl"
              >
                Crear Primera Mesa
              </button>
            </div>
          ) : (
            tables.map(table => {
              const order = activeOrdersByMesa[table.id];
              const isOccupied = table.estado === 'OCUPADA' || !!order;
              const effectiveState = table.estado === 'PENDIENTE_COBRO' 
                ? 'PENDIENTE_COBRO' 
                : isOccupied ? 'OCUPADA' : table.estado;

              const cfg = TABLE_COLORS[effectiveState] || TABLE_COLORS['DISPONIBLE'];
              const isSelected = selectedTable?.id === table.id;

              return (
                <div 
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`bg-white border-2 rounded-3xl p-4 shadow-sm transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-44 ${
                    cfg.border
                  } ${isSelected ? 'ring-4 ring-[#ea580c]/30 shadow-md scale-[1.01]' : 'hover:shadow-md hover:border-slate-300'}`}
                >
                  {/* Encabezado Tarjeta */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-lg text-slate-900 tracking-tight">{table.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5 text-slate-400" /> Cap: <strong>{table.capacity}p</strong>
                      </span>
                      {order && (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          <Clock className="size-3" /> {getElapsedTime(order.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle del Consumo Actual si está ocupada */}
                  {order ? (
                    <div className="bg-slate-900 text-white rounded-2xl p-2.5 mt-2 flex items-center justify-between shadow-inner">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                          Orden #{order.numeroPedido} ({order.items.length} ítems)
                        </span>
                        <span className="text-sm font-black text-emerald-400">
                          ${Number(order.total).toFixed(2)}
                        </span>
                      </div>
                      <ChevronRight className="size-5 text-amber-400" />
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>Sin cuenta activa</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        Libre
                      </span>
                    </div>
                  )}

                  {/* Acciones Rápidas Edición de Mesa (CRUD) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg shadow-sm border border-slate-200">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTableForm({ id: table.id, name: table.name, capacity: table.capacity, estado: table.estado });
                        setShowTableModal(true);
                      }}
                      className="p-1 text-slate-600 hover:text-slate-900"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTable(table.id);
                      }}
                      className="p-1 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── PANEL LATERAL: DETALLE DE CUENTA DE LA MESA SELECCIONADA ─── */}
        <div className="w-full lg:w-[400px] shrink-0 bg-white border border-slate-200 rounded-3xl p-5 shadow-lg space-y-4 sticky top-6">
          {!selectedTable ? (
            <div className="py-16 text-center space-y-3 text-slate-400">
              <ShoppingBag className="size-12 mx-auto text-slate-300" />
              <h3 className="font-extrabold text-sm text-slate-700">Selecciona una mesa</h3>
              <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
                Haz clic en cualquier mesa del plano para ver o gestionar la cuenta de consumos
              </p>
            </div>
          ) : (
            <>
              {/* Header Panel Lateral */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                    {selectedTable.name}
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    Capacidad: {selectedTable.capacity} personas
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={selectedTable.estado}
                    onChange={(e) => changeTableState(selectedTable.id, e.target.value)}
                    className="text-xs font-black p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none"
                  >
                    {TABLE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <button 
                    onClick={() => setSelectedTable(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Si la mesa TIENE ORDEN ABIERTA */}
              {activeOrderForSelectedTable ? (
                <div className="space-y-4">
                  {/* Ficha Resumen de la Orden */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                          ORDEN DE MESA #{activeOrderForSelectedTable.numeroPedido}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {activeOrderForSelectedTable.nombreCliente}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase">
                        {activeOrderForSelectedTable.estado}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span>Abierta hace: <strong>{getElapsedTime(activeOrderForSelectedTable.createdAt)}</strong></span>
                      <span className="text-emerald-400 font-black text-base">
                        Total: ${Number(activeOrderForSelectedTable.total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Productos Consumidos */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Productos Consumidos ({activeOrderForSelectedTable.items.length})
                    </h4>

                    <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {activeOrderForSelectedTable.items.map(item => (
                        <div key={item.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-extrabold text-slate-800 block">{item.nombreProducto}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              ${Number(item.precioUnitario).toFixed(2)} x {item.cantidad}
                            </span>
                          </div>
                          <span className="font-black text-slate-900">
                            ${(Number(item.precioUnitario) * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botones de Acción de la Cuenta */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    
                    {/* Botón 1: Agregar Productos (Redirige al POS) */}
                    <button
                      onClick={navigateToPOSForAddition}
                      className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <PlusCircle className="size-4" /> Agregar Productos en POS
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Botón 2: Enviar a Cocina */}
                      <button
                        onClick={sendOrderToKitchen}
                        disabled={actionLoading}
                        className="py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <ChefHat className="size-3.5" /> Enviar a Cocina
                      </button>

                      {/* Botón 3: Cambiar de Mesa */}
                      <button
                        onClick={() => setShowMoveTableModal(true)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowRightLeft className="size-3.5" /> Cambiar Mesa
                      </button>
                    </div>

                    {/* Botón 4: Enviar a Caja para Cobro */}
                    <button
                      onClick={sendTableToCashier}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CreditCard className="size-4" /> Enviar a Caja para Cobro
                    </button>

                    {/* Botón 5: Dividir Cuenta (Futura mejora - Deshabilitado) */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold">Dividir Cuenta:</span>
                      <span className="bg-slate-200 text-slate-600 font-extrabold px-2 py-0.5 rounded-md">
                        Próximamente
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6">
                  <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
                  <div>
                    <h4 className="font-black text-emerald-900 text-sm">Mesa Disponible</h4>
                    <p className="text-xs text-emerald-700 font-medium mt-1">
                      No hay consumos ni cuenta abierta registrada en esta mesa.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      router.push(`/admin/ventas?tableName=${encodeURIComponent(selectedTable.name)}`);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <PlusCircle className="size-4" /> Abrir Nueva Cuenta en POS
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── MODAL CAMBIAR DE MESA ─── */}
      {showMoveTableModal && selectedTable && activeOrderForSelectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="text-[#ea580c] size-5" />
              Cambiar Orden de Mesa
            </h3>
            
            <p className="text-xs text-slate-500 font-medium">
              Mover la Orden #{activeOrderForSelectedTable.numeroPedido} desde <strong>{selectedTable.name}</strong> hacia:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mesa Destino Libre:</label>
              <select
                value={targetTableId}
                onChange={e => setTargetTableId(e.target.value)}
                className="w-full text-xs font-bold p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none"
              >
                <option value="">-- Seleccionar Mesa --</option>
                {tables
                  .filter(t => t.id !== selectedTable.id && t.estado === 'DISPONIBLE' && !activeOrdersByMesa[t.id])
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Cap: {t.capacity}p)</option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setShowMoveTableModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={moveTableOrder}
                disabled={!targetTableId || actionLoading}
                className="flex-1 py-2.5 bg-[#ea580c] text-white rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Confirmar Cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL AGREGAR / EDITAR MESA (INFRAESTRUCTURA) ─── */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-black text-lg text-slate-900">
              {tableForm.id ? 'Editar Mesa' : 'Nueva Mesa'}
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Identificador</label>
              <input 
                type="text" 
                value={tableForm.name} 
                onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Ej: Mesa 05" 
                className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacidad de Personas</label>
              <input 
                type="number" 
                value={tableForm.capacity} 
                onChange={e => setTableForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} 
                className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl outline-none" 
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setShowTableModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={saveTable}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
