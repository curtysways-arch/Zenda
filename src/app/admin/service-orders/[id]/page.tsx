'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  RefreshCw,
  Clock,
  Phone,
  FileText,
  AlertCircle,
  HelpCircle,
  Share2,
} from 'lucide-react';

import { ServiceOrderHeader } from '@/components/admin/service-orders/ServiceOrderHeader';
import { CustomerCard } from '@/components/admin/service-orders/CustomerCard';
import { ServiceItemsCard, ServiceItemData } from '@/components/admin/service-orders/ServiceItemsCard';
import { PhotoGalleryCard } from '@/components/admin/service-orders/PhotoGalleryCard';
import { StatusStepper } from '@/components/admin/service-orders/StatusStepper';
import { PaymentCard } from '@/components/admin/service-orders/PaymentCard';
import { DeliveryCard } from '@/components/admin/service-orders/DeliveryCard';
import { AuditTimeline } from '@/components/admin/service-orders/AuditTimeline';
import { ServiceWorkflowActionControl } from '@/components/admin/service-orders/ServiceWorkflowActionControl';
import { PaymentMomentSetting } from '@/components/admin/service-orders/ServiceWizardWorkflow';

export default function ServiceOrderWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [deliveryAssignment, setDeliveryAssignment] = useState<any>(null);
  const [approvedDrivers, setApprovedDrivers] = useState<any[]>([]);

  // Estados editables de la orden
  const [estado, setEstado] = useState('RECIBIDO');
  const [paymentMomentSetting, setPaymentMomentSetting] = useState<PaymentMomentSetting>('FLEXIBLE');
  const [items, setItems] = useState<ServiceItemData[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [total, setTotal] = useState(0);
  const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState('');
  const [horaEstimadaEntrega, setHoraEstimadaEntrega] = useState('17:00');
  const [prioridad, setPrioridad] = useState('Normal');
  const [fotos, setFotos] = useState<{ recepcion: string[]; proceso: string[]; entrega: string[] }>({
    recepcion: [],
    proceso: [],
    entrega: [],
  });
  const [notasInternas, setNotasInternas] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Estados dinámicos de la capability
  const [customStatuses, setCustomStatuses] = useState<string[]>([
    'RECIBIDO',
    'EN_PROCESO',
    'LAVANDO',
    'SECANDO',
    'DETALLADO',
    'LISTO',
    'ENTREGADO',
  ]);
  const [hasDelivery, setHasDelivery] = useState(false);

  // Modal para confirmar notificación WhatsApp si cambia la fecha
  const [showDateWaModal, setShowDateWaModal] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<{ fecha: string; hora: string } | null>(null);

  // Modal selector de plantillas de WhatsApp
  const [showWaTemplatesModal, setShowWaTemplatesModal] = useState(false);

  // Cargar datos completos de la orden
  const loadOrderWorkspace = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/shoe-care/orders/${orderId}`);
      if (!res.ok) throw new Error('Orden no encontrada');
      const data = await res.json();

      const ord = data.order;
      setOrder(ord);
      setCliente(data.cliente || { nombre: ord.nombreCliente, telefono: ord.telefonoCliente, direccion: ord.direccionCliente });
      setHistorial(data.historial || []);
      setDeliveryAssignment(data.deliveryAssignment || null);
      setApprovedDrivers(data.approvedDrivers || []);

      // Hidratar estados editables
      setEstado(ord.estado);
      const mappedItems = Array.isArray(ord.items) && ord.items.length > 0
        ? ord.items.map((it: any) => ({
            id: it.id,
            nombreProducto: it.nombreProducto,
            precioUnitario: it.precioUnitario,
            cantidad: it.cantidad,
          }))
        : [
            {
              id: 'init_1',
              nombreProducto: ord.extraInfo?.servicioNombre || 'Servicio de Lavado / Mantenimiento',
              precioUnitario: ord.subtotal || ord.total || 6.0,
              cantidad: ord.extraInfo?.cantidadPares || 1,
            },
          ];

      setItems(mappedItems);
      setSubtotal(ord.subtotal || 6.0);
      setDescuento(ord.extraInfo?.descuento || 0);
      setCostoEnvio(ord.costoEnvio || 0);
      setTotal(ord.total || 6.0);

      const fEnt = ord.extraInfo?.fechaEstimadaEntrega || ord.fechaEntrega;
      if (fEnt) {
        const dObj = new Date(fEnt);
        setFechaEstimadaEntrega(dObj.toISOString().split('T')[0]);
        setHoraEstimadaEntrega(dObj.toTimeString().substring(0, 5) || '17:00');
      }

      setPrioridad(ord.extraInfo?.prioridad || 'Normal');
      setFotos({
        recepcion: ord.extraInfo?.fotosRecepcion || [],
        proceso: ord.extraInfo?.fotosProceso || [],
        entrega: ord.extraInfo?.fotosEntrega || [],
      });
      setNotasInternas(ord.extraInfo?.notasInternas || ord.notas || '');
      setSelectedDriverId(data.deliveryAssignment?.resourceId || ord.extraInfo?.repartidorId || '');

      // Parsear BusinessSettings (customStatuses y capabilities.delivery)
      if (ord.negocio?.configuracion) {
        let conf: any = {};
        if (typeof ord.negocio.configuracion === 'string') {
          try { conf = JSON.parse(ord.negocio.configuracion); } catch {}
        } else {
          conf = ord.negocio.configuracion;
        }

        const customSt = conf?.serviceSettings?.customStatuses || conf?.customStatuses;
        if (Array.isArray(customSt) && customSt.length > 0) {
          setCustomStatuses(customSt);
        }

        const caps = conf?.capabilities || conf;
        setHasDelivery(Boolean(caps?.delivery));

        const pMoment = conf?.paymentSettings?.paymentMoment || 'FLEXIBLE';
        setPaymentMomentSetting(pMoment);
      }
    } catch (err) {
      console.error('Error cargando Workspace de la Orden:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderWorkspace();
  }, [loadOrderWorkspace]);

  // Recalcular subtotal y total al cambiar los ítems
  const handleUpdateItems = (newItems: ServiceItemData[]) => {
    setItems(newItems);
    const newSubtotal = newItems.reduce((sum, it) => sum + it.precioUnitario * it.cantidad, 0);
    setSubtotal(newSubtotal);
    setTotal(Math.max(0, newSubtotal - descuento + costoEnvio));
  };

  // Guardar cambios generales de la orden
  const handleSaveWorkspace = async () => {
    setSaving(true);
    try {
      const payload = {
        estado,
        items,
        subtotal,
        descuento,
        costoEnvio,
        total,
        fechaEstimadaEntrega: `${fechaEstimadaEntrega}T${horaEstimadaEntrega}:00.000Z`,
        horaEstimadaEntrega,
        prioridad,
        fotos,
        notasInternas,
        repartidorId: selectedDriverId,
      };

      const res = await fetch(`/api/shoe-care/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al guardar los cambios');
      await loadOrderWorkspace();
      alert('✓ Orden de servicio actualizada exitosamente.');
    } catch (err: any) {
      alert(err.message || 'Error al guardar la orden');
    } finally {
      setSaving(false);
    }
  };

  // Avance directo de estado desde el Wizard Guiado
  const handleAdvanceStatusFromWizard = async (nextStatus: string, payloadExtra?: any) => {
    setSaving(true);
    try {
      const payload = {
        estado: nextStatus,
        items,
        subtotal,
        descuento,
        costoEnvio,
        total,
        fechaEstimadaEntrega: fechaEstimadaEntrega ? `${fechaEstimadaEntrega}T${horaEstimadaEntrega}:00.000Z` : undefined,
        horaEstimadaEntrega,
        prioridad,
        fotos,
        notasInternas,
        repartidorId: selectedDriverId,
        ...(payloadExtra || {}),
      };

      const res = await fetch(`/api/shoe-care/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error avanzando el estado de la orden');
      setEstado(nextStatus);
      await loadOrderWorkspace();
    } catch (err: any) {
      alert(err.message || 'Error al avanzar la orden');
    } finally {
      setSaving(false);
    }
  };

  // Registrar cobro
  const handleRegisterPayment = async (metodo: string, estadoPago: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shoe-care/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pago: { metodo, monto: total, estadoPago },
        }),
      });

      if (!res.ok) throw new Error('Error al registrar pago');
      await loadOrderWorkspace();
      alert('✓ Registro de pago guardado.');
    } catch (err: any) {
      alert(err.message || 'Error registrando pago');
    } finally {
      setSaving(false);
    }
  };

  // Cambio de fecha estimada con prompt de notificación
  const handleDateChangeAttempt = (newDate: string, newTime: string) => {
    setPendingDateChange({ fecha: newDate, hora: newTime });
    setShowDateWaModal(true);
  };

  const confirmDateChange = (notifyWa: boolean) => {
    if (pendingDateChange) {
      setFechaEstimadaEntrega(pendingDateChange.fecha);
      setHoraEstimadaEntrega(pendingDateChange.hora);
      if (notifyWa && cliente?.telefono) {
        const msg = `Hola ${cliente.nombre} 👋, te notificamos que la fecha estimada de entrega de tu orden #${order?.numeroPedido} ha sido reprogramada para el ${pendingDateChange.fecha} a las ${pendingDateChange.hora}.`;
        window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    }
    setShowDateWaModal(false);
    setPendingDateChange(null);
  };

  // Enviar Plantillas Oficiales de WhatsApp
  const sendWaTemplate = (type: 'recepcion' | 'proceso' | 'listo' | 'despacho' | 'entregado') => {
    if (!cliente?.telefono) return;

    let text = '';
    const num = order?.numeroPedido;

    switch (type) {
      case 'recepcion':
        text = `Hola ${cliente.nombre} 👋! Tu orden #${num} fue recibida con éxito. Puedes hacer seguimiento desde nuestro portal.`;
        break;
      case 'proceso':
        text = `Hola ${cliente.nombre} 👋! Tu orden #${num} está ahora EN PROCESO de servicio y detallado.`;
        break;
      case 'listo':
        text = `¡Buenas noticias ${cliente.nombre}! 🎉 Tu orden #${num} está LISTA PARA RETIRAR en nuestro local.`;
        break;
      case 'despacho':
        text = `Hola ${cliente.nombre} 🛵! Tu orden #${num} está EN RUTA DE ENTREGA a tu dirección.`;
        break;
      case 'entregado':
        text = `¡Gracias por confiar en nosotros ${cliente.nombre}! ⭐ Tu orden #${num} fue completada y entregada.`;
        break;
    }

    window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    setShowWaTemplatesModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <span className="ml-3 font-bold text-slate-600">Cargando Service Order Workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 space-y-6 pb-24">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/ordenes-servicio')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-100 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWaTemplatesModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-2xl text-xs hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" /> WhatsApp Status
          </button>
          <button
            onClick={handleSaveWorkspace}
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-900 text-white font-black rounded-2xl text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* 1. Header Oficial de la Orden */}
      <ServiceOrderHeader
        numeroPedido={order?.numeroPedido}
        estado={estado}
        estadoBadgeBg="bg-emerald-50 border-emerald-200 text-emerald-800"
        fechaRecepcion={new Date(order?.createdAt).toLocaleDateString('es-PE')}
        fechaEntregaEstimada={`${fechaEstimadaEntrega} (${horaEstimadaEntrega})`}
        prioridad={prioridad}
        tipoEntrega={order?.tipoEntrega}
      />

      {/* Grid Principal de 3 Columnas (Refactor exacto según Maqueta Oficial) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA (3 cols): CLIENTE, DIRECCIÓN DE RETIRO, HISTORIAL */}
        <div className="lg:col-span-3 space-y-6">
          <CustomerCard
            cliente={cliente}
            historial={historial}
            onOpenWhatsApp={() => setShowWaTemplatesModal(true)}
          />

          {hasDelivery && (
            <DeliveryCard
              deliveryAssignment={deliveryAssignment}
              approvedDrivers={approvedDrivers}
              selectedDriverId={selectedDriverId}
              onChangeDriver={setSelectedDriverId}
            />
          )}
        </div>

        {/* COLUMNA CENTRO (5 cols): FLUJO DE LA ORDEN + ACCIÓN PRINCIPAL + LÍNEA DE TIEMPO + NOTAS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stepper Superior y Control de Acción Principal Única */}
          <ServiceWorkflowActionControl
            currentStatus={estado}
            hasDelivery={hasDelivery}
            customStatuses={customStatuses}
            paymentStatus={order?.payment?.estado || order?.extraInfo?.estadoPago || 'PENDIENTE'}
            total={total}
            deliveryAssignment={deliveryAssignment}
            approvedDrivers={approvedDrivers}
            selectedDriverId={selectedDriverId}
            extraInfo={order?.extraInfo || {}}
            onAdvanceStatus={handleAdvanceStatusFromWizard}
            onChangeDriver={setSelectedDriverId}
            onSendWhatsApp={(msg) => {
              if (cliente?.telefono) {
                window.open(`https://wa.me/${cliente.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
              }
            }}
            saving={saving}
          />

          {/* Línea de Tiempo Automática */}
          <AuditTimeline
            timeline={order?.extraInfo?.timeline || []}
            createdAt={order?.createdAt}
          />

          {/* Resumen de la Orden: Tipo de servicio & Notas internas */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b pb-2">
              Resumen de la Orden
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block font-bold text-slate-500 mb-1">Tipo de Servicio</span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-bold text-[11px]">
                  {order?.tipoEntrega === 'DOMICILIO' ? 'Recolección y Entrega' : 'Retiro en Local'}
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-500 mb-1">Notas Internas</span>
                <textarea
                  value={notasInternas}
                  onChange={e => setNotasInternas(e.target.value)}
                  placeholder="Instrucciones especiales para el equipo..."
                  rows={2}
                  className="w-full p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (4 cols): DETALLE DEL SERVICIO, FOTOS AUDITORÍA, PAGO */}
        <div className="lg:col-span-4 space-y-6">
          {/* Detalle del Servicio (Ítems Solicitados & Totales) */}
          <ServiceItemsCard
            items={items}
            subtotal={subtotal}
            descuento={descuento}
            costoEnvio={costoEnvio}
            total={total}
            onChangeItems={handleUpdateItems}
          />

          {/* Fotos de Auditoría (Antes / Después) */}
          <PhotoGalleryCard
            fotos={fotos}
            onChangeFotos={setFotos}
          />

          {/* Registro y Estado del Pago */}
          <PaymentCard
            total={total}
            payment={order?.payment}
            onRegisterPayment={handleRegisterPayment}
          />

          {/* Ajuste Fecha Estimada de Entrega */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" /> Fecha Estimada de Entrega
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fechaEstimadaEntrega}
                  onChange={e => handleDateChangeAttempt(e.target.value, horaEstimadaEntrega)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Hora</label>
                <input
                  type="time"
                  value={horaEstimadaEntrega}
                  onChange={e => handleDateChangeAttempt(fechaEstimadaEntrega, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Confirmación de Notificación al cambiar Fecha */}
      {showDateWaModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Desea notificar la nueva fecha al cliente?</h3>
            <p className="text-xs text-slate-500">
              Se ha reprogramado la entrega para el <strong>{pendingDateChange?.fecha}</strong> a las <strong>{pendingDateChange?.hora}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => confirmDateChange(false)}
                className="flex-1 py-2.5 border border-slate-300 font-bold text-slate-700 text-xs rounded-xl hover:bg-slate-50"
              >
                No Notificar
              </button>
              <button
                onClick={() => confirmDateChange(true)}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-md"
              >
                Sí, por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Plantillas WhatsApp */}
      {showWaTemplatesModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" /> Plantillas de WhatsApp
              </h3>
              <button onClick={() => setShowWaTemplatesModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2">
              {[
                { type: 'recepcion', label: '1. Recepción Confirmada', desc: 'Aviso de ingreso de prenda/artículo' },
                { type: 'proceso', label: '2. En Proceso', desc: 'Servicio y detallado en ejecución' },
                { type: 'listo', label: '3. Listo para Retirar', desc: 'Aviso para pasar recogiendo al local' },
                { type: 'despacho', label: '4. Repartidor en Camino', desc: 'Aviso de salida a domicilio' },
                { type: 'entregado', label: '5. Entregado / Agradecimiento', desc: 'Cierre de la orden' },
              ].map(t => (
                <button
                  key={t.type}
                  onClick={() => sendWaTemplate(t.type as any)}
                  className="w-full p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition-all group"
                >
                  <p className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">{t.label}</p>
                  <p className="text-[11px] text-slate-500">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
