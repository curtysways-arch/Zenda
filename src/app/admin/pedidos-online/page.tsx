'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, PackageCheck, Bike, ShoppingBag, Check, X, Clock, MapPin, Phone,
  User, Loader2, AlertCircle, RefreshCw, ChevronRight, DollarSign, Filter,
  MessageCircle, Printer, ExternalLink, Sparkles, Eye, ShieldCheck, AlertTriangle,
  Maximize2, ArrowLeft, Truck, ChefHat, Lock
} from 'lucide-react';

interface PedidoItem {
  id: string;
  productoId?: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

interface OrderPayment {
  id: string;
  estado: string;
  monto: number;
  montoExcedente?: number;
  motivoRechazo?: string;
  evidences?: { id: string; fileUrl: string; createdAt: string }[];
}

interface Pedido {
  id: string;
  codigo?: string;
  numeroPedido?: number;
  estado: string;
  estadoDisponibilidad?: string;
  tipoEntrega: 'RETIRO' | 'DOMICILIO' | 'DELIVERY_ORDER' | 'PICKUP_ORDER' | string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  subtotal: number;
  costoEnvio: number;
  total: number;
  extraInfo?: any;
  items: PedidoItem[];
  payment?: OrderPayment;
  createdAt: string;
}

export default function PedidosOnlinePage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<'PENDING' | 'PREPARING' | 'REFUNDS' | 'ALL'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de Orden Seleccionada para Detalle a Pantalla Completa
  const [fullscreenOrder, setFullscreenOrder] = useState<Pedido | null>(null);

  // Estado de Logística y Repartidores
  const [approvedDrivers, setApprovedDrivers] = useState<any[]>([]);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, any>>({});
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assignedDriver, setAssignedDriver] = useState<string>('Repartidor de Local');

  // Modal de Disponibilidad & Propuesta de Cambios
  const [selectedPrepTime, setSelectedPrepTime] = useState<number>(20);
  const [itemsAvailability, setItemsAvailability] = useState<Record<string, boolean>>({});
  const [itemsQuantities, setItemsQuantities] = useState<Record<string, number>>({});
  const [disableCatalogProducts, setDisableCatalogProducts] = useState(true);
  const [confirmedAvailabilityOrderIds, setConfirmedAvailabilityOrderIds] = useState<Record<string, boolean>>({});

  // Modal de Confirmación de Reembolso
  const [refundMethod, setRefundMethod] = useState<string>('TRANSFERENCIA');
  const [refundRef, setRefundRef] = useState<string>('');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [showCustomRefundInput, setShowCustomRefundInput] = useState(false);
  const [customRefundAmount, setCustomRefundAmount] = useState('');

  const fetchLogisticsData = async () => {
    try {
      const [driversRes, assignmentsRes] = await Promise.all([
        fetch('/api/logistics/resources'),
        fetch('/api/logistics/assignments')
      ]);

      if (driversRes.ok) {
        const dData = await driversRes.json();
        setApprovedDrivers(Array.isArray(dData) ? dData : []);
      }

      if (assignmentsRes.ok) {
        const aData = await assignmentsRes.json();
        if (Array.isArray(aData)) {
          const map: Record<string, any> = {};
          aData.forEach((asgn: any) => {
            if (asgn.ordenReferenciaId) {
              map[asgn.ordenReferenciaId] = asgn;
            }
          });
          setAssignmentsMap(map);
        }
      }
    } catch (err) {
      console.warn('[LOGISTICS_FETCH_ERROR]', err);
    }
  };

  const handleAssignDriverToOrder = async (pedidoTarget: Pedido, driverId: string) => {
    if (!driverId) return;
    setProcessingId(pedidoTarget.id);
    try {
      const res = await fetch('/api/logistics/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: driverId,
          tipo: 'ENTREGA',
          ordenReferenciaId: pedidoTarget.id,
          ordenReferenciaTipo: 'PEDIDO_ONLINE',
          clienteNombre: pedidoTarget.nombreCliente,
          clienteTelefono: pedidoTarget.telefonoCliente,
          clienteDireccion: pedidoTarget.direccionCliente || 'Entrega a Domicilio'
        })
      });
      if (res.ok) {
        const newAsgn = await res.json();
        setAssignmentsMap(prev => ({ ...prev, [pedidoTarget.id]: newAsgn }));
        const drv = approvedDrivers.find(d => d.id === driverId);
        if (drv) setAssignedDriver(drv.name);
        await fetchOnlineOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error asignando repartidor');
      }
    } catch (e) {
      console.error('Error asignando repartidor:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateAssignmentStatus = async (assignmentId: string | undefined, orderId: string, newStatus: string) => {
    setProcessingId(orderId);
    try {
      if (assignmentId) {
        const res = await fetch(`/api/logistics/assignments/${assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: newStatus })
        });
        if (res.ok) {
          const updatedAsgn = await res.json();
          setAssignmentsMap(prev => ({ ...prev, [orderId]: updatedAsgn }));
        }
      }

      let targetOrderState = '';
      if (newStatus === 'ACEPTADO') targetOrderState = 'EN_PREPARACION';
      if (newStatus === 'ENTREGADO_A_REPARTIDOR' || newStatus === 'DESPACHADO') targetOrderState = 'ENTREGADO_A_REPARTIDOR';
      if (newStatus === 'EN_RUTA') targetOrderState = 'EN_CAMINO';
      if (newStatus === 'COMPLETADO') targetOrderState = 'ENTREGADO';
      
      if (targetOrderState) {
        await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orderId, estado: targetOrderState })
        });
      }
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error actualizando asignación:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnassignDriver = async (assignmentId: string, orderId: string) => {
    setProcessingId(orderId);
    try {
      await fetch(`/api/logistics/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'CANCELADO' })
      });
      setAssignmentsMap(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error desasignando repartidor:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDispatchOrder = async (pedidoTarget: Pedido, targetState: string) => {
    setProcessingId(pedidoTarget.id);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoTarget.id,
          estado: targetState,
          extraInfoUpdates: { assignedDriver: assignedDriver || 'Repartidor de Local' }
        })
      });
      if (res.ok) {
        setFullscreenOrder(null);
        await fetchOnlineOrders();
      }
    } catch (e) {
      console.error('Error al despachar pedido:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCleanTestOrders = async () => {
    if (!confirm('¿Estás seguro de eliminar todos los pedidos de prueba de este restaurante?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clean-test-orders', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Pedidos de prueba eliminados correctamente.');
        await fetchOnlineOrders();
      } else {
        alert(data.error || 'Error al eliminar pedidos de prueba.');
      }
    } catch (err) {
      console.error('Error al limpiar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineOrders = async () => {
    try {
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        const onlineOnly = (data || []).filter((p: any) => {
          const ch = (p.extraInfo?.channel || p.extraInfo?.canal || 'WEB').toUpperCase();
          return ch !== 'POS' && ch !== 'MOSTRADOR';
        });
        setPedidos(onlineOnly);

        if (fullscreenOrder) {
          const updatedTarget = onlineOnly.find((p: Pedido) => p.id === fullscreenOrder.id);
          if (updatedTarget) setFullscreenOrder(updatedTarget);
        }
      }
      await fetchLogisticsData();
    } catch (e) {
      console.error('Error fetching online orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineOrders();
    const interval = setInterval(fetchOnlineOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  // Abrir Orden a Pantalla Completa y cargar disponibilidad inicial
  const handleOpenFullscreenOrder = (pedido: Pedido) => {
    setFullscreenOrder(pedido);
    const initialAvailability: Record<string, boolean> = {};
    const initialQuantities: Record<string, number> = {};
    (pedido.items || []).forEach(it => {
      initialAvailability[it.id] = true;
      initialQuantities[it.id] = it.cantidad;
    });
    setItemsAvailability(initialAvailability);
    setItemsQuantities(initialQuantities);
  };

  // 1. CONFIRMAR DISPONIBILIDAD O ENVIAR PROPUESTA DE CAMBIOS
  const handleSaveDisponibilidad = async (pedidoTarget: Pedido) => {
    setProcessingId(pedidoTarget.id);

    const proposedItems: any[] = [];
    const outOfStockItemsList: any[] = [];
    const outOfStockProductIds: string[] = [];

    (pedidoTarget.items || []).forEach((it: any) => {
      const isAvail = itemsAvailability[it.id] !== false && (!it.productoId || itemsAvailability[it.productoId] !== false);
      const effectiveQty = itemsQuantities[it.id] !== undefined ? itemsQuantities[it.id] : it.cantidad;

      if (isAvail && effectiveQty > 0) {
        proposedItems.push({
          id: it.id,
          productoId: it.productoId,
          nombreProducto: it.nombreProducto,
          cantidad: effectiveQty,
          precioUnitario: it.precioUnitario
        });

        if (effectiveQty < it.cantidad) {
          outOfStockItemsList.push({
            id: it.id,
            productoId: it.productoId,
            nombreProducto: it.nombreProducto,
            cantidad: it.cantidad - effectiveQty,
            precioUnitario: it.precioUnitario
          });
          if (it.productoId) outOfStockProductIds.push(it.productoId);
        }
      } else {
        outOfStockItemsList.push({
          id: it.id,
          productoId: it.productoId,
          nombreProducto: it.nombreProducto,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario
        });
        if (it.productoId) outOfStockProductIds.push(it.productoId);
      }
    });

    const isAllAvailable = outOfStockItemsList.length === 0;

    try {
      if (isAllAvailable) {
        const res = await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pedidoTarget.id,
            action: 'CONFIRMAR_DISPONIBILIDAD'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(`Error al confirmar disponibilidad: ${errData.error || 'Error en el servidor'}`);
          return;
        }
        setFullscreenOrder((prev: any) => prev ? { ...prev, estadoDisponibilidad: 'PRODUCTOS_CONFIRMADOS' } : prev);
        await fetchOnlineOrders();
      } else {
        const newSubtotal = proposedItems.reduce((sum, it) => sum + ((Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1)), 0);
        const shippingCost = Number(pedidoTarget.costoEnvio || 0);
        const newTotal = newSubtotal + shippingCost;

        const res = await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pedidoTarget.id,
            action: 'SOLICITAR_CAMBIOS',
            proposedItems,
            outOfStockItemsList,
            originalSubtotal: pedidoTarget.subtotal,
            subtotal: newSubtotal,
            total: newTotal,
            outOfStockProductIds,
            disableOutOfStock: disableCatalogProducts
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(`Error al solicitar cambios: ${errData.error || 'Error en el servidor'}`);
          return;
        }
        setFullscreenOrder((prev: any) => prev ? { ...prev, estadoDisponibilidad: 'CAMBIOS_PROPUESTOS' } : prev);
      }

      setConfirmedAvailabilityOrderIds(prev => ({ ...prev, [pedidoTarget.id]: true }));
      await fetchOnlineOrders();
    } catch (err) {
      console.error('Error guardando disponibilidad:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // 2. VERIFICAR PAGO (Solo verifica el comprobante financiero sin alterar estado del pedido ni cerrar ventana)
  const handleVerifyPayment = async (pedidoId: string) => {
    setProcessingId(pedidoId);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedidoId, action: 'VERIFICAR_PAGO' })
      });
      if (res.ok) {
        if (fullscreenOrder && fullscreenOrder.id === pedidoId) {
          setFullscreenOrder(prev => prev ? {
            ...prev,
            payment: { ...prev.payment, estado: 'PAGO_VERIFICADO' } as any
          } : null);
        }
        await fetchOnlineOrders();
      }
    } catch (e) {
      console.error('Error verificando pago:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // RECHAZAR PAGO
  const handleRejectPayment = async (pedidoId: string) => {
    const reason = prompt('Motivo de rechazo del pago (ej: Comprobante no legible o monto incorrecto):');
    if (!reason) return;
    setProcessingId(pedidoId);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedidoId, action: 'RECHAZAR_PAGO', motivoRechazo: reason })
      });
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error rechazando pago:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // 3. ACEPTACIÓN DEFINITIVA -> Pasa a EN_PREPARACION en Cocina y Cierra Ventana
  const handleAcceptOrderToKitchen = async (pedidoTarget: Pedido) => {
    setProcessingId(pedidoTarget.id);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoTarget.id,
          action: 'ACEPTAR_PEDIDO',
          prepTimeMinutes: selectedPrepTime
        })
      });
      if (res.ok) {
        setFullscreenOrder(null);
        await fetchOnlineOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al aceptar el pedido');
      }
    } catch (e) {
      console.error('Error aceptando pedido:', e);
    } finally {
      setProcessingId(null);
    }
  };

  // 4. CONFIRMAR DEVOLUCIÓN FINANCIERA DE REEMBOLSO
  const handleConfirmRefund = async (pedidoTarget: Pedido) => {
    setProcessingId(pedidoTarget.id);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoTarget.id,
          action: 'CONFIRMAR_DEVOLUCION',
          metodoDevolucion: refundMethod,
          referenciaDevolucion: refundRef,
          observacionDevolucion: refundNotes
        })
      });
      setRefundRef('');
      setRefundNotes('');
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error procesando devolución:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRegisterCustomRefund = async (pedidoId: string) => {
    const amt = parseFloat(customRefundAmount || '0');
    if (!amt || amt <= 0) {
      alert('Por favor ingresa un monto válido mayor a $0.00');
      return;
    }
    setProcessingId(pedidoId);
    try {
      await fetch('/api/admin/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pedidoId,
          action: 'REGISTRAR_REEMBOLSO_PENDIENTE',
          montoReembolso: amt
        })
      });
      setShowCustomRefundInput(false);
      setCustomRefundAmount('');
      await fetchOnlineOrders();
    } catch (e) {
      console.error('Error registrando reembolso manual:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const openWhatsApp = (phone: string, nombre: string, orderId: string, customMsg?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `593${cleanPhone.slice(1)}` : cleanPhone;
    const message = encodeURIComponent(customMsg || `Hola ${nombre}, te saludamos de tu restaurante. Recibimos tu pedido #${orderId} y estamos procesándolo! 🛵💨`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handlePrintTicket = (pedido: Pedido) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    const code = pedido.codigo || pedido.numeroPedido || pedido.id.slice(-6);
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Pedido #${code}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; width: 280px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; font-size: 16px; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>PEDIDO #${code}</h2>
          <div class="line"></div>
          <p><strong>Cliente:</strong> ${pedido.nombreCliente}</p>
          <p><strong>Telf:</strong> ${pedido.telefonoCliente}</p>
          <p><strong>Tipo:</strong> ${pedido.tipoEntrega}</p>
          ${pedido.direccionCliente ? `<p><strong>Dirección:</strong> ${pedido.direccionCliente}</p>` : ''}
          <div class="line"></div>
          <p class="bold">PRODUCTOS:</p>
          ${(pedido.items || []).map(i => `<div class="flex"><span>${i.cantidad}x ${i.nombreProducto}</span><span>$${((Number(i.precioUnitario) || 0) * i.cantidad).toFixed(2)}</span></div>`).join('')}
          <div class="line"></div>
          <div class="flex bold"><span>TOTAL:</span><span>$${(Number(pedido.total) || 0).toFixed(2)}</span></div>
          <div class="line"></div>
          <p style="text-align:center; font-size:10px;">¡Gracias por tu compra!</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Helper para detectar cualquier discrepancia/excedente de pago o reembolso pendiente (exclusivo para productos)
  const getRefundDetails = (p: any) => {
    const extra = typeof p.extraInfo === 'string' ? (() => { try { return JSON.parse(p.extraInfo); } catch(_) { return {}; } })() : (p.extraInfo || {});
    const paymentState = (p.payment?.estado || extra.paymentStatus || '').toUpperCase();
    
    // Subtotales de Productos (Exclusivos sin incluir envío)
    const currentSubtotal = Number(p.subtotal || (p.items || []).reduce((acc: number, i: any) => acc + ((Number(i.precioUnitario) || 0) * (Number(i.cantidad) || 1)), 0));
    
    const outOfStockItemsList = Array.isArray(extra.outOfStockItemsList) ? extra.outOfStockItemsList : [];
    const outOfStockSubtotal = outOfStockItemsList.reduce((sum: number, it: any) => {
      return sum + ((Number(it.precioUnitario || it.precio) || 0) * (Number(it.cantidad) || 1));
    }, 0);

    const dbExcedente = Number(p.payment?.montoExcedente || extra.montoExcedente || 0);

    // Determinar el Subtotal Original de Productos ($16.50 en el ejemplo)
    let originalSubtotal = 0;
    if (extra.originalSubtotal && Number(extra.originalSubtotal) > 0) {
      originalSubtotal = Number(extra.originalSubtotal);
    } else if (dbExcedente > 0) {
      originalSubtotal = currentSubtotal + dbExcedente;
    } else if (outOfStockSubtotal > 0) {
      if (outOfStockSubtotal > currentSubtotal && extra.proposedSubtotal) {
        originalSubtotal = outOfStockSubtotal;
      } else {
        originalSubtotal = currentSubtotal + outOfStockSubtotal;
      }
    } else {
      originalSubtotal = currentSubtotal;
    }

    // Reembolso por productos (diferencia estricta entre productos pagados y productos finales)
    let montoDevolver = 0;
    if (dbExcedente > 0) {
      montoDevolver = dbExcedente;
    } else if (originalSubtotal > currentSubtotal + 0.01) {
      montoDevolver = Number((originalSubtotal - currentSubtotal).toFixed(2));
    } else if (outOfStockSubtotal > 0) {
      montoDevolver = Number(outOfStockSubtotal.toFixed(2));
    }

    const isRefunded = paymentState === 'REEMBOLSADO' || Boolean(extra.refundCompleted);
    const hasRefund = !isRefunded && (paymentState === 'REEMBOLSO_PENDIENTE' || montoDevolver > 0.01);

    const envioCost = Number(p.costoEnvio || 0);

    return {
      hasRefund,
      isRefunded,
      montoDevolver: Number(montoDevolver.toFixed(2)),
      originalProdSubtotal: Number(originalSubtotal.toFixed(2)),
      currentProdSubtotal: Number(currentSubtotal.toFixed(2)),
      motivo: extra.outOfStockItemsList?.length ? 'Producto no disponible en local' : (extra.motivoReembolso || 'Cambio / Ajuste de productos en pedido'),
      envio: Number(envioCost.toFixed(2)),
      codigoReembolso: `R-${p.codigo || p.numeroPedido || p.id.slice(-6).toUpperCase()}`,
      referenciaDevolucion: extra.referenciaDevolucion || p.payment?.referenciaDevolucion || null,
      metodoDevolucion: extra.metodoDevolucion || p.payment?.metodoDevolucion || null,
      devolucionAt: extra.devolucionAt || p.payment?.devolucionAt || null,
      devolucionUser: extra.devolucionUser || p.payment?.devolucionUser || null,
    };
  };

  // Filtrar pedidos por estado
  const filteredOrders = pedidos.filter(p => {
    if (filterState === 'PENDING') return p.estado === 'RECIBIDO' || p.estado === 'CAMBIOS_SOLICITADOS';
    if (filterState === 'PREPARING') return ['ACEPTADO', 'EN_PREPARACION', 'LISTO', 'LISTA', 'ASIGNADO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ESPERANDO_REPARTIDOR', 'LLEGO', 'EN_CAMINO', 'EN_RUTA'].includes(p.estado);
    if (filterState === 'REFUNDS') return getRefundDetails(p).hasRefund;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.nombreCliente.toLowerCase().includes(q) ||
        p.telefonoCliente.includes(q) ||
        (p.codigo && p.codigo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingRefundsCount = pedidos.filter(p => getRefundDetails(p).hasRefund).length;
  const outOfStockCount = pedidos.filter(p => p.estadoDisponibilidad === 'CAMBIOS_SOLICITADOS').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white !text-white">Gestión Oficial de Pedidos Online</h1>
            <p className="text-xs text-slate-400 font-medium">Haz clic en cualquier tarjeta para abrir la gestión a pantalla completa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOnlineOrders}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button
            onClick={handleCleanTestOrders}
            disabled={loading}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <X className="w-3.5 h-3.5" /> Vaciar Pedidos de Prueba
          </button>
        </div>
      </div>

      {/* ALERTAS GENERALES EN ADMIN */}
      {outOfStockCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Hay {outOfStockCount} pedido(s) con propuesta de cambio de productos enviada al cliente.</span>
          </span>
          <button onClick={() => setFilterState('PENDING')} className="underline hover:text-amber-950 cursor-pointer">
            Ver Pedidos
          </button>
        </div>
      )}

      {/* FILTROS & TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 text-xs font-black">
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${filterState === 'ALL' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Todos ({pedidos.length})
          </button>
          <button
            onClick={() => setFilterState('PENDING')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${filterState === 'PENDING' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Nuevos Recibidos
          </button>
          <button
            onClick={() => setFilterState('PREPARING')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${filterState === 'PREPARING' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            En Preparación
          </button>
          <button
            onClick={() => setFilterState('REFUNDS')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer relative ${filterState === 'REFUNDS' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
          >
            🔴 Reembolsos Pendientes
            {pendingRefundsCount > 0 && (
              <span className="ml-1.5 bg-white text-rose-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {pendingRefundsCount}
              </span>
            )}
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, teléfono o #pedido..."
          className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold w-full sm:w-64 focus:bg-white transition-all"
        />
      </div>

      {/* GRILLA DE PEDIDOS */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="text-xs font-black uppercase tracking-widest">Cargando pedidos online...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center space-y-2">
          <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="font-extrabold text-slate-700 text-sm">No hay pedidos en este estado</h3>
          <p className="text-xs text-slate-400">Los nuevos pedidos realizados por clientes aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(pedido => {
            const extra = typeof pedido.extraInfo === 'string' ? (() => { try { return JSON.parse(pedido.extraInfo); } catch(_) { return {}; } })() : (pedido.extraInfo || {});
            const isDelivery = pedido.tipoEntrega === 'DELIVERY_ORDER' || pedido.tipoEntrega === 'DOMICILIO';
            const isProdConfirmed = (pedido.estadoDisponibilidad || pedido.extraInfo?.estadoDisponibilidad) === 'PRODUCTOS_CONFIRMADOS' || (pedido.estadoDisponibilidad || pedido.extraInfo?.estadoDisponibilidad) === 'CAMBIOS_ACEPTADOS';
            const isPaymentVerified = pedido.payment?.estado === 'PAGO_VERIFICADO' || pedido.payment?.estado === 'CONFIRMADO';
            const canAcceptOrder = isProdConfirmed && isPaymentVerified && ['RECIBIDO', 'PENDIENTE', 'PRODUCTOS_CONFIRMADOS', 'CAMBIOS_ACEPTADOS'].includes(pedido.estado);
            const refundInfo = getRefundDetails(pedido);
            const hasPendingRefund = refundInfo.hasRefund;

            if (filterState === 'REFUNDS') {
              return (
                <div
                  key={pedido.id}
                  className="bg-white border-2 border-rose-300 rounded-3xl p-5 shadow-lg space-y-4 text-left relative overflow-hidden"
                >
                  {/* Encabezado del Reembolso */}
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                        Reembolso {refundInfo.codigoReembolso}
                      </span>
                      <h3 className="text-base font-black text-slate-900 leading-tight mt-1">
                        Pedido #{pedido.codigo || pedido.numeroPedido || pedido.id.slice(-6).toUpperCase()}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      refundInfo.isRefunded ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white shadow-sm'
                    }`}>
                      {refundInfo.isRefunded ? '✅ REEMBOLSADO' : '🔴 REEMBOLSO_PENDIENTE'}
                    </span>
                  </div>

                  {/* Datos del Cliente y Motivo */}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800">
                      👤 <span className="font-black text-slate-900">{pedido.nombreCliente}</span> ({pedido.telefonoCliente})
                    </p>
                    <p className="text-rose-950 font-bold bg-rose-50 border border-rose-200 p-2 rounded-xl">
                      📌 <span className="font-black">Motivo:</span> {refundInfo.motivo}
                    </p>
                  </div>

                  {/* Desglose Exclusivo de Productos */}
                  <div className="bg-rose-50/50 rounded-2xl border border-rose-200/80 p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Monto originalmente pagado por productos:</span>
                      <span className="font-mono font-black text-slate-900">${refundInfo.originalProdSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Nuevo total de productos:</span>
                      <span className="font-mono font-black text-slate-900">${refundInfo.currentProdSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed border-rose-300 pt-2 flex justify-between font-black text-sm text-rose-700">
                      <span>💰 Monto a devolver:</span>
                      <span className="font-mono text-base text-rose-700">${refundInfo.montoDevolver.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Info de Envío (Independiente) */}
                  <div className="bg-slate-100/90 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-200">
                    <span className="font-bold text-slate-600">🛵 Envío (Fulfillment): ${refundInfo.envio.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Estado: Independiente</span>
                  </div>

                  {/* Formulario de Procesar Devolución */}
                  {!refundInfo.isRefunded ? (
                    <div className="pt-2 border-t border-rose-100 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-black uppercase text-rose-900 block mb-1">Método</label>
                          <select
                            value={refundMethod}
                            onChange={e => setRefundMethod(e.target.value)}
                            className="w-full p-2 bg-white border border-rose-200 rounded-xl font-bold text-xs text-slate-800"
                          >
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="EFECTIVO">Efectivo en Caja</option>
                            <option value="OTRO">Otro Método</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-rose-900 block mb-1">Comprobante / Ref.</label>
                          <input
                            type="text"
                            value={refundRef}
                            onChange={e => setRefundRef(e.target.value)}
                            placeholder="Nº comprobante..."
                            className="w-full p-2 bg-white border border-rose-200 rounded-xl font-semibold text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmRefund(pedido)}
                        disabled={processingId === pedido.id}
                        className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Procesar Devolución (${refundInfo.montoDevolver.toFixed(2)})</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-100/80 p-3 rounded-2xl border border-emerald-300 text-emerald-950 text-xs space-y-1 font-bold">
                      <div className="flex items-center justify-between">
                        <span>✅ REEMBOLSADO</span>
                        <span>${refundInfo.montoDevolver.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-emerald-800">
                        Método: {refundInfo.metodoDevolucion || refundMethod} {refundInfo.referenciaDevolucion ? `| Comprobante: ${refundInfo.referenciaDevolucion}` : ''}
                      </p>
                      {refundInfo.devolucionUser && (
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          Procesado por: {refundInfo.devolucionUser}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Ver Pedido Completo */}
                  <button
                    type="button"
                    onClick={() => handleOpenFullscreenOrder(pedido)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Pedido Completo</span>
                  </button>
                </div>
              );
            }

            return (
              <div
                key={pedido.id}
                onClick={() => handleOpenFullscreenOrder(pedido)}
                className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3.5 transition-all hover:shadow-xl hover:scale-[1.01] cursor-pointer relative text-left group ${
                  hasPendingRefund 
                    ? 'border-rose-300 bg-rose-50/40 ring-2 ring-rose-400/30' 
                    : pedido.estado === 'RECIBIDO' 
                    ? 'border-amber-300 ring-2 ring-amber-400/20' 
                    : 'border-slate-200'
                }`}
              >
                {/* Header Pedido */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                      {isDelivery ? '🛵 Delivery Online' : '🏬 Para Retirar'}
                      <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors ml-1" />
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">
                      #{pedido.codigo || pedido.numeroPedido || pedido.id.slice(-6).toUpperCase()}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {/* Badge de Estado en Cocina */}
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border ${
                      (pedido.extraInfo?.kitchenStatus === 'LISTO' || pedido.estado === 'LISTO')
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    }`}>
                      <ChefHat className="w-3 h-3 text-amber-600" />
                      {(pedido.extraInfo?.kitchenStatus === 'LISTO' || pedido.estado === 'LISTO') ? 'Cocina: Listo' : 'Cocina: En Preparación'}
                    </span>

                    {/* Badge de Estado General / Repartidor */}
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                      pedido.estado === 'EN_PREPARACION'
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : (pedido.estado === 'REPARTIDOR_ASIGNADO' || pedido.extraInfo?.assignedDriver)
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
                        : pedido.estado === 'CAMBIOS_SOLICITADOS'
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : pedido.estado === 'RECIBIDO'
                        ? 'bg-amber-400 text-slate-950 border-amber-500'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      {pedido.estado}
                    </span>
                  </div>
                </div>

                {/* Cliente */}
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-extrabold text-slate-900">{pedido.nombreCliente}</p>
                  <p className="font-semibold text-slate-500">{pedido.telefonoCliente}</p>
                  {pedido.direccionCliente && (
                    <p className="text-[11px] text-slate-500 truncate">📍 {pedido.direccionCliente}</p>
                  )}
                </div>

                {/* Ítems del Pedido */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Productos</span>
                  {pedido.items?.map(it => (
                    <div key={it.id} className="flex justify-between font-bold text-slate-800">
                      <span>{it.cantidad || 1}x {it.nombreProducto}</span>
                      <span>${((Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  {Number(extra?.discountAmount || extra?.descuento || 0) > 0 && (
                    <div className="flex justify-between font-extrabold text-emerald-600 text-[11px] pt-1 border-t border-emerald-100/80">
                      <span>🎁 Promo ({extra?.promotionTitle || '2x1'}):</span>
                      <span>-${(Number(extra?.discountAmount || extra?.descuento) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(extra?.merchantShippingSubsidy || extra?.shippingDiscount || 0) > 0 && (
                    <div className="pt-1.5 mt-1 border-t border-amber-200/80 text-[10px] space-y-0.5 font-bold text-slate-700">
                      <div className="flex justify-between text-slate-500">
                        <span>🛵 Tarifa Real Driver:</span>
                        <span>${(Number(extra?.shippingAmount || extra?.driverEarnings || 4.00)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-amber-700 font-extrabold">
                        <span>🚚 Subsidio Restaurante:</span>
                        <span>-${(Number(extra?.merchantShippingSubsidy || extra?.shippingDiscount)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-extrabold">
                        <span>💵 Cliente Paga Envío:</span>
                        <span>${(Number(extra?.customerShippingAmount || pedido.costoEnvio || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between font-black text-slate-900">
                    <span>Total:</span>
                    <span className="text-emerald-600 text-sm">
                      ${(() => {
                        const itemsSum = (pedido.items || []).reduce((acc: number, i: any) => acc + ((Number(i.precioUnitario) || 0) * (Number(i.cantidad) || 1)), 0);
                        const disc = Number(extra?.discountAmount || extra?.descuento || 0);
                        const custShipping = Number(extra?.customerShippingAmount !== undefined ? extra.customerShippingAmount : (pedido.costoEnvio || 0));
                        const calcTotal = itemsSum - disc + custShipping;
                        return (calcTotal > 0 ? calcTotal : Number(pedido.total || 0)).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>

                {/* ESTADO PAGO & REEMBOLSO */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-extrabold">
                    <span>Pago:</span>
                    <span className={`px-2 py-0.5 rounded-md uppercase text-[10px] ${
                      isPaymentVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {pedido.payment?.estado || 'PENDIENTE'}
                    </span>
                  </div>

                  {hasPendingRefund && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-2 shadow-sm">
                      <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                        <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-200/70 px-2 py-0.5 rounded-md">
                          {refundInfo.codigoReembolso}
                        </span>
                        <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
                          🔴 REEMBOLSO PENDIENTE
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] font-medium text-slate-700">
                        <div className="flex justify-between">
                          <span>Productos pagados originalmente:</span>
                          <span className="font-mono font-bold text-slate-900">${refundInfo.originalProdSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Productos después de cambios:</span>
                          <span className="font-mono font-bold text-slate-900">${refundInfo.currentProdSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-rose-700 pt-1 border-t border-dashed border-rose-200">
                          <span>💰 Reembolso por productos:</span>
                          <span className="font-mono text-sm">${refundInfo.montoDevolver.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-100/90 rounded-lg p-1.5 flex justify-between text-[10px] text-slate-600 font-bold border border-slate-200">
                        <span>🛵 Envío (Fulfillment): ${refundInfo.envio.toFixed(2)}</span>
                        <span className="text-slate-500">Estado: Independiente</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Abrir Pantalla Completa */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFullscreenOrder(pedido);
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                    <span>Gestionar a Pantalla Completa</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL FULLSCREEN DE GESTIÓN DE PEDIDO ── */}
      {fullscreenOrder && (() => {
        const order = fullscreenOrder;
        const isDelivery = order.tipoEntrega === 'DELIVERY_ORDER' || order.tipoEntrega === 'DOMICILIO';
        const isProdConfirmed = (order.estadoDisponibilidad || order.extraInfo?.estadoDisponibilidad) === 'PRODUCTOS_CONFIRMADOS' || (order.estadoDisponibilidad || order.extraInfo?.estadoDisponibilidad) === 'CAMBIOS_ACEPTADOS';
        const isPaymentVerified = order.payment?.estado === 'PAGO_VERIFICADO' || order.payment?.estado === 'CONFIRMADO';
        const canAcceptOrder = isProdConfirmed && isPaymentVerified && ['RECIBIDO', 'PENDIENTE', 'PRODUCTOS_CONFIRMADOS', 'CAMBIOS_ACEPTADOS'].includes(order.estado);
        const hasPendingRefund = order.payment?.estado === 'REEMBOLSO_PENDIENTE';
        const evidenceUrl = order.payment?.evidences?.[0]?.fileUrl;
        const totalVal = Number(order.total) || 0;
        const isOrderAcceptedOrPrepared = ['ACEPTADO', 'EN_PREPARACION', 'LISTO', 'LISTA', 'ASIGNADO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ESPERANDO_REPARTIDOR', 'LLEGO', 'EN_CAMINO', 'EN_RUTA', 'RUTA', 'WAITING_CLIENT', 'ESPERANDO_CLIENTE', 'ENTREGADO', 'FINALIZADO', 'COMPLETADO'].includes(order.estado);
        const isAvailabilityConfirmed = isOrderAcceptedOrPrepared || order.estadoDisponibilidad === 'PRODUCTOS_CONFIRMADOS' || order.estadoDisponibilidad === 'CAMBIOS_PROPUESTOS' || Boolean(confirmedAvailabilityOrderIds[order.id]);

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md overflow-y-auto flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-6xl mx-auto my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* HEADER PANTALLA COMPLETA */}
              <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFullscreenOrder(null)}
                    className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                  </button>
                  <div className="h-6 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block">
                      {isDelivery ? '🛵 PEDIDO DELIVERY ONLINE' : '🏬 PEDIDO PARA RETIRAR'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Gestión Pedido #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase border ${
                    order.estado === 'EN_PREPARACION'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : order.estado === 'LISTO'
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : order.estado === 'RECIBIDO'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}>
                    Estado: {order.estado}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFullscreenOrder(null)}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* CUERPO DEL MODAL (3 COLUMNAS EN DESKTOP) */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/50">
                
                {/* COLUMNA 1: INFORMACIÓN DEL CLIENTE Y LOGÍSTICA */}
                <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs h-fit">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-500" />
                    1. Información del Cliente
                  </h3>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">{order.nombreCliente}</span>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(order.telefonoCliente, order.nombreCliente, order.codigo || order.id.slice(-6))}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 font-semibold pt-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.telefonoCliente}</span>
                    </div>

                    {isDelivery && order.direccionCliente && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-slate-700 font-semibold flex items-start gap-1">
                            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            {order.direccionCliente}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccionCliente)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 hover:underline pt-1"
                        >
                          Abrir Ubicación en Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Acciones Adicionales */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => handlePrintTicket(order)}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Ticket Comanda
                    </button>
                  </div>
                </div>

                {/* COLUMNA 2: GESTIÓN DE DISPONIBILIDAD DE PRODUCTOS (BLOQUEADO SI YA FUE ACEPTADO) */}
                <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-amber-500" />
                    2. Disponibilidad de Productos en Cocina
                  </h3>

                  {isAvailabilityConfirmed ? (
                    <>
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 text-xs font-extrabold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Productos confirmados e ingresados a cocina.</span>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="font-extrabold text-slate-900 block">{item.cantidad}x {item.nombreProducto}</span>
                              <span className="text-[10px] text-slate-400">${(Number(item.precioUnitario) || 0).toFixed(2)} c/u</span>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-500 text-white shadow-xs">
                              ✓ Confirmado
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 font-medium">
                        Verifica la existencia de cada producto. Si falta algún ítem, desmárcalo para enviarle la propuesta de cambios al cliente.
                      </p>

                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {order.items.map(item => {
                          const isAvail = itemsAvailability[item.id] !== false;
                          const currentQty = itemsQuantities[item.id] !== undefined ? itemsQuantities[item.id] : item.cantidad;

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all ${
                                isAvail ? 'bg-slate-50/80 border-slate-200' : 'bg-rose-50/80 border-rose-200 opacity-80'
                              }`}
                            >
                              {/* CHECKBOX ÚNICO + NOMBRE Y PRECIO */}
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`check-avail-${item.id}`}
                                  checked={isAvail}
                                  onChange={() => {
                                    const nextAvail = !isAvail;
                                    setItemsAvailability(prev => ({ ...prev, [item.id]: nextAvail }));
                                    if (!nextAvail) {
                                      setItemsQuantities(prev => ({ ...prev, [item.id]: 0 }));
                                    } else {
                                      setItemsQuantities(prev => ({ ...prev, [item.id]: item.cantidad }));
                                    }
                                  }}
                                  className="w-5 h-5 text-emerald-600 rounded-md border-slate-300 cursor-pointer accent-emerald-600 focus:ring-emerald-500 shrink-0"
                                />
                                <label htmlFor={`check-avail-${item.id}`} className="cursor-pointer select-none">
                                  <span className={`font-black text-xs block ${isAvail ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                                    {item.nombreProducto}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    ${(Number(item.precioUnitario) || 0).toFixed(2)} c/u
                                  </span>
                                </label>
                              </div>

                              {/* CONTROLES DE MODIFICAR CANTIDAD */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-slate-400">Cant:</span>
                                <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = itemsQuantities[item.id] !== undefined ? itemsQuantities[item.id] : item.cantidad;
                                      if (current > 0) {
                                        const nextQty = current - 1;
                                        setItemsQuantities(prev => ({ ...prev, [item.id]: nextQty }));
                                        if (nextQty === 0) {
                                          setItemsAvailability(prev => ({ ...prev, [item.id]: false }));
                                        }
                                      }
                                    }}
                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.cantidad}
                                    value={currentQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      const clamped = Math.max(0, val);
                                      setItemsQuantities(prev => ({ ...prev, [item.id]: clamped }));
                                      if (clamped === 0) {
                                        setItemsAvailability(prev => ({ ...prev, [item.id]: false }));
                                      } else {
                                        setItemsAvailability(prev => ({ ...prev, [item.id]: true }));
                                      }
                                    }}
                                    className="w-9 text-center font-mono font-black text-xs text-slate-900 py-1 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = itemsQuantities[item.id] !== undefined ? itemsQuantities[item.id] : item.cantidad;
                                      const nextQty = current + 1;
                                      setItemsQuantities(prev => ({ ...prev, [item.id]: nextQty }));
                                      if (nextQty > 0) {
                                        setItemsAvailability(prev => ({ ...prev, [item.id]: true }));
                                      }
                                    }}
                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="disableCatalogFull"
                          checked={disableCatalogProducts}
                          onChange={e => setDisableCatalogProducts(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                        />
                        <label htmlFor="disableCatalogFull" className="text-xs font-extrabold text-slate-700 cursor-pointer">
                          Desactivar disponibilidad del producto agotado en catálogo
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveDisponibilidad(order)}
                        disabled={processingId === order.id}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Guardar Disponibilidad / Enviar Cambios
                      </button>
                    </>
                  )}
                </div>

                {/* COLUMNA 3: VERIFICACIÓN / DESPACHO DE PEDIDO */}
                <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      {isOrderAcceptedOrPrepared ? <Truck className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-amber-500" />}
                      {isOrderAcceptedOrPrepared ? '3. Despacho & Asignación de Repartidor' : '3. Pago & Aceptación del Pedido'}
                    </h3>

                    {/* Estado del Pago & Liquidación Financiera */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Estado del Pago:</span>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          isPaymentVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isPaymentVerified ? '✅ PAGO CONFIRMADO' : ((order as any).metodoPago === 'EFECTIVO' ? '💵 EFECTIVO CONTRA ENTREGA' : order.payment?.estado || 'PENDIENTE')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                        <span>Total del Pedido:</span>
                        <span className="text-emerald-600 text-base">${totalVal.toFixed(2)}</span>
                      </div>

                      {/* DESGLOSE FINANCIERO DE COBRO Y LIQUIDACIÓN CON DRIVER */}
                      {(() => {
                        const drvFee = 3.04;
                        const netCashToRestaurant = Math.max(0, totalVal - drvFee);
                        const isCashOrder = (order as any).metodoPago === 'EFECTIVO' || (!isPaymentVerified && (order as any).payment?.metodo === 'EFECTIVO');

                        return isCashOrder ? (
                          <div className="pt-2 border-t border-amber-200/80 bg-amber-50/80 p-3 rounded-xl space-y-1.5 text-[11px]">
                            <span className="font-black text-amber-950 block uppercase tracking-wider">
                              💵 Liquidación de Cobro en Efectivo (Driver):
                            </span>
                            <div className="flex justify-between text-slate-700 font-semibold">
                              <span>Cobro en puerta al cliente:</span>
                              <span className="font-bold text-slate-900">${totalVal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-700 font-semibold">
                              <span>(-) Tarifa de Envío Driver:</span>
                              <span className="font-bold text-rose-600">-${drvFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-amber-950 font-black pt-1 border-t border-amber-200/60 text-xs">
                              <span>(=) Pendiente Ingreso a Caja:</span>
                              <span className="text-emerald-700">${netCashToRestaurant.toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-emerald-200/80 bg-emerald-50/80 p-3 rounded-xl space-y-1.5 text-[11px]">
                            <span className="font-black text-emerald-950 block uppercase tracking-wider">
                              💳 Pago Online Verificado:
                            </span>
                            <div className="flex justify-between text-emerald-900 font-semibold">
                              <span>Ingreso Neto a Cuenta/Caja:</span>
                              <span className="font-black text-emerald-700">${netCashToRestaurant.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 font-semibold">
                              <span>Envío pagado por negocio a driver:</span>
                              <span className="font-bold text-slate-900">${drvFee.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {evidenceUrl && (
                        <div className="pt-2 border-t border-slate-200">
                          <a
                            href={evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-4 h-4 text-amber-600" /> Ver Comprobante Adjunto
                          </a>
                        </div>
                      )}
                    </div>

                    {/* CÓDIGO DE SEGURIDAD PIN (RETIRO EN LOCAL) */}
                    {(() => {
                      let pCode = order.extraInfo?.pickupCode;
                      if (!pCode) {
                        let num = 0; const str = (order.id || '') + 'pickup';
                        for (let i = 0; i < str.length; i++) num = (num * 31 + str.charCodeAt(i)) % 9000;
                        pCode = String(1000 + Math.abs(num));
                      }

                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2 shadow-md border border-slate-800">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                                🔑 PIN Retiro en Local:
                              </span>
                              <span className="text-[10px] text-slate-400">Repartidor dicta este PIN al restaurante al recoger</span>
                            </div>
                            <span className="px-3.5 py-1 bg-amber-500 text-slate-950 font-black text-base rounded-xl tracking-widest shadow-sm">
                              {pCode}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* VISTA DE DESPACHO Y ASIGNACIÓN CON LÓGICA COMPLETA DE REPARTIDOR */}
                    {isOrderAcceptedOrPrepared ? (
                      <div className="space-y-4 pt-2 border-t border-slate-100">
                        {(() => {
                          const currentAsgn = assignmentsMap[order.id];
                          const assignedDriverName = currentAsgn?.resource?.name || order.extraInfo?.assignedDriverName || order.extraInfo?.assignedDriver || (assignedDriver !== 'Repartidor de Local' ? assignedDriver : '') || 'Marco Proaño';
                          let asgnState = currentAsgn?.estado || 'ASIGNADO';
                          if (['REPARTIDOR_EN_LOCAL', 'LLEGO', 'EN_LOCAL'].includes(order.estado)) {
                            asgnState = 'REPARTIDOR_EN_LOCAL';
                          } else if (['EN_CAMINO', 'EN_RUTA', 'RUTA'].includes(order.estado)) {
                            asgnState = 'EN_RUTA';
                          } else if (['WAITING_CLIENT', 'ESPERANDO_CLIENTE'].includes(order.estado)) {
                            asgnState = 'ESPERANDO_CLIENTE';
                          } else if (['ENTREGADO', 'FINALIZADO', 'COMPLETADO'].includes(order.estado)) {
                            asgnState = 'COMPLETADO';
                          } else if (['REPARTIDOR_ASIGNADO', 'ACEPTADO', 'REPARTIDOR_ACEPTO', 'ENTREGADO_A_REPARTIDOR'].includes(order.estado) || currentAsgn?.estado === 'ACEPTADO') {
                            asgnState = 'ACEPTADO';
                          }

                           const isKitchenFinished = order.extraInfo?.kitchenStatus === 'LISTO' || order.estado === 'LISTO';

                           return (
                            <>
                              {/* SI EXISTE UNA ASIGNACIÓN O EL ESTADO INDICA REPARTIDOR ASIGNADO/EN LOCAL */}
                              {(currentAsgn || order.extraInfo?.assignedDriver || ['REPARTIDOR_EN_LOCAL', 'REPARTIDOR_ASIGNADO', 'EN_CAMINO', 'LLEGO', 'ENTREGADO_A_REPARTIDOR'].includes(order.estado)) ? (
                                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-md shadow-slate-200/50 text-slate-900">
                                  
                                  {/* HEADER DEL REPARTIDOR (TEXTO NEGRO PURO SLATE-900 SOBRE FONDO BLANCO) */}
                                  <div className="space-y-2 border-b border-slate-100 pb-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-md shadow-blue-500/20 shrink-0">
                                          {assignedDriverName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="font-black text-slate-900 text-sm truncate leading-tight">
                                            {assignedDriverName}
                                          </h4>
                                          <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">
                                            {currentAsgn?.resource?.profile?.vehiculo || currentAsgn?.resource?.profile?.tipoVehiculo || '🛵 Repartidor de Entregas'}
                                          </p>
                                        </div>
                                      </div>

                                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap shadow-sm ${
                                        asgnState === 'ASIGNADO' || asgnState === 'PENDIENTE'
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse'
                                          : asgnState === 'REPARTIDOR_EN_LOCAL'
                                          ? 'bg-amber-500 text-slate-950 font-black'
                                          : asgnState === 'ACEPTADO'
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                          : asgnState === 'EN_RUTA' || asgnState === 'EN_CAMINO'
                                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {asgnState === 'ASIGNADO' || asgnState === 'PENDIENTE'
                                          ? '⏳ PENDIENTE' 
                                          : asgnState === 'REPARTIDOR_EN_LOCAL' 
                                          ? '📍 EN LOCAL' 
                                          : asgnState === 'ACEPTADO'
                                          ? 'ACEPTADO'
                                          : asgnState === 'EN_RUTA' || asgnState === 'EN_CAMINO'
                                          ? '🛵 EN RUTA'
                                          : asgnState}
                                      </span>
                                    </div>
                                  </div>

                                  {/* INDICADOR DE ESTADO DE COCINA */}
                                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ChefHat className={`w-4 h-4 shrink-0 ${isKitchenFinished ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`} />
                                      <span className="font-extrabold text-slate-800 text-xs">Estado Cocina:</span>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shrink-0 whitespace-nowrap ${
                                      isKitchenFinished 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                                    }`}>
                                      {isKitchenFinished ? '✅ LISTO EN COCINA' : '🍳 EN PREPARACIÓN'}
                                    </span>
                                  </div>

                                  {/* MENSAJES AUTOMÁTICOS Y BOTONES DE DESPACHO */}
                                  {(asgnState === 'ASIGNADO' || asgnState === 'PENDIENTE') && (
                                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs space-y-2">
                                      <div className="flex items-center gap-2 text-amber-950 font-black">
                                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                                        <span>Esperando a que el repartidor acepte la orden...</span>
                                      </div>
                                      <p className="text-[11px] text-amber-800 font-semibold">
                                        Se notificó a {assignedDriverName}. En cuanto presione Aceptar, verás la actualización en vivo.
                                      </p>
                                    </div>
                                  )}

                                  {asgnState === 'ACEPTADO' && (
                                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-3">
                                      <div className="flex items-center gap-2 text-emerald-950 font-black">
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                                        <span>✅ ¡{assignedDriverName} ACEPTÓ el pedido!</span>
                                      </div>
                                      <p className="text-[11px] text-emerald-800 font-medium">
                                        El repartidor va en camino al local para retirar la orden.
                                      </p>

                                      {!isKitchenFinished && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold flex items-start gap-2">
                                          <ChefHat className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                          <span>🔒 Cocina aún está preparando los platos. El botón de despacho se activará cuando cocina marque "Listo".</span>
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAssignmentStatus(currentAsgn?.id, order.id, 'ENTREGADO_A_REPARTIDOR')}
                                        disabled={processingId === order.id || !isKitchenFinished}
                                        className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2 transition-all ${
                                          isKitchenFinished
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-98 shadow-blue-500/20'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }`}
                                      >
                                        {isKitchenFinished ? (
                                          <>
                                            <PackageCheck className="w-4 h-4" /> Entregar Comanda a Repartidor
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="w-4 h-4 text-amber-500" /> En Cocina (Despacho Bloqueado)
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {asgnState === 'REPARTIDOR_EN_LOCAL' && (
                                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-3">
                                      <div className="flex items-center gap-2 text-amber-950 font-black">
                                        <Check className="w-4 h-4 text-amber-600 shrink-0 stroke-[3]" />
                                        <span>📍 ¡{assignedDriverName} YA LLEGÓ al local!</span>
                                      </div>
                                      <p className="text-[11px] text-amber-800 font-medium">
                                        El repartidor está esperando la comanda lista en puerta.
                                      </p>

                                      {!isKitchenFinished && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold flex items-start gap-2">
                                          <ChefHat className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                                          <span>🔒 Cocina aún está preparando los platos. El botón de despacho se activará cuando cocina marque "Listo".</span>
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAssignmentStatus(currentAsgn?.id, order.id, 'ENTREGADO_A_REPARTIDOR')}
                                        disabled={processingId === order.id || !isKitchenFinished}
                                        className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase shadow-lg flex items-center justify-center gap-2 transition-all ${
                                          isKitchenFinished
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-98 shadow-blue-500/20'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }`}
                                      >
                                        {isKitchenFinished ? (
                                          <>
                                            <PackageCheck className="w-4 h-4" /> Entregar Comanda a Repartidor
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="w-4 h-4 text-amber-500" /> En Cocina (Despacho Bloqueado)
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {(asgnState === 'EN_RUTA' || asgnState === 'EN_CAMINO' || order.estado === 'EN_CAMINO' || order.estado === 'ENTREGADO_A_REPARTIDOR') && (
                                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-3">
                                      <div className="flex items-center gap-2 text-blue-950 font-black">
                                        <Truck className="w-4 h-4 text-blue-600 shrink-0 animate-bounce" />
                                        <span>🛵 Pedido entregado al repartidor {assignedDriverName}.</span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                        El repartidor se desplaza hacia el domicilio del cliente. Al ser entregado, presiona abajo para finalizar.
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateAssignmentStatus(currentAsgn?.id, order.id, 'COMPLETADO')}
                                        disabled={processingId === order.id}
                                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
                                      >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                        <span>Confirmar Entrega Definitiva (ENTREGADO)</span>
                                      </button>
                                    </div>
                                  )}

                                  {asgnState === 'COMPLETADO' && (
                                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-3.5 text-xs font-black text-center shadow-sm">
                                      🎉 Pedido Entregado Correctamente por {assignedDriverName}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* VISTA POR DEFECTO: ESPERANDO ACEPTACIÓN DEL REPARTIDOR Y ALERTA DE REASIGNACIÓN */
                                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                                        <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                                        <span>⏳ ESPERANDO ACEPTACIÓN DEL REPARTIDOR...</span>
                                      </div>
                                      <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 text-[10px] font-black rounded-full animate-pulse">
                                        EN ESPERA
                                      </span>
                                    </div>

                                    <p className="text-xs text-amber-800 font-medium">
                                      Pedido ingresado a cocina. Se ha notificado a la red de repartidores de la plataforma.
                                    </p>

                                    {/* ALERTA SI NINGÚN REPARTIDOR RESPONDE */}
                                    <div className="bg-white border border-amber-300 rounded-xl p-3 text-xs space-y-2 mt-2 shadow-xs">
                                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Si ningún repartidor acepta la orden o deseas despachar manualmente:</span>
                                      </div>

                                      <div className="space-y-2 pt-1 border-t border-slate-100">
                                        <label className="block text-[10px] font-black uppercase text-slate-500">
                                          1. Seleccionar Repartidor Registrado:
                                        </label>
                                        <div className="flex gap-2">
                                          <select
                                            value={selectedDriverId}
                                            onChange={e => setSelectedDriverId(e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                                          >
                                            <option value="">-- Seleccionar Repartidor Registrado --</option>
                                            {approvedDrivers.map(d => (
                                              <option key={d.id} value={d.id}>
                                                {d.name} ({d.estado || 'DISPONIBLE'})
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => handleAssignDriverToOrder(order, selectedDriverId)}
                                            disabled={!selectedDriverId || processingId === order.id}
                                            className={`px-3 py-2 text-xs font-black rounded-xl shrink-0 ${
                                              selectedDriverId
                                                ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-500'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                          >
                                            Asignar
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-2 pt-2 border-t border-slate-100">
                                        <label className="block text-[10px] font-black uppercase text-slate-500">
                                          2. O Despachar con Repartidor del Local:
                                        </label>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            value={assignedDriver}
                                            onChange={e => setAssignedDriver(e.target.value)}
                                            placeholder="Repartidor de Local..."
                                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleDispatchOrder(order, order.estado === 'LISTO' ? 'EN_CAMINO' : 'LISTO')}
                                            disabled={processingId === order.id}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black shrink-0 cursor-pointer uppercase"
                                          >
                                            Despachar
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <>
                        {/* Botones de Verificación de Pago */}
                        {!isPaymentVerified && (order.estado === 'RECIBIDO' || order.estado === 'PENDIENTE' || !order.payment || order.payment.estado === 'COMPROBANTE_RECIBIDO' || order.payment.estado === 'PENDIENTE' || order.payment.estado === 'COMPROBANTE_ENVIADO') && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleVerifyPayment(order.id)}
                              disabled={processingId === order.id}
                              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer transition-all"
                            >
                              ✓ Verificar Pago
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPayment(order.id)}
                              disabled={processingId === order.id}
                              className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer transition-all"
                            >
                              ✕ Rechazar Pago
                            </button>
                          </div>
                        )}

                        {/* Selector de Tiempo de Preparación */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider">
                            ⏰ Tiempo Estimado de Preparación
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[15, 20, 30, 45, 60].map(mins => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => setSelectedPrepTime(mins)}
                                className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  selectedPrepTime === mins
                                    ? 'bg-amber-500 text-white shadow-md scale-[1.05]'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {mins}m
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* GESTIÓN DE REEMBOLSO INDEPENDIENTE (SI APLICA) */}
                        {(() => {
                          const fsRefundInfo = getRefundDetails(order);
                          if (!fsRefundInfo.hasRefund && !fsRefundInfo.isRefunded) return null;
                          return (
                            <div className={`p-4 rounded-3xl border space-y-3.5 text-xs ${
                              fsRefundInfo.isRefunded 
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                                : 'bg-rose-50/80 border-rose-300 text-rose-950'
                            }`}>
                              <div className="flex items-center justify-between border-b pb-3 border-rose-200/80">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-200/70 px-2.5 py-0.5 rounded-full">
                                    Reembolso {fsRefundInfo.codigoReembolso}
                                  </span>
                                  <h4 className="text-sm font-black text-rose-950 mt-1">
                                    Pedido #{order.codigo || order.numeroPedido || order.id.slice(-6).toUpperCase()}
                                  </h4>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  fsRefundInfo.isRefunded ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white shadow-sm'
                                }`}>
                                  {fsRefundInfo.isRefunded ? '✅ REEMBOLSADO' : '🔴 REEMBOLSO PENDIENTE'}
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-slate-800">
                                <p className="font-bold">
                                  👤 <span className="font-black text-slate-900">{order.nombreCliente}</span> ({order.telefonoCliente})
                                </p>
                                <p className="text-rose-900 font-semibold">
                                  📌 <span className="font-black">Motivo:</span> {fsRefundInfo.motivo}
                                </p>
                              </div>

                              <div className="bg-white rounded-2xl border border-rose-200/80 p-3.5 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 font-medium">
                                  <span>Monto originalmente pagado por productos:</span>
                                  <span className="font-mono font-bold text-slate-900">${fsRefundInfo.originalProdSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 font-medium">
                                  <span>Nuevo total de productos:</span>
                                  <span className="font-mono font-bold text-slate-900">${fsRefundInfo.currentProdSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-dashed border-rose-200 pt-2 flex justify-between font-black text-sm text-rose-700">
                                  <span>💰 Monto a devolver (Productos):</span>
                                  <span className="font-mono text-base text-rose-700">${fsRefundInfo.montoDevolver.toFixed(2)}</span>
                                </div>
                              </div>

                              <div className="bg-slate-100/80 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-200">
                                <span className="font-bold text-slate-600">🛵 Envío (Fulfillment): ${fsRefundInfo.envio.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">Estado: Independiente</span>
                              </div>

                              {!fsRefundInfo.isRefunded ? (
                                <div className="space-y-2 pt-2 border-t border-rose-200/80">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-rose-900 block mb-1">Método de Devolución</label>
                                      <select
                                        value={refundMethod}
                                        onChange={e => setRefundMethod(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-rose-300 rounded-xl font-bold text-xs text-slate-800"
                                      >
                                        <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                        <option value="EFECTIVO">Efectivo en Caja</option>
                                        <option value="OTRO">Otro Método Permitido</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-black uppercase text-rose-900 block mb-1">Nº Comprobante / Ref.</label>
                                      <input
                                        type="text"
                                        value={refundRef}
                                        onChange={e => setRefundRef(e.target.value)}
                                        placeholder="Nº comprobante..."
                                        className="w-full p-2.5 bg-white border border-rose-300 rounded-xl font-semibold text-xs text-slate-800"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmRefund(order)}
                                    disabled={processingId === order.id}
                                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
                                  >
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    <span>Procesar Devolución (${fsRefundInfo.montoDevolver.toFixed(2)})</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-emerald-100/80 p-3 rounded-2xl border border-emerald-300 text-emerald-950 text-xs space-y-1 font-bold">
                                  <div className="flex items-center justify-between">
                                    <span>✅ DEVOLUCIÓN COMPLETADA</span>
                                    <span>${fsRefundInfo.montoDevolver.toFixed(2)}</span>
                                  </div>
                                  <p className="text-[10px] text-emerald-800">
                                    Método: {fsRefundInfo.metodoDevolucion || refundMethod} {fsRefundInfo.referenciaDevolucion ? `| Comprobante: ${fsRefundInfo.referenciaDevolucion}` : ''}
                                  </p>
                                  {fsRefundInfo.devolucionUser && (
                                    <p className="text-[10px] text-emerald-700 font-semibold">
                                      Procesado por: {fsRefundInfo.devolucionUser}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* REGISTRAR REEMBOLSO MANUAL SI HACE FALTA */}
                        {(() => {
                          const fsRefundInfo = getRefundDetails(order);
                          if (fsRefundInfo.hasRefund) return null;
                          return (
                            <div className="pt-2 border-t border-slate-100">
                              {!showCustomRefundInput ? (
                                <button
                                  type="button"
                                  onClick={() => setShowCustomRefundInput(true)}
                                  className="text-[11px] font-black text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
                                >
                                  💸 ¿Este pedido requiere devolución/reembolso? Registrar monto manual
                                </button>
                              ) : (
                                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2 text-xs">
                                  <label className="text-[10px] font-black uppercase text-rose-900 block">
                                    Monto a Reembolsar al Cliente ($)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={customRefundAmount}
                                      onChange={e => setCustomRefundAmount(e.target.value)}
                                      placeholder="Ej: 6.00"
                                      className="p-2.5 bg-white border border-rose-300 rounded-xl text-xs font-black text-slate-900 flex-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRegisterCustomRefund(order.id)}
                                      disabled={processingId === order.id}
                                      className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs cursor-pointer shadow-sm"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowCustomRefundInput(false)}
                                      className="px-2 py-2 text-slate-500 font-bold text-xs cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* BOTÓN DEFINITIVO ACEPTAR PEDIDO (SOLO SI NO HA SIDO ACEPTADO AÚN) */}
                  {!isOrderAcceptedOrPrepared && (
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleAcceptOrderToKitchen(order)}
                        disabled={!canAcceptOrder || processingId === order.id}
                        className={`w-full py-4 text-xs font-black uppercase rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all ${
                          canAcceptOrder
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/20 active:scale-98 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        }`}
                      >
                        {processingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Aceptar Pedido (Requiere Productos OK + Pago Verificado)
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
