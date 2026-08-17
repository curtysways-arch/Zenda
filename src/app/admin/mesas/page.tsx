'use client';
// src/app/admin/mesas/page.tsx
// Módulo de Gestión de Mesas y Cuentas Divididas (Citiox POS Enterprise)

import { useState, useEffect, useMemo } from 'react';
import { 
  Layout, Plus, Edit3, Trash2, Loader2, RefreshCw, Users, Clock, 
  ShoppingBag, ChefHat, CreditCard, ArrowRightLeft, X, AlertCircle, 
  PlusCircle, Sparkles, CheckCircle2, ChevronRight, Split, Layers, DollarSign,
  Lock, Check, Undo2
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

interface SplitAccountItem {
  productoId?: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

interface SplitAccount {
  id: string;
  name: string;
  total: number;
  items: SplitAccountItem[];
  estado: 'PENDIENTE' | 'PAGADO';
  metodoPago?: string;
  paidAt?: string;
  montoRecibido?: number;
  vuelto?: number;
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
  payment?: any;
}

const TABLE_STATES = ['LIBRE', 'OCUPADA', 'EN_PREPARACION', 'LISTA', 'PENDIENTE_COBRO', 'RESERVADA'];

const TABLE_CONFIGS: Record<string, { bg: string; border: string; text: string; badgeBg: string; badgeText: string; label: string; icon: string }> = {
  LIBRE: {
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    label: 'Libre',
    icon: '🟢'
  },
  OCUPADA: {
    bg: 'bg-orange-50/50',
    border: 'border-orange-300',
    text: 'text-orange-800',
    badgeBg: 'bg-[#ea580c]',
    badgeText: 'text-white',
    label: 'Ocupada',
    icon: '🟡'
  },
  EN_PREPARACION: {
    bg: 'bg-amber-50/50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-slate-950',
    label: 'En Preparación',
    icon: '🍳'
  },
  LISTA: {
    bg: 'bg-purple-50/50',
    border: 'border-purple-300',
    text: 'text-purple-800',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
    label: 'Listo / Servir',
    icon: '📦'
  },
  PENDIENTE_COBRO: {
    bg: 'bg-rose-50/50',
    border: 'border-rose-300',
    text: 'text-rose-800',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
    label: 'Por Cobrar',
    icon: '💳'
  },
  RESERVADA: {
    bg: 'bg-indigo-50/50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    badgeBg: 'bg-indigo-500',
    badgeText: 'text-white',
    label: 'Reservada',
    icon: '🔵'
  }
};

export default function AdminMesasPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  
  // Table Selection & Side Panel
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [showPaySplitModal, setShowPaySplitModal] = useState(false);
  const [selectedSplitToPay, setSelectedSplitToPay] = useState<SplitAccount | null>(null);

  // Split Bill Form States
  const [splitMode, setSplitMode] = useState<'POR_PRODUCTOS' | 'POR_PERSONAS' | 'EQUITATIVA'>('POR_PRODUCTOS');
  const [numPeople, setNumPeople] = useState<number>(2);
  const [splitAccountsDraft, setSplitAccountsDraft] = useState<SplitAccount[]>([]);
  const [itemAllocations, setItemAllocations] = useState<Record<string, Record<string, number>>>({}); 
  // itemAllocations[productoName][accountId] = cantidad

  // Payment Form State for Split Account
  const [splitPayMethod, setSplitPayMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [splitMontoRecibido, setSplitMontoRecibido] = useState<string>('');

  // Direct Full Table Payment State
  const [showPayFullOrderModal, setShowPayFullOrderModal] = useState(false);
  const [payFullMethod, setPayFullMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [payFullMontoRecibido, setPayFullMontoRecibido] = useState<string>('');

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

  // Evaluar si una orden ya fue pagada en su totalidad en Caja / POS
  function checkIsOrderPaid(p: Pedido): boolean {
    if (!p) return false;
    let extra: any = {};
    if (typeof p.extraInfo === 'string') {
      try { extra = JSON.parse(p.extraInfo); } catch { extra = {}; }
    } else if (p.extraInfo && typeof p.extraInfo === 'object') {
      extra = p.extraInfo;
    }

    const paymentStatus = (extra.paymentStatus || '').toUpperCase();
    const orderPaymentEstado = (p.payment?.estado || '').toUpperCase();
    const estado = (p.estado || '').toUpperCase();

    return (
      paymentStatus === 'PAGADO' ||
      paymentStatus === 'CONFIRMADO' ||
      orderPaymentEstado === 'CONFIRMADO' ||
      ['FINALIZADO', 'COMPLETADO', 'ENTREGADO'].includes(estado)
    );
  }

  // Mapa de Órdenes Activas por ID de Mesa (Excluye órdenes finalizadas o pagadas)
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

      // Match mesa por nombre o mesaCode
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

  // Cuentas divididas de la orden seleccionada (si existen)
  const existingSplitAccounts: SplitAccount[] = useMemo(() => {
    if (!activeOrderForSelectedTable?.extraInfo) return [];
    let extra = activeOrderForSelectedTable.extraInfo;
    if (typeof extra === 'string') {
      try { extra = JSON.parse(extra); } catch { extra = {}; }
    }
    return extra.splitAccounts || [];
  }, [activeOrderForSelectedTable]);

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

  // Determinar estado visual exacto de la mesa
  function getEffectiveTableState(table: Table): string {
    const order = activeOrdersByMesa[table.id];
    if (table.estado === 'PENDIENTE_COBRO') return 'PENDIENTE_COBRO';
    if (!order) return table.estado === 'RESERVADA' ? 'RESERVADA' : 'LIBRE';

    const s = (order.estado || '').toUpperCase();
    if (['LISTO', 'READY'].includes(s)) return 'LISTA';
    if (['EN_PREPARACION', 'PREPARANDO', 'PREPARACION'].includes(s)) return 'EN_PREPARACION';
    return 'OCUPADA';
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

  // ACCIÓN: Enviar Orden a Cocina
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

  // ACCIÓN: Enviar a Caja para Cobro
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

  // ACCIÓN: Mover / Cambiar de Mesa
  async function moveTableOrder() {
    if (!activeOrderForSelectedTable || !targetTableId) return;
    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    setActionLoading(true);
    try {
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
        if (selectedTable) await changeTableState(selectedTable.id, 'DISPONIBLE');
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

  // ACCIÓN: Ir al POS para agregar productos a esta cuenta
  function navigateToPOSForAddition() {
    if (!selectedTable) return;
    const addOrderId = activeOrderForSelectedTable?.id || '';
    router.push(`/admin/ventas?addOrderId=${addOrderId}&tableName=${encodeURIComponent(selectedTable.name)}`);
  }

  // ─── DIVIDIR CUENTA — PREPARACIÓN Y LÓGICA DE DIVISIONES ───
  function openSplitModal() {
    if (!activeOrderForSelectedTable) return;
    
    // Inicializar borrador de 2 cuentas por defecto
    const accs: SplitAccount[] = [
      { id: 'split_1', name: 'Cuenta 1', total: 0, items: [], estado: 'PENDIENTE' },
      { id: 'split_2', name: 'Cuenta 2', total: 0, items: [], estado: 'PENDIENTE' }
    ];
    setSplitAccountsDraft(accs);
    setNumPeople(2);
    setSplitMode('POR_PRODUCTOS');

    // Inicializar asignaciones de items a 0 para que el usuario distribuya cada unidad
    const alloc: Record<string, Record<string, number>> = {};
    activeOrderForSelectedTable.items.forEach(item => {
      alloc[item.id] = { split_1: 0, split_2: 0 };
    });
    setItemAllocations(alloc);

    setShowSplitBillModal(true);
  }

  // Cambiar modo de división o número de personas
  function handlePeopleCountChange(count: number) {
    const validCount = Math.max(2, Math.min(10, count));
    setNumPeople(validCount);

    const newAccs: SplitAccount[] = Array.from({ length: validCount }).map((_, i) => ({
      id: `split_${i + 1}`,
      name: `Cuenta ${i + 1}`,
      total: 0,
      items: [],
      estado: 'PENDIENTE'
    }));
    setSplitAccountsDraft(newAccs);

    if (!activeOrderForSelectedTable) return;

    if (splitMode === 'EQUITATIVA') {
      const evenTotal = Math.round((activeOrderForSelectedTable.total / validCount) * 100) / 100;
      setSplitAccountsDraft(newAccs.map((a, idx) => ({
        ...a,
        total: idx === validCount - 1 ? Math.round((activeOrderForSelectedTable.total - (evenTotal * (validCount - 1))) * 100) / 100 : evenTotal
      })));
    } else {
      // Inicializar cada subcuenta en 0 asignados para distribución manual limpia
      const alloc: Record<string, Record<string, number>> = {};
      activeOrderForSelectedTable.items.forEach(item => {
        alloc[item.id] = {};
        newAccs.forEach(acc => {
          alloc[item.id][acc.id] = 0;
        });
      });
      setItemAllocations(alloc);
    }
  }

  // Modificar cantidad asignada a un ítem en una cuenta
  function updateAllocation(itemId: string, accountId: string, delta: number) {
    if (!activeOrderForSelectedTable) return;
    const item = activeOrderForSelectedTable.items.find(i => i.id === itemId);
    if (!item) return;

    setItemAllocations(prev => {
      const currentMap = { ...(prev[itemId] || {}) };
      const currentVal = currentMap[accountId] || 0;
      const nextVal = Math.max(0, currentVal + delta);

      // Calcular total asignado en otras cuentas
      const totalAssignedOther = Object.entries(currentMap)
        .filter(([accId]) => accId !== accountId)
        .reduce((sum, [_, q]) => sum + q, 0);

      if (totalAssignedOther + nextVal > item.cantidad) {
        showToast(`No puedes asignar más de las ${item.cantidad} unidades disponibles de ${item.nombreProducto}`, 'error');
        return prev;
      }

      return {
        ...prev,
        [itemId]: {
          ...currentMap,
          [accountId]: nextVal
        }
      };
    });
  }

  // Recalcular subtotales y productos por cada cuenta dividida borrador
  const computedSplitAccounts = useMemo(() => {
    if (!activeOrderForSelectedTable) return [];
    if (splitMode === 'EQUITATIVA') return splitAccountsDraft;

    return splitAccountsDraft.map(acc => {
      const accItems: SplitAccountItem[] = [];
      let accTotal = 0;

      activeOrderForSelectedTable.items.forEach(item => {
        const allocatedQty = itemAllocations[item.id]?.[acc.id] || 0;
        if (allocatedQty > 0) {
          accItems.push({
            productoId: item.productoId,
            nombreProducto: item.nombreProducto,
            cantidad: allocatedQty,
            precioUnitario: Number(item.precioUnitario)
          });
          accTotal += Number(item.precioUnitario) * allocatedQty;
        }
      });

      return {
        ...acc,
        items: accItems,
        total: Math.round(accTotal * 100) / 100
      };
    });
  }, [splitAccountsDraft, itemAllocations, activeOrderForSelectedTable, splitMode]);

  // Validación: Suma de cuentas debe ser igual al total de la orden
  const splitBalanceCheck = useMemo(() => {
    if (!activeOrderForSelectedTable) return { valid: false, diff: 0, unassignedCount: 0 };
    const sumTotal = computedSplitAccounts.reduce((sum, a) => sum + a.total, 0);
    const diff = Math.round((activeOrderForSelectedTable.total - sumTotal) * 100) / 100;

    let unassignedCount = 0;
    if (splitMode !== 'EQUITATIVA') {
      activeOrderForSelectedTable.items.forEach(item => {
        const assigned = Object.values(itemAllocations[item.id] || {}).reduce((s, q) => s + q, 0);
        if (assigned < item.cantidad) unassignedCount += (item.cantidad - assigned);
      });
    }

    return {
      valid: Math.abs(diff) <= 0.05 && unassignedCount === 0,
      diff,
      unassignedCount
    };
  }, [computedSplitAccounts, activeOrderForSelectedTable, itemAllocations, splitMode]);

  // CONFIRMAR DIVISIÓN DE CUENTA Y GUARDAR EN BD
  async function confirmSplitBill() {
    if (!activeOrderForSelectedTable || !splitBalanceCheck.valid) {
      showToast('Por favor distribuye todos los productos o ajusta los totales antes de confirmar', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrderForSelectedTable.id,
          extraInfoUpdates: {
            splitAccounts: computedSplitAccounts
          }
        })
      });

      if (res.ok) {
        setShowSplitBillModal(false);
        showToast(`Cuenta de la Mesa dividida exitosamente en ${computedSplitAccounts.length} subcuentas`);
        loadData();
      } else {
        showToast('Error al guardar la división de cuenta', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  }

  // REUNIFICAR CUENTAS DIVIDIDAS
  async function reunifySplitAccounts() {
    if (!activeOrderForSelectedTable) return;
    const hasPaid = existingSplitAccounts.some(s => s.estado === 'PAGADO');
    if (hasPaid) {
      showToast('No se puede reunificar porque ya existen subcuentas pagadas', 'error');
      return;
    }

    if (!confirm('¿Deseas reunificar todas las subcuentas en una sola cuenta principal?')) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrderForSelectedTable.id,
          extraInfoUpdates: {
            splitAccounts: null
          }
        })
      });

      if (res.ok) {
        showToast('Cuentas reunificadas en una sola comanda principal');
        loadData();
      }
    } finally {
      setActionLoading(false);
    }
  }

  // COBRAR SUBCUENTA DIVIDIDA INDIVIDUAL
  async function confirmPaySplitAccount() {
    if (!activeOrderForSelectedTable || !selectedSplitToPay) return;
    setActionLoading(true);

    const numRecibido = parseFloat(splitMontoRecibido) || selectedSplitToPay.total;
    const numVuelto = Math.max(0, numRecibido - selectedSplitToPay.total);

    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrderForSelectedTable.id,
          action: 'PAY_SPLIT_ACCOUNT',
          splitAccountId: selectedSplitToPay.id,
          metodoPago: splitPayMethod,
          montoRecibido: numRecibido,
          vuelto: numVuelto
        })
      });

      if (res.ok) {
        setShowPaySplitModal(false);
        setSelectedSplitToPay(null);
        showToast(`¡${selectedSplitToPay.name} pagada exitosamente por $${selectedSplitToPay.total.toFixed(2)}!`);

        // Si todas las subcuentas están pagadas, liberar mesa automáticamente
        const remainingUnpaid = existingSplitAccounts.filter(s => s.id !== selectedSplitToPay.id && s.estado !== 'PAGADO');
        if (remainingUnpaid.length === 0 && selectedTable) {
          await changeTableState(selectedTable.id, 'DISPONIBLE');
          showToast(`Todas las subcuentas han sido pagadas. ${selectedTable.name} marcada como Libre.`);
        }

        loadData();
      } else {
        showToast('Error al registrar el cobro de la subcuenta', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  }

  // COBRAR ORDEN COMPLETA DE MESA DIRECTAMENTE (SIN ENVIAR A CAJA)
  async function confirmPayFullTableOrder() {
    if (!activeOrderForSelectedTable) return;
    setActionLoading(true);

    const order = activeOrderForSelectedTable;
    const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
    const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

    let extra: any = {};
    if (typeof order.extraInfo === 'string') {
      try { extra = JSON.parse(order.extraInfo); } catch {}
    } else if (order.extraInfo && typeof order.extraInfo === 'object') {
      extra = order.extraInfo;
    }

    const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
    const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

    const montoPagado = extra.montoPagadoAcumulado !== undefined 
      ? Number(extra.montoPagadoAcumulado) 
      : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

    const saldoPendiente = extra.saldoPendiente !== undefined 
      ? Number(extra.saldoPendiente) 
      : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

    const amountToPay = montoPagado > 0 ? saldoPendiente : displayTotal;
    const numRecibido = parseFloat(payFullMontoRecibido) || amountToPay;
    const numVuelto = Math.max(0, numRecibido - amountToPay);

    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          action: 'COBRAR_ORDEN_MESA',
          metodoPago: payFullMethod,
          montoRecibido: numRecibido,
          vuelto: numVuelto
        })
      });

      if (res.ok) {
        if (selectedTable) {
          await changeTableState(selectedTable.id, 'DISPONIBLE');
        }
        setShowPayFullOrderModal(false);
        showToast(`🎉 ${selectedTable?.name || 'Mesa'} cobrada exitosamente ($${amountToPay.toFixed(2)}). Mesa libre.`);
        setSelectedTable(null);
        loadData();
      } else {
        showToast('Error al registrar el cobro de la mesa', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] space-y-3">
        <Loader2 className="animate-spin text-[#ea580c] size-10" />
        <p className="text-xs font-bold text-slate-500">Cargando Centro de Gestión de Cuentas y Mesas...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[200] px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-in slide-in-from-top-4 ${
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
            Gestión en tiempo real de comisiones, división de cuentas y estado de salón
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

      {/* Badges de Resumen de Estados Operativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {TABLE_STATES.map(s => {
          const cfg = TABLE_CONFIGS[s] || TABLE_CONFIGS['LIBRE'];
          const count = tables.filter(t => getEffectiveTableState(t) === s).length;

          return (
            <div key={s} className={`bg-white border ${cfg.border} p-3 rounded-2xl flex items-center justify-between shadow-xs`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs">{cfg.icon}</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider truncate">{cfg.label}</span>
              </div>
              <span className={`text-sm font-black ${cfg.text}`}>{count}</span>
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
              <p className="text-xs font-bold">No hay mesas configuradas en el salón.</p>
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
              const stateKey = getEffectiveTableState(table);
              const cfg = TABLE_CONFIGS[stateKey] || TABLE_CONFIGS['LIBRE'];
              const isSelected = selectedTable?.id === table.id;

              let splitInfo = null;
              if (order?.extraInfo) {
                let extra = order.extraInfo;
                if (typeof extra === 'string') { try { extra = JSON.parse(extra); } catch {} }
                if (extra?.splitAccounts && Array.isArray(extra.splitAccounts)) {
                  const totalSplits = extra.splitAccounts.length;
                  const paidSplits = extra.splitAccounts.filter((sa: any) => sa.estado === 'PAGADO').length;
                  splitInfo = { totalSplits, paidSplits };
                }
              }

              return (
                <div 
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`bg-white border-2 rounded-3xl p-4 shadow-sm transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[170px] ${
                    cfg.border
                  } ${isSelected ? 'ring-4 ring-[#ea580c]/30 shadow-md scale-[1.01]' : 'hover:shadow-md hover:border-slate-300'}`}
                >
                  {/* Header Tarjeta */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-base text-slate-900 tracking-tight">{table.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${cfg.badgeBg} ${cfg.badgeText}`}>
                        <span>{cfg.icon}</span> {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-semibold mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="size-3 text-slate-400" /> Cap: <strong>{table.capacity}p</strong>
                      </span>
                      {order && (
                        <span className="flex items-center gap-1 text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md font-bold text-[9px]">
                          <Clock className="size-3" /> {getElapsedTime(order.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ficha Resumen de Consumo */}
                  {order ? (
                    <div className="bg-slate-900 text-white rounded-2xl p-2.5 mt-2 space-y-1 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                            Orden #{order.numeroPedido} • {order.items?.length || 0} productos
                          </span>
                          <span className="text-sm font-black text-emerald-400">
                            ${Number(order.total).toFixed(2)}
                          </span>
                        </div>
                        <ChevronRight className="size-4 text-amber-400" />
                      </div>

                      {splitInfo && (
                        <div className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md flex items-center justify-between pt-0.5">
                          <span className="flex items-center gap-1"><Split className="size-3" /> Dividida</span>
                          <span>{splitInfo.paidSplits} / {splitInfo.totalSplits} Pagadas</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[11px]">Disponible</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        Mesa Libre
                      </span>
                    </div>
                  )}

                  {/* Acciones Rápidas CRUD de Mesa */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg shadow-sm border border-slate-200">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTableForm({ id: table.id, name: table.name, capacity: table.capacity, estado: table.estado });
                        setShowTableModal(true);
                      }}
                      className="p-1 text-slate-600 hover:text-slate-900"
                    >
                      <Edit3 className="size-3" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTable(table.id);
                      }}
                      className="p-1 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── PANEL LATERAL: GESTIÓN DE CUENTA Y SUB-CUENTAS ─── */}
        <div className="w-full lg:w-[420px] shrink-0 bg-white border border-slate-200 rounded-3xl p-5 shadow-lg space-y-4 sticky top-6">
          {!selectedTable ? (
            <div className="py-16 text-center space-y-3 text-slate-400">
              <ShoppingBag className="size-12 mx-auto text-slate-300" />
              <h3 className="font-extrabold text-sm text-slate-700">Selecciona una mesa</h3>
              <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
                Haz clic en cualquier mesa para gestionar consumos, enviar a cocina o dividir la cuenta
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
                  
                  {/* Card Resumen Orden Principal */}
                  {(() => {
                    const order = activeOrderForSelectedTable;
                    const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
                    const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

                    let extra: any = {};
                    if (typeof order.extraInfo === 'string') {
                      try { extra = JSON.parse(order.extraInfo); } catch {}
                    } else if (order.extraInfo && typeof order.extraInfo === 'object') {
                      extra = order.extraInfo;
                    }

                    const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
                    const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

                    const montoPagado = extra.montoPagadoAcumulado !== undefined 
                      ? Number(extra.montoPagadoAcumulado) 
                      : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

                    const saldoPendiente = extra.saldoPendiente !== undefined 
                      ? Number(extra.saldoPendiente) 
                      : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

                    return (
                      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 shadow-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                              ORDEN PRINCIPAL # {order.numeroPedido}
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              {order.nombreCliente}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase">
                            {order.estado}
                          </span>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-slate-800 text-xs">
                          <div className="flex justify-between items-center text-slate-400 font-semibold">
                            <span>Consumo Total ({order.items.length} prod):</span>
                            <span className="font-black text-white text-sm">${displayTotal.toFixed(2)}</span>
                          </div>

                          {montoPagado > 0 && (
                            <div className="flex justify-between items-center text-emerald-400 font-extrabold">
                              <span>✓ Cobrado en Caja/POS:</span>
                              <span>${montoPagado.toFixed(2)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-amber-400 font-extrabold pt-1 border-t border-slate-800/80">
                            <span>⏳ Saldo Pendiente:</span>
                            <span className="font-black text-base text-amber-400">
                              ${(montoPagado > 0 ? saldoPendiente : displayTotal).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ─── VISTA DE CUENTAS DIVIDIDAS (SI YA EXISTEN) ─── */}
                  {existingSplitAccounts.length > 0 ? (
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                          <Split className="size-4 text-[#ea580c]" /> Subcuentas Divididas ({existingSplitAccounts.length})
                        </h4>
                        
                        {/* Botón Reunificar Cuentas (Solo si NINGUNA está pagada) */}
                        {!existingSplitAccounts.some(s => s.estado === 'PAGADO') && (
                          <button
                            onClick={reunifySplitAccounts}
                            className="text-[10px] font-extrabold text-slate-500 hover:text-amber-700 flex items-center gap-1 bg-slate-100 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Undo2 className="size-3" /> Reunificar
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {existingSplitAccounts.map((split, idx) => (
                          <div 
                            key={split.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              split.estado === 'PAGADO'
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : 'bg-amber-50/40 border-amber-200'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                💳 {split.name}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                split.estado === 'PAGADO' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                              }`}>
                                {split.estado === 'PAGADO' ? `PAGADA (${split.metodoPago})` : 'PENDIENTE'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60">
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {split.items?.length || 0} productos asignados
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                ${split.total.toFixed(2)}
                              </span>
                            </div>

                            {/* Botón Cobrar Subcuenta */}
                            {split.estado !== 'PAGADO' && (
                              <button
                                onClick={() => {
                                  setSelectedSplitToPay(split);
                                  setSplitMontoRecibido(split.total.toFixed(2));
                                  setShowPaySplitModal(true);
                                }}
                                className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                              >
                                <DollarSign className="size-3.5" /> Cobrar {split.name} (${split.total.toFixed(2)})
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Lista de Productos de la Orden Completa */
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Productos Consumidos ({activeOrderForSelectedTable.items.length})
                      </h4>

                      <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {activeOrderForSelectedTable.items.map(item => (
                          <div key={item.id} className="p-2 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
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
                  )}

                  {/* ─── GRUPO DE ACCIONES DE LA CUENTA ─── */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    
                    {/* Botones Primarios */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={navigateToPOSForAddition}
                        className="py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <PlusCircle className="size-4" /> Agregar Productos
                      </button>

                      <button
                        onClick={openSplitModal}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Split className="size-4 text-amber-400" /> Dividir Cuenta
                      </button>
                    </div>

                    {/* Botón Cambiar Mesa */}
                    <button
                      onClick={() => setShowMoveTableModal(true)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRightLeft className="size-3.5" /> Cambiar de Mesa
                    </button>

                    {/* Botón Cobro Directo de Mesa */}
                    {existingSplitAccounts.length === 0 && (() => {
                      const order = activeOrderForSelectedTable;
                      const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
                      const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

                      let extra: any = {};
                      if (typeof order.extraInfo === 'string') {
                        try { extra = JSON.parse(order.extraInfo); } catch {}
                      } else if (order.extraInfo && typeof order.extraInfo === 'object') {
                        extra = order.extraInfo;
                      }

                      const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
                      const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

                      const montoPagado = extra.montoPagadoAcumulado !== undefined 
                        ? Number(extra.montoPagadoAcumulado) 
                        : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

                      const saldoPendiente = extra.saldoPendiente !== undefined 
                        ? Number(extra.saldoPendiente) 
                        : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

                      const amountToPay = montoPagado > 0 ? saldoPendiente : displayTotal;

                      return (
                        <button
                          onClick={() => {
                            setPayFullMontoRecibido(amountToPay.toFixed(2));
                            setShowPayFullOrderModal(true);
                          }}
                          disabled={actionLoading}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="size-4" /> Cobrar Cuenta (${amountToPay.toFixed(2)})
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* Si la mesa está LIBRE */
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

      {/* ─── MODAL DIVIDIR CUENTA (3 MODOS: POR PRODUCTOS, POR PERSONAS, EQUITATIVA) ─── */}
      {showSplitBillModal && activeOrderForSelectedTable && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Split className="text-[#ea580c] size-6" />
                  Dividir Cuenta — {selectedTable?.name || 'Mesa'} (Total: ${activeOrderForSelectedTable.total.toFixed(2)})
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Selecciona la modalidad de división para distribuir el pago entre subcuentas independientes.
                </p>
              </div>

              <button 
                onClick={() => setShowSplitBillModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            {/* Selector de Modo de División */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
              {[
                { id: 'POR_PRODUCTOS', label: 'Por Productos', icon: '🍔' },
                { id: 'POR_PERSONAS', label: 'Por Personas', icon: '👥' },
                { id: 'EQUITATIVA', label: 'Equitativa', icon: '⚖️' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSplitMode(m.id as any);
                    handlePeopleCountChange(numPeople);
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    splitMode === m.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {/* Selector de Número de Subcuentas */}
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-xs font-extrabold text-amber-950">¿En cuántas subcuentas dividir?</span>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handlePeopleCountChange(n)}
                    className={`w-8 h-8 rounded-xl font-black text-xs cursor-pointer ${
                      numPeople === n ? 'bg-[#ea580c] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── MODALIDAD A Y B: DISTRIBUCIÓN POR PRODUCTOS Y PERSONAS ─── */}
            {splitMode !== 'EQUITATIVA' ? (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Asignar Cantidades de Productos por Subcuenta
                </h4>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {activeOrderForSelectedTable.items.map(item => {
                    const itemAlloc = itemAllocations[item.id] || {};
                    const totalAssigned = Object.values(itemAlloc).reduce((sum, q) => sum + q, 0);
                    const remaining = item.cantidad - totalAssigned;

                    return (
                      <div key={item.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-black text-sm text-slate-900 block">
                              {item.cantidad} {item.nombreProducto}
                            </span>
                            <span className="text-xs font-bold text-emerald-600">
                              ${Number(item.precioUnitario).toFixed(2)} c/u
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                              remaining === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                            }`}>
                              Asignado: {totalAssigned} / {item.cantidad} (Disp: {remaining})
                            </span>
                          </div>
                        </div>

                        {/* Steppers de asignación por cada subcuenta */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                          {splitAccountsDraft.map(acc => {
                            const qty = itemAlloc[acc.id] || 0;
                            return (
                              <div key={acc.id} className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-700">{acc.name}:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateAllocation(item.id, acc.id, -1)}
                                    disabled={qty === 0}
                                    className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 rounded font-black text-xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center font-black text-xs text-slate-900">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateAllocation(item.id, acc.id, 1)}
                                    disabled={remaining === 0}
                                    className="w-5 h-5 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-30 rounded font-black text-xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ─── MODALIDAD C: DIVISIÓN EQUITATIVA ─── */
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Monto Dividido en Partes Iguales
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {computedSplitAccounts.map((acc, idx) => (
                    <div key={acc.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-center">
                      <span className="text-xs font-black text-slate-900 block">{acc.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={acc.total}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setSplitAccountsDraft(prev => prev.map(a => a.id === acc.id ? { ...a, total: val } : a));
                        }}
                        className="w-full text-center text-sm font-black text-emerald-600 bg-white border border-slate-300 rounded-xl py-1 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── VISTA PREVIA DE SUB-CUENTAS RESULTANTES ─── */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Resumen de Subcuentas A Crear
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {computedSplitAccounts.map(acc => (
                  <div key={acc.id} className="p-2 bg-slate-800 rounded-xl text-xs flex justify-between items-center">
                    <span className="font-bold text-slate-300">{acc.name}:</span>
                    <span className="font-black text-emerald-400">${acc.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                <span>Total Orden: <strong>${activeOrderForSelectedTable.total.toFixed(2)}</strong></span>
                <span className={`font-black ${splitBalanceCheck.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {splitBalanceCheck.valid ? '✅ Suma Perfecta' : `⚠️ Diferencia: $${splitBalanceCheck.diff.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Botones de Acción Modal */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSplitBillModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSplitBill}
                disabled={!splitBalanceCheck.valid || actionLoading}
                className="flex-1 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="size-4" /> Confirmar División
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL COBRAR SUBCUENTA DIVIDIDA ─── */}
      {showPaySplitModal && selectedSplitToPay && activeOrderForSelectedTable && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="text-emerald-600 size-5" />
                Cobrar {selectedSplitToPay.name}
              </h3>
              <button onClick={() => setShowPaySplitModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">Total Subcuenta:</span>
              <span className="text-lg font-black text-emerald-400">${selectedSplitToPay.total.toFixed(2)}</span>
            </div>

            {/* Selector Forma de Pago */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Método de Pago</label>
              <div className="grid grid-cols-3 gap-1">
                {(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSplitPayMethod(m)}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      splitPayMethod === m ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m === 'EFECTIVO' ? '💵 Efectivo' : m === 'TRANSFERENCIA' ? '🏦 Transf.' : '💳 Tarjeta'}
                  </button>
                ))}
              </div>
            </div>

            {splitPayMethod === 'EFECTIVO' && (
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-950">Monto Recibido ($):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={splitMontoRecibido}
                    onChange={e => setSplitMontoRecibido(e.target.value)}
                    className="w-24 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-black text-right outline-none text-slate-900"
                  />
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200">
                  <span className="font-bold text-slate-600">Vuelto / Cambio:</span>
                  <span className="font-black text-emerald-700">
                    ${Math.max(0, (parseFloat(splitMontoRecibido) || selectedSplitToPay.total) - selectedSplitToPay.total).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setShowPaySplitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmPaySplitAccount}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-40 cursor-pointer"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ─── MODAL COBRO DIRECTO DE MESA COMPLETA / SALDO ─── */}
      {showPayFullOrderModal && selectedTable && activeOrderForSelectedTable && (() => {
        const order = activeOrderForSelectedTable;
        const computedTotal = order.items.reduce((sum, it) => sum + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1), 0);
        const displayTotal = computedTotal > 0 ? computedTotal : (Number(order.total) || 0);

        let extra: any = {};
        if (typeof order.extraInfo === 'string') {
          try { extra = JSON.parse(order.extraInfo); } catch {}
        } else if (order.extraInfo && typeof order.extraInfo === 'object') {
          extra = order.extraInfo;
        }

        const rawMontoRecibido = extra.montoRecibido ?? order.payment?.montoPagado ?? 0;
        const isInitialPaid = extra.paymentStatus === 'PAGADO' || order.payment?.estado === 'CONFIRMADO';

        const montoPagado = extra.montoPagadoAcumulado !== undefined 
          ? Number(extra.montoPagadoAcumulado) 
          : (isInitialPaid ? Math.min(Number(rawMontoRecibido) || displayTotal, displayTotal) : 0);

        const saldoPendiente = extra.saldoPendiente !== undefined 
          ? Number(extra.saldoPendiente) 
          : Math.max(0, Math.round((displayTotal - montoPagado) * 100) / 100);

        const amountToPay = montoPagado > 0 ? saldoPendiente : displayTotal;
        const rec = parseFloat(payFullMontoRecibido) || amountToPay;
        const vuelt = Math.max(0, Math.round((rec - amountToPay) * 100) / 100);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                    Cobro Directo en Mesas
                  </span>
                  <h3 className="font-black text-lg text-slate-900">
                    Cobrar {selectedTable.name} (Orden #{order.numeroPedido})
                  </h3>
                </div>
                <button 
                  onClick={() => setShowPayFullOrderModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Resumen del Importe a Cobrar */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Consumo Total de Mesa:</span>
                  <span className="font-extrabold text-white">${displayTotal.toFixed(2)}</span>
                </div>
                {montoPagado > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                    <span>✓ Cobrado Anteriormente:</span>
                    <span>${montoPagado.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                  <span className="font-black text-amber-400 uppercase tracking-wider">Total a Cobrar Ahora:</span>
                  <span className="font-black text-emerald-400 text-xl">${amountToPay.toFixed(2)}</span>
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'EFECTIVO', label: '💵 Efectivo' },
                    { id: 'TRANSFERENCIA', label: '🏦 Transf.' },
                    { id: 'TARJETA', label: '💳 Tarjeta' },
                    { id: 'MIXTO', label: '🔀 Mixto' },
                    { id: 'OTRO', label: '⚡ Otro' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayFullMethod(m.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        payFullMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto Recibido y Cambio */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Monto Recibido ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payFullMontoRecibido}
                  onChange={e => setPayFullMontoRecibido(e.target.value)}
                  className="w-full text-base font-black p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-slate-900"
                />

                {/* Accesos Rápidos */}
                <div className="flex gap-1.5 pt-1">
                  {[amountToPay, 10, 20, 50, 100]
                    .filter((v, i, self) => v >= amountToPay && self.indexOf(v) === i)
                    .map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPayFullMontoRecibido(val.toFixed(2))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-lg transition-colors"
                      >
                        ${val.toFixed(2)}
                      </button>
                    ))}
                </div>
              </div>

              {/* Vuelto / Cambio */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-extrabold text-emerald-900">Vuelto / Cambio a entregar:</span>
                <span className="font-black text-emerald-700 text-lg">${vuelt.toFixed(2)}</span>
              </div>

              {/* Botones de Confirmación */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayFullOrderModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmPayFullTableOrder}
                  disabled={actionLoading || rec < amountToPay - 0.01}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-40 cursor-pointer"
                >
                  {actionLoading ? 'Procesando...' : '✓ Confirmar Cobro & Liberar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      
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
