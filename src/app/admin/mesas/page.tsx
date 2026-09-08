'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layout, Plus, QrCode, Printer, CheckCircle2, XCircle, Bell, Clock, MapPin,
  Utensils, Settings, RefreshCw, AlertCircle, Trash2, Edit3, ShieldCheck, Check,
  ChevronRight, ShoppingBag, DollarSign, CreditCard, Search, ExternalLink, Copy,
  ChefHat, Eye, ArrowRight, X
} from 'lucide-react';
import TableQRPrintModal from '@/components/admin/mesas/TableQRPrintModal';

interface ActiveOrderSummary {
  id: string;
  numeroPedido: number;
  estado: string;
  subtotal: number;
  total: number;
  itemsCount: number;
  items: Array<{
    id?: string;
    nombreProducto: string;
    precioUnitario: number;
    cantidad: number;
  }>;
  createdAt: string;
  durationMinutes: number;
  kitchenStatus: string;
  isLocked?: boolean;
  lockReason?: string;
}

interface RestaurantTableItem {
  id: string;
  nombre: string;
  numero: number | null;
  capacidad?: number | null;
  token: string;
  activa: boolean;
  permitePedidos: boolean;
  estado: string;
  activeOrder?: ActiveOrderSummary | null;
  hasBillRequest?: boolean;
  hasPendingCall?: boolean;
  hasPendingRequest?: boolean;
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

interface CatalogProduct {
  id: string;
  nombre: string;
  precio: number;
  categoria?: { id: string; nombre: string } | null;
  imagenUrl?: string | null;
  activo?: boolean;
}

export default function AdminMesasPage() {
  const [mounted, setMounted] = useState(false);
  const [originUrl, setOriginUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'mesas' | 'solicitudes' | 'llamadas' | 'configuracion'>('mesas');
  const [tableFilter, setTableFilter] = useState<'ALL' | 'DISPONIBLE' | 'OCUPADA' | 'CUENTA_SOLICITADA'>('ALL');
  const [loading, setLoading] = useState(true);
  const [mesas, setMesas] = useState<RestaurantTableItem[]>([]);
  const [requests, setRequests] = useState<TableOrderRequestItem[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
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

  // Modales de Creación y Edición de Mesa
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTableItem | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableNumberInput, setTableNumberInput] = useState('');
  const [tableSeatsInput, setTableSeatsInput] = useState('4');
  const [tableAllowOrders, setTableAllowOrders] = useState(true);
  const [savingTable, setSavingTable] = useState(false);

  // Modales de Gestión de Salón
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<RestaurantTableItem | null>(null);
  const [selectedTableForAddOrder, setSelectedTableForAddOrder] = useState<RestaurantTableItem | null>(null);
  const [selectedTableForClose, setSelectedTableForClose] = useState<RestaurantTableItem | null>(null);
  const [selectedTableForQRView, setSelectedTableForQRView] = useState<RestaurantTableItem | null>(null);

  // Modal de Impresión por Lote / Individual
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedTableForPrint, setSelectedTableForPrint] = useState<string | null>(null);

  // Estado del Carrito para Agregar Productos a la Mesa
  const [orderItemsCart, setOrderItemsCart] = useState<Array<{
    productoId: string;
    nombreProducto: string;
    precioUnitario: number;
    cantidad: number;
  }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Estado de Cobro y Cierre
  const [payMethod, setPayMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [payCashReceived, setPayCashReceived] = useState<string>('');
  const [closingTable, setClosingTable] = useState(false);

  // Estado de Procesamiento de Solicitudes
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('citiox_current_branch_id') : null;
      const headers: Record<string, string> = {};
      if (currentBranchId) {
        headers['x-branch-id'] = currentBranchId;
      }

      const [resMesas, resReq, resConfig, resNegocio, resProd] = await Promise.all([
        fetch('/api/admin/mesas', { headers }),
        fetch('/api/admin/mesas/requests', { headers }),
        fetch('/api/admin/mesas/config'),
        fetch('/api/negocio'),
        fetch('/api/admin/productos')
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
      if (resProd.ok) {
        const d = await resProd.json();
        if (Array.isArray(d)) setCatalogProducts(d);
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
    const interval = setInterval(fetchAllData, 8000); // Polling cada 8s para sincronización en vivo

    const handleBranchChanged = () => {
      fetchAllData();
    };
    window.addEventListener('citiox-branch-changed', handleBranchChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('citiox-branch-changed', handleBranchChanged);
    };
  }, []);

  // Mantener actualizado el modal de detalles si la mesa cambia en el polling
  useEffect(() => {
    if (selectedTableForDetails) {
      const updated = mesas.find(m => m.id === selectedTableForDetails.id);
      if (updated) setSelectedTableForDetails(updated);
    }
  }, [mesas]);

  // Guardar / Editar Mesa
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNameInput.trim()) return;

    setSavingTable(true);
    try {
      const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('citiox_current_branch_id') : null;
      const targetBranch = currentBranchId && currentBranchId !== 'ALL' ? currentBranchId : undefined;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentBranchId) {
        headers['x-branch-id'] = currentBranchId;
      }

      if (editingTable) {
        const res = await fetch(`/api/admin/mesas/${editingTable.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            nombre: tableNameInput.trim(),
            numero: tableNumberInput ? parseInt(tableNumberInput, 10) : null,
            capacidad: tableSeatsInput ? parseInt(tableSeatsInput, 10) : 4,
            permitePedidos: tableAllowOrders,
            branchId: targetBranch
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
          headers,
          body: JSON.stringify({
            nombre: tableNameInput.trim(),
            numero: tableNumberInput ? parseInt(tableNumberInput, 10) : null,
            capacidad: tableSeatsInput ? parseInt(tableSeatsInput, 10) : 4,
            permitePedidos: tableAllowOrders,
            branchId: targetBranch
          })
        });
        const data = await res.json();
        if (res.ok) {
          await fetchAllData();
          setIsCreateModalOpen(false);
        } else {
          alert(`❌ ${data.error || 'Error al crear la mesa'}`);
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

  // Confirmar Solicitud de Pedido (Cliente QR -> Cocina / Pedido Definitivo)
  const handleConfirmRequest = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/mesas/requests/${id}/confirm`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert('✅ ¡Pedido de mesa confirmado con éxito! Fue enviado a comandas/cocina.');
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

  // Agregar Producto al Carrito de la Mesa
  const handleAddToCart = (product: CatalogProduct) => {
    setOrderItemsCart(prev => {
      const existing = prev.find(it => it.productoId === product.id);
      if (existing) {
        return prev.map(it =>
          it.productoId === product.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [
        ...prev,
        {
          productoId: product.id,
          nombreProducto: product.nombre,
          precioUnitario: Number(product.precio),
          cantidad: 1
        }
      ];
    });
  };

  const handleUpdateCartQuantity = (productoId: string, delta: number) => {
    setOrderItemsCart(prev =>
      prev
        .map(it => {
          if (it.productoId === productoId) {
            const newQty = it.cantidad + delta;
            return newQty > 0 ? { ...it, cantidad: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as any
    );
  };

  // Enviar Productos a la Comanda de la Mesa
  const handleSubmitOrderToTable = async () => {
    if (!selectedTableForAddOrder) return;
    if (orderItemsCart.length === 0) {
      alert('Por favor selecciona al menos un producto');
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/admin/mesas/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTableForAddOrder.id,
          items: orderItemsCart
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOrderItemsCart([]);
        setSelectedTableForAddOrder(null);
        await fetchAllData();
      } else {
        alert(`❌ ${data.error || 'No se pudo registrar la comanda'}`);
      }
    } catch (err) {
      alert('Error al registrar la comanda en la mesa.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Cobrar y Cerrar Mesa
  const handleCloseTable = async () => {
    if (!selectedTableForClose) return;

    setClosingTable(true);
    try {
      const res = await fetch('/api/admin/mesas/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTableForClose.id,
          orderId: selectedTableForClose.activeOrder?.id,
          metodoPago: payMethod,
          montoRecibido: payCashReceived ? parseFloat(payCashReceived) : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedTableForClose(null);
        setSelectedTableForDetails(null);
        setPayCashReceived('');
        await fetchAllData();
      } else {
        alert(`❌ ${data.error || 'Error al cerrar la mesa'}`);
      }
    } catch (err) {
      alert('Error al cerrar la mesa.');
    } finally {
      setClosingTable(false);
    }
  };

  // Copiar Enlace Directo de la Mesa
  const handleCopyLink = (token: string) => {
    const baseHost = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `${baseHost}/${slug}/mesa/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Métricas del Salón
  const totalTablesCount = mesas.length;
  const libresCount = mesas.filter(m => m.estado === 'DISPONIBLE').length;
  const ocupadasCount = mesas.filter(m => m.estado === 'OCUPADA').length;
  const cuentaSolicitadaCount = mesas.filter(m => m.estado === 'CUENTA_SOLICITADA' || m.hasBillRequest).length;
  const pendingRequestsCount = requests.filter(r => r.estado === 'PENDING_ADMIN_CONFIRMATION').length;
  const pendingCallsCount = waiterCalls.filter(w => w.estado === 'PENDING' || w.estado === 'ACKNOWLEDGED').length;

  // Total acumulado en salón en tiempo real
  const totalSalonRevenue = mesas.reduce((sum, m) => {
    if (m.activeOrder && !m.activeOrder.isLocked) {
      return sum + (m.activeOrder.total || 0);
    }
    return sum;
  }, 0);

  // Filtrado de mesas en la cuadrícula
  const filteredMesas = useMemo(() => {
    if (tableFilter === 'ALL') return mesas;
    if (tableFilter === 'DISPONIBLE') return mesas.filter(m => m.estado === 'DISPONIBLE');
    if (tableFilter === 'OCUPADA') return mesas.filter(m => m.estado === 'OCUPADA');
    if (tableFilter === 'CUENTA_SOLICITADA') return mesas.filter(m => m.estado === 'CUENTA_SOLICITADA' || m.hasBillRequest);
    return mesas;
  }, [mesas, tableFilter]);

  // Filtrado de productos para la toma de comanda
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return catalogProducts;
    const q = productSearch.toLowerCase();
    return catalogProducts.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(q))
    );
  }, [catalogProducts, productSearch]);

  const cartSubtotal = orderItemsCart.reduce((sum, it) => sum + it.precioUnitario * it.cantidad, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 pb-36 text-left">

      {/* ── HEADER DEL SALÓN DE RESTAURANTE ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-slate-900 text-amber-400 rounded-2xl shadow-md">
            <Layout className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Salón & Mesas</h1>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-md uppercase tracking-wider">
                Control Operativo
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Control de salón en tiempo real, comandas activas, pedidos y códigos QR permanentes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchAllData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTableForPrint(null);
              setIsPrintModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimir QRs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTable(null);
              setTableNameInput('');
              setTableNumberInput('');
              setTableSeatsInput('4');
              setTableAllowOrders(true);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-black uppercase rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Mesa</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS DEL SALÓN ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Mesas</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalTablesCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Libres
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{libresCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Ocupadas
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{ocupadasCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Cuenta / Alerta
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">{cuentaSolicitadaCount}</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Venta Activa</span>
          <p className="text-2xl font-black text-amber-400 mt-1">${totalSalonRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* ── NAVEGACIÓN POR PESTAÑAS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('mesas')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'mesas' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Salón ({mesas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 relative ${
            activeTab === 'solicitudes' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Solicitudes QR</span>
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
          <span>Configuración Salón</span>
        </button>
      </div>

      {/* ── PESTAÑA 1: PLANO Y GRID DE SALÓN DE MESAS ── */}
      {activeTab === 'mesas' && (
        <div className="space-y-6">

          {/* Filtros de Estado */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200">
            {[
              { key: 'ALL', label: `Todas (${mesas.length})` },
              { key: 'DISPONIBLE', label: `🟢 Libres (${libresCount})` },
              { key: 'OCUPADA', label: `🟠 Ocupadas (${ocupadasCount})` },
              { key: 'CUENTA_SOLICITADA', label: `🟡 Cuenta Solicitada (${cuentaSolicitadaCount})` }
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTableFilter(f.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tableFilter === f.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredMesas.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Layout className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-800 uppercase">Sin mesas con este filtro</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                No hay mesas que coincidan con la selección actual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredMesas.map(table => {
                const tokenStr = table?.token || '';
                const baseHost = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                const tableUrl = `${baseHost}/${slug}/mesa/${tokenStr}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableUrl)}`;
                const isOccupied = table.estado === 'OCUPADA' || Boolean(table.activeOrder);
                const isBillRequested = table.estado === 'CUENTA_SOLICITADA' || table.hasBillRequest;

                let borderClass = 'border-slate-200 hover:border-slate-300 bg-white';
                let headerBadge = (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Libre
                  </span>
                );

                if (isBillRequested) {
                  borderClass = 'border-amber-400 bg-amber-50/40 shadow-sm';
                  headerBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 animate-pulse">
                      🔔 Cuenta Solicitada
                    </span>
                  );
                } else if (isOccupied) {
                  borderClass = 'border-indigo-200 bg-white shadow-sm';
                  headerBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                      🟠 Ocupada
                    </span>
                  );
                }

                return (
                  <div
                    key={table.id}
                    className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${borderClass}`}
                  >
                    {/* Encabezado de la Tarjeta */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                            {table.nombre}
                            {table.numero && (
                              <span className="text-xs text-slate-400 font-mono">#{table.numero}</span>
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <span>🪑 {table.capacidad || 4} puestos</span>
                            <span className="text-slate-300">·</span>
                            <span>{table.permitePedidos ? 'QR habilitado' : 'Solo lectura'}</span>
                          </p>
                        </div>
                        {headerBadge}
                      </div>

                      {/* Cuerpo: Estado del Consumo u Ocupación */}
                      {isOccupied && table.activeOrder ? (
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Utensils className="w-3.5 h-3.5 text-indigo-600" />
                              Orden #{table.activeOrder.numeroPedido}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {table.activeOrder.durationMinutes} min
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-200">
                            <span className="text-xs text-slate-500 font-medium">
                              {table.activeOrder.itemsCount} producto{table.activeOrder.itemsCount !== 1 ? 's' : ''}
                            </span>
                            {table.activeOrder.isLocked ? (
                              <span className="text-xs font-black text-amber-600 flex items-center gap-1">
                                🔒 Plan Free
                              </span>
                            ) : (
                              <span className="text-base font-black text-slate-950">
                                ${(table.activeOrder.total || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-1 py-5">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Mesa Libre</span>
                          <span className="text-[10px] text-slate-400">Lista para recibir clientes</span>
                        </div>
                      )}
                    </div>

                    {/* Acciones Rápidas de Salón */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {isOccupied ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTableForDetails(table)}
                            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ver Cuenta</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTableForClose(table);
                              setPayCashReceived('');
                            }}
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Cobrar</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTableForAddOrder(table);
                            setOrderItemsCart([]);
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Abrir Comanda</span>
                        </button>
                      )}

                      {/* Barra de utilidades: QR, Editar, Imprimir */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTableForQRView(table)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-bold"
                          title="Ver y Compartir QR Permanente"
                        >
                          <QrCode className="w-4 h-4 text-slate-700" />
                          <span className="hidden sm:inline">QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTableForPrint(table.id);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                          title="Imprimir QR"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTable(table);
                            setTableNameInput(table.nombre);
                            setTableNumberInput(table.numero ? String(table.numero) : '');
                            setTableSeatsInput(table.capacidad ? String(table.capacidad) : '4');
                            setTableAllowOrders(table.permitePedidos);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                          title="Editar mesa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                          title="Eliminar mesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PESTAÑA 2: SOLICITUDES DE PEDIDO (AUTOSERVICIO QR) ── */}
      {activeTab === 'solicitudes' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Bandeja de Solicitudes QR en Salón
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pedidos enviados por comensales escaneando el código QR de su mesa. Al confirmar, se integran a la orden activa y pasan a cocina.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-slate-800 uppercase">Sin solicitudes pendientes</h4>
              <p className="text-xs text-slate-500">Todas las comandas de clientes han sido atendidas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const isPending = req.estado === 'PENDING_ADMIN_CONFIRMATION';
                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-3xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isPending ? 'border-amber-300 shadow-xs' : 'border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-slate-900 text-amber-400 font-black text-xs rounded-lg uppercase">
                          {req.table?.nombre || 'Mesa'}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase ${
                          isPending ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPending ? 'Pendiente Aprobación' : req.estado}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Cliente: <strong>{req.nombreCliente || 'Comensal'}</strong> {req.telefonoCliente ? `(${req.telefonoCliente})` : ''}
                      </p>
                      <div className="text-xs text-slate-700">
                        {Array.isArray(req.items) && req.items.map((it: any, i: number) => (
                          <span key={i} className="inline-block bg-slate-100 px-2 py-0.5 rounded mr-1.5 mt-1 font-mono text-[11px]">
                            {it.cantidad || 1}x {it.nombre || it.nombreProducto} (${Number(it.precioUnitario || it.precio || 0).toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Comanda</span>
                        <span className="text-lg font-black text-slate-900">${(req.total || 0).toFixed(2)}</span>
                      </div>

                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={processingId === req.id}
                            onClick={() => handleConfirmRequest(req.id)}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {processingId === req.id ? 'Aprobando...' : 'Confirmar & Enviar Cocina'}
                          </button>
                          <button
                            type="button"
                            disabled={processingId === req.id}
                            onClick={() => handleRejectRequest(req.id)}
                            className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Rechazar solicitud"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PESTAÑA 3: LLAMADAS DE MESERO / CUENTA ── */}
      {activeTab === 'llamadas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Llamadas de Asistencia y Solicitud de Cuenta
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Alertas generadas por clientes desde la mesa solicitando mesero o la pre-cuenta.
            </p>
          </div>

          {waiterCalls.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-slate-800 uppercase">Sin llamadas pendientes</h4>
              <p className="text-xs text-slate-500">Todo el salón se encuentra atendido.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waiterCalls.map(call => {
                const isPending = call.estado === 'PENDING' || call.estado === 'ACKNOWLEDGED';
                const isBill = call.notas?.toLowerCase().includes('cuenta') || call.notas?.toLowerCase().includes('pagar');
                return (
                  <div
                    key={call.id}
                    className={`p-4 rounded-3xl border bg-white flex items-center justify-between gap-4 ${
                      isPending ? (isBill ? 'border-amber-400 bg-amber-50/30' : 'border-rose-300 bg-rose-50/20') : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${isBill ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 uppercase">{call.table?.nombre || 'Mesa'}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase ${
                            isBill ? 'bg-amber-400 text-slate-950' : 'bg-rose-600 text-white'
                          }`}>
                            {isBill ? '💳 Solicita Cuenta' : '🛎️ Mesero'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          {call.notas || 'Cliente requiere asistencia en mesa.'}
                        </p>
                      </div>
                    </div>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleResolveWaiterCall(call.id)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        Atendido ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PESTAÑA 4: CONFIGURACIÓN SALÓN ── */}
      {activeTab === 'configuracion' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 max-w-2xl space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Parámetros Operativos del Salón
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Controla la geocerca de seguridad y la disponibilidad de pedidos vía QR.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs font-semibold">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-900 block">Permitir pedidos desde QR en mesas</label>
                <span className="text-[11px] text-slate-500 font-normal">
                  Los comensales podrán añadir productos y enviar comandas directamente desde su móvil.
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.mesaPedidosHabilitados}
                onChange={e => setConfig({ ...config, mesaPedidosHabilitados: e.target.checked })}
                className="w-5 h-5 accent-slate-900 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 block">Radio de Geocerca Permitido (metros)</label>
              <input
                type="number"
                value={config.mesaRadioPermitido}
                onChange={e => setConfig({ ...config, mesaRadioPermitido: parseInt(e.target.value, 10) || 50 })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-slate-400 font-normal">
                Distancia máxima alrededor del negocio para validar que el cliente está físicamente en el local.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Parámetros'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: DETALLES DE MESA & COMANDA ACTIVA ── */}
      {selectedTableForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Encabezado */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {selectedTableForDetails.nombre}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                      {selectedTableForDetails.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    🪑 Capacidad: {selectedTableForDetails.capacidad || 4} personas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTableForDetails(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido de la Orden Activa */}
              {selectedTableForDetails.activeOrder ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Orden Activa</span>
                      <strong className="text-slate-900">Pedido #{selectedTableForDetails.activeOrder.numeroPedido}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Tiempo Abierta</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {selectedTableForDetails.activeOrder.durationMinutes} minutos
                      </span>
                    </div>
                  </div>

                  {/* Lista de Productos Consumidos */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Productos en Comanda ({selectedTableForDetails.activeOrder.itemsCount})
                    </h4>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                      {selectedTableForDetails.activeOrder.items.map((item, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-[11px]">
                              {item.cantidad}x
                            </span>
                            <span className="font-bold text-slate-800">{item.nombreProducto}</span>
                          </div>
                          <span className="font-black text-slate-900 font-mono">
                            ${((item.precioUnitario || 0) * (item.cantidad || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen Financiero */}
                  <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal Consumo:</span>
                      <span>${(selectedTableForDetails.activeOrder.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-amber-400 pt-1 border-t border-slate-800">
                      <span>Total a Cobrar:</span>
                      <span>${(selectedTableForDetails.activeOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-black text-slate-800 uppercase">Mesa Libre</h4>
                  <p className="text-xs text-slate-500">No hay comanda abierta en este momento.</p>
                </div>
              )}
            </div>

            {/* Botonera Inferior */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTableForAddOrder(selectedTableForDetails);
                  setOrderItemsCart([]);
                  setSelectedTableForDetails(null);
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Productos</span>
              </button>

              {selectedTableForDetails.activeOrder && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableForClose(selectedTableForDetails);
                    setSelectedTableForDetails(null);
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cobrar & Cerrar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: AGREGAR PRODUCTOS DIRECTOS A LA MESA (TOMA DE COMANDA) ── */}
      {selectedTableForAddOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Encabezado */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-indigo-600" />
                    Tomar Pedido: {selectedTableForAddOrder.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Selecciona productos del catálogo para añadir a la comanda y despachar a cocina.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableForAddOrder(null);
                    setOrderItemsCart([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Buscador de Productos */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o categoría..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-slate-400"
                />
              </div>

              {/* Grid de Productos del Catálogo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddToCart(prod)}
                    className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <h5 className="text-xs font-black text-slate-900">{prod.nombre}</h5>
                      <span className="text-[10px] text-slate-500">
                        {prod.categoria?.nombre || 'General'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-950 font-mono block">
                        ${Number(prod.precio || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">+ Añadir</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Canasta de la Comanda a Enviar */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase">
                    Productos Seleccionados ({orderItemsCart.reduce((s, it) => s + it.cantidad, 0)})
                  </h4>
                  {orderItemsCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrderItemsCart([])}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Vaciar lista
                    </button>
                  )}
                </div>

                {orderItemsCart.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Toca los productos arriba para agregarlos a la comanda.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {orderItemsCart.map(item => (
                      <div
                        key={item.productoId}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{item.nombreProducto}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 font-mono">
                            ${(item.precioUnitario * item.cantidad).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.productoId, -1)}
                              className="px-1.5 py-0.5 font-black text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-1 font-bold text-[11px]">{item.cantidad}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.productoId, 1)}
                              className="px-1.5 py-0.5 font-black text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botón de Enviar a Cocina */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total a Agregar</span>
                <span className="text-lg font-black text-slate-900 font-mono">${cartSubtotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                disabled={submittingOrder || orderItemsCart.length === 0}
                onClick={handleSubmitOrderToTable}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <ChefHat className="w-4 h-4" />
                <span>{submittingOrder ? 'Enviando...' : 'Confirmar & Enviar a Cocina'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COBRAR Y CERRAR MESA ── */}
      {selectedTableForClose && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Cobro de Mesa: {selectedTableForClose.nombre}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Registra el pago del cliente y libera la mesa para nuevos comensales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableForClose(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total a Cobrar</span>
              <p className="text-3xl font-black text-emerald-950 font-mono">
                ${(selectedTableForClose.activeOrder?.total || 0).toFixed(2)}
              </p>
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {[
                  { key: 'EFECTIVO', label: '💵 Efectivo' },
                  { key: 'TRANSFERENCIA', label: '🏦 Transferencia' },
                  { key: 'TARJETA', label: '💳 Tarjeta' },
                  { key: 'OTRO', label: '⚡ Otro / Mixto' }
                ].map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPayMethod(m.key as any)}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      payMethod === m.key
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto Recibido si es Efectivo */}
            {payMethod === 'EFECTIVO' && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Monto Recibido en Efectivo
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 20.00"
                  value={payCashReceived}
                  onChange={e => setPayCashReceived(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:outline-hidden focus:border-slate-400"
                />
                {payCashReceived && parseFloat(payCashReceived) >= (selectedTableForClose.activeOrder?.total || 0) && (
                  <p className="text-xs font-black text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    Cambio / Vuelto: ${(parseFloat(payCashReceived) - (selectedTableForClose.activeOrder?.total || 0)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Botón de Confirmación */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTableForClose(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={closingTable}
                onClick={handleCloseTable}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {closingTable ? 'Cerrando...' : 'Confirmar Cobro & Liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VER / COMPARTIR QR PERMANENTE DE MESA ── */}
      {selectedTableForQRView && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-black text-slate-900 uppercase">
                QR Permanente: {selectedTableForQRView.nombre}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTableForQRView(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vista Previa QR */}
            {(() => {
              const baseHost = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
              const tableUrl = `${baseHost}/${slug}/mesa/${selectedTableForQRView.token}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableUrl)}`;
              const isCopied = copiedToken === selectedTableForQRView.token;

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                    <img src={qrUrl} alt={selectedTableForQRView.nombre} className="w-48 h-48 object-contain rounded-xl mx-auto" />
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono break-all bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {tableUrl}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(selectedTableForQRView.token)}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableForPrint(selectedTableForQRView.id);
                        setIsPrintModalOpen(true);
                        setSelectedTableForQRView(null);
                      }}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR MESA ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-black text-slate-900 uppercase">
                {editingTable ? 'Editar Mesa' : 'Nueva Mesa de Salón'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-700 block">Nombre / Identificador de Mesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mesa 01, Terraza A, Barra 02"
                  value={tableNameInput}
                  onChange={e => setTableNameInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 block">Número (opcional)</label>
                  <input
                    type="number"
                    placeholder="Ej: 1"
                    value={tableNumberInput}
                    onChange={e => setTableNumberInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 block">Capacidad (Puestos)</label>
                  <input
                    type="number"
                    min="1"
                    value={tableSeatsInput}
                    onChange={e => setTableSeatsInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Habilitar pedidos QR en mesa</span>
                  <span className="text-[10px] text-slate-500 font-normal">Los clientes podrán auto-ordenar</span>
                </div>
                <input
                  type="checkbox"
                  checked={tableAllowOrders}
                  onChange={e => setTableAllowOrders(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingTable}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingTable ? 'Guardando...' : (editingTable ? 'Actualizar' : 'Crear Mesa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE IMPRESIÓN DE CÓDIGOS QR ── */}
      <TableQRPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedTableForPrint(null);
        }}
        tables={mesas}
        businessName={businessName}
        businessLogo={businessLogo}
        slug={slug}
        selectedTableId={selectedTableForPrint}
      />

    </div>
  );
}
