'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DynamicFavicon from '@/components/DynamicFavicon';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Tag, 
  DollarSign, 
  Truck, 
  Boxes, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  Footprints, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Camera, 
  User, 
  Phone, 
  MapPin, 
  X, 
  Loader2, 
  Save, 
  RefreshCw, 
  CreditCard, 
  History, 
  TrendingUp, 
  Sparkles, 
  Image as ImageIcon,
  MessageSquare,
  ChevronRight,
  Map as MapIcon,
  Check,
  Edit3,
  Trash2,
  Building2,
  Gift,
  Palette,
  ShieldCheck,
  Percent,
  ArrowUpRight,
  Store,
  Eye,
  CheckCircle
} from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';

interface ShoeCareBackofficeProps {
  negocio: any;
}

type TabType = 'dashboard' | 'ordenes' | 'clientes' | 'perfil' | 'servicios' | 'promociones' | 'repartidores' | 'inventario' | 'planes' | 'reportes' | 'configuracion';

const ESTADOS_LISTA = [
  { id: 'SOLICITADA', label: 'Solicitada (Pendiente Retiro)', color: 'bg-amber-50 text-amber-700 border-amber-200 font-black' },
  { id: 'PENDIENTE_RETIRO', label: 'Pendiente Retiro', color: 'bg-amber-50 text-amber-700 border-amber-200 font-black' },
  { id: 'ESPERANDO_REPARTIDOR_RETIRO', label: 'Esperando Repartidor Retiro', color: 'bg-amber-100 text-amber-900 border-amber-300 font-black' },
  { id: 'ESPERANDO_ACEPTACION_REPARTIDOR', label: 'Esperando Aceptación Repartidor', color: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-black' },
  { id: 'REPARTIDOR_EN_CAMINO', label: 'Repartidor en Camino', color: 'bg-blue-50 text-blue-800 border-blue-200 font-black' },
  { id: 'RETIRADO', label: 'Retirado por Repartidor', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'RECOGIDO', label: 'Recogido por Repartidor', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'RECIBIDO', label: 'Recibido en Local', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'INSPECCIONADO', label: 'Inspeccionado & Cotizado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'EN_PROCESO', label: 'En Proceso (Taller)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'EN_LAVADO', label: 'En Lavado', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'EN_SECADO', label: 'En Secado', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'EN_ACABADOS', label: 'En Acabados', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'LISTO', label: 'Listo para Entrega', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' },
  { id: 'LISTO_PARA_ENTREGA', label: 'Listo para Entrega', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' },
  { id: 'ESPERANDO_REPARTIDOR_ENTREGA', label: 'Esperando Repartidor Entrega', color: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-black' },
  { id: 'EN_RUTA', label: 'En Ruta de Despacho', color: 'bg-amber-100 text-amber-800 border-amber-300 font-black' },
  { id: 'EN_RUTA_ENTREGA', label: 'En Ruta de Despacho', color: 'bg-amber-100 text-amber-800 border-amber-300 font-black' },
  { id: 'ENTREGADO', label: 'Entregado a Cliente', color: 'bg-purple-100 text-purple-900 border-purple-300 font-black' },
  { id: 'FINALIZADA', label: 'Finalizada & Cerrada', color: 'bg-slate-100 text-slate-700 border-slate-200 font-black' },
  { id: 'CANCELADO', label: 'Cancelado', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'CANCELADA', label: 'Cancelado', color: 'bg-rose-50 text-rose-700 border-rose-200' }
];

const ADICIONALES_CATALOGO = [
  { id: 'impermeabilizacion', nombre: 'Impermeabilización Repelente', precio: 2.00 },
  { id: 'blanqueamiento', nombre: 'Blanqueamiento UV de Suela', precio: 3.00 },
  { id: 'cordones', nombre: 'Cambio de Cordones Blancos/Nuevos', precio: 2.00 },
  { id: 'pegado', nombre: 'Pegado & Costura de Refuerzo', precio: 4.00 },
  { id: 'desodorizacion', nombre: 'Tratamiento Antibacteriano & Desodorización', precio: 2.00 }
];

export default function ShoeCareBackoffice({ negocio: negocioProp }: ShoeCareBackofficeProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionNegocioId = (session?.user as any)?.negocioId;
  const [negocio, setNegocio] = useState<any>(negocioProp || {});
  const negocioId = negocio?.id || negocioProp?.id || sessionNegocioId || 'demo-canchas';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modales
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [showWhatsAppReceiptModal, setShowWhatsAppReceiptModal] = useState<any>(null);
  const [showInspectModal, setShowInspectModal] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState<any>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Form Nueva Recepción en Local
  const [receptionForm, setReceptionForm] = useState({
    telefonoCliente: '',
    nombreCliente: '',
    emailCliente: '',
    servicioNombre: 'Lavado Completo',
    precioServicio: 6.00,
    cantidadPares: '1',
    fotosRecepcion: [] as string[],
    fotoInputUrl: '',
    observaciones: '',
    fechaEstimada: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    horaEstimada: '17:00'
  });

  // Form Nueva Orden (Domicilio)
  const [newOrderForm, setNewOrderForm] = useState({
    nombreCliente: '',
    telefonoCliente: '',
    modo: 'LOCAL',
    cantidadPares: '1',
    notas: '',
    direccionCliente: '',
    referenciaCliente: '',
    fechaHoraRetiro: '',
    fotosRecepcion: [] as string[]
  });

  const [receptionCountryCode, setReceptionCountryCode] = useState('+593');
  const [orderCountryCode, setOrderCountryCode] = useState('+593');

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

  const [mapCoords, setMapCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Form Inspección
  const [inspectForm, setInspectForm] = useState({
    nivelSuciedad: 'MEDIO',
    precioBase: 6.00,
    serviciosAdicionales: [] as Array<{ nombre: string; precio: number }>,
    costoRetiro: 1.50,
    costoEntrega: 1.50,
    totalEditado: 9.00,
    fechaHoraEntregaEstimada: 'Mañana a las 5:00 PM',
    notasInspeccion: ''
  });

  // Form Pago
  const [payForm, setPayForm] = useState({ metodoPago: 'EFECTIVO' });

  // Carga inicial de datos
  const fetchAllData = async () => {
    try {
      const [resOrd, resCli, resDrv, resInv, resSet, resProf, resProm] = await Promise.all([
        fetch(`/api/shoe-care/orders?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/clients?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/drivers?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/inventory?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/settings?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/profile?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/promotions?negocioId=${negocioId}`)
      ]);

      if (resOrd.ok) setOrdenes(await resOrd.json());
      if (resCli.ok) setClientes(await resCli.json());
      if (resDrv.ok) setDrivers(await resDrv.json());
      if (resInv.ok) setInventory(await resInv.json());
      if (resSet.ok) setSettings(await resSet.json());
      if (resProm.ok) setPromotions(await resProm.json());
      if (resProf.ok) {
        const profData = await resProf.json();
        if (profData && profData.id) setNegocio(profData);
      }
    } catch (e) {
      console.error('Error cargando datos del backoffice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [negocioId]);

  // Handlers
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.nombreCliente || !newOrderForm.telefonoCliente) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          latitud: mapCoords.lat,
          longitud: mapCoords.lng,
          ...newOrderForm
        })
      });

      if (res.ok) {
        setShowNewOrderModal(false);
        setNewOrderForm({ nombreCliente: '', telefonoCliente: '', modo: 'LOCAL', cantidadPares: '1', notas: '', direccionCliente: '', referenciaCliente: '', fechaHoraRetiro: '', fotosRecepcion: [] });
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receptionForm.nombreCliente || !receptionForm.telefonoCliente) return;

    const todayStr = new Date().toISOString().split('T')[0];
    if (receptionForm.fechaEstimada < todayStr) {
      alert('La fecha de entrega no puede ser menor a la fecha actual.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          modo: 'LOCAL',
          nombreCliente: receptionForm.nombreCliente,
          telefonoCliente: receptionForm.telefonoCliente,
          emailCliente: receptionForm.emailCliente,
          cantidadPares: receptionForm.cantidadPares,
          servicioNombre: receptionForm.servicioNombre,
          precioServicio: receptionForm.precioServicio,
          observaciones: receptionForm.observaciones,
          fotosRecepcion: receptionForm.fotosRecepcion,
          fechaEstimadaEntrega: `${receptionForm.fechaEstimada}T${receptionForm.horaEstimada}:00`
        })
      });

      if (res.ok) {
        const createdOrder = await res.json();
        setShowReceptionModal(false);
        setShowWhatsAppReceiptModal(createdOrder);
        setReceptionForm({
          telefonoCliente: '',
          nombreCliente: '',
          emailCliente: '',
          servicioNombre: 'Lavado Completo',
          precioServicio: 6.00,
          cantidadPares: '1',
          fotosRecepcion: [],
          fotoInputUrl: '',
          observaciones: '',
          fechaEstimada: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          horaEstimada: '17:00'
        });
        fetchAllData();
      }
    } catch (e) {
      console.error('Error creando recepción:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const generateWhatsAppMessage = (order: any) => {
    const nombre = order?.nombreCliente || '';
    const codigo = order?.numeroPedido || '101';
    const fechaObj = order?.fechaEntrega ? new Date(order.fechaEntrega) : new Date();
    const fechaFormatted = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaFormatted = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const marca = negocio?.nombre || 'BubbleWash';

    return `Hola ${nombre}

Recibimos tus zapatos correctamente.

Orden:
#${codigo}

Fecha estimada de entrega:
${fechaFormatted}
${horaFormatted}

Te notificaremos cuando estén listos.

${marca}`;
  };

  const handleSaveInspect = async (e: React.FormEvent) => {
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
        alert('Inspección y cotización guardada. WhatsApp enviado al cliente.');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, estado: string, extraData: any = {}) => {
    try {
      const res = await fetch(`/api/shoe-care/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, ...extraData })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePay = async (e: React.FormEvent) => {
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
        setShowOrderDetailModal(null);
        alert('Pago registrado y orden finalizada en estado ENTREGADO.');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const ordenesPendientes = ordenes.filter(o => o.estado === 'RECIBIDO' || o.estado === 'PENDIENTE_RETIRO').length;
  const pendientesRetiro = ordenes.filter(o => o.estado === 'PENDIENTE_RETIRO').length;
  const ordenesEnProceso = ordenes.filter(o => ['INSPECCIONADO', 'EN_LAVADO', 'EN_SECADO', 'EN_ACABADOS'].includes(o.estado)).length;
  const listasParaEntregar = ordenes.filter(o => o.estado === 'LISTO_PARA_ENTREGA').length;
  const enRuta = ordenes.filter(o => o.estado === 'EN_RUTA').length;
  const entregadasHoy = ordenes.filter(o => o.estado === 'ENTREGADO').length;
  const ingresosDia = ordenes.filter(o => o.estado === 'ENTREGADO').reduce((sum, o) => sum + o.total, 0);
  const ticketPromedio = ordenes.length > 0 ? (ordenes.reduce((sum, o) => sum + o.total, 0) / ordenes.length) : 0;
  const clientesNuevos = clientes.filter(c => new Date(c.createdAt) > new Date(Date.now() - 86400000 * 7)).length;
  const clientesRecurrentes = clientes.filter(c => (c.totalOrdenes || 0) > 1).length;

  // Filtrado de órdenes
  const filteredOrders = ordenes.filter(o => {
    const matchStatus = statusFilter === 'TODOS' || o.estado === statusFilter;
    const matchSearch = o.nombreCliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.telefonoCliente.includes(searchQuery) ||
                        o.numeroPedido.toString().includes(searchQuery);
    return matchStatus && matchSearch;
  });

  return (
    <div className="w-full space-y-8 bg-slate-50/50 min-h-screen text-slate-800 font-sans pb-16">
      <DynamicFavicon negocio={negocio} defaultTitle="BubbleWash | Panel Administrador" defaultIcon="/images/bubblewash/hero_sneakers.jpg" />

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200/80 p-6 md:p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black">
            <Footprints size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {negocio?.nombre || 'Sneaker Wash Premium'}
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200">
                ServiceEngine Active
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Control operativo universal: RECIBIR ➔ PROCESAR ➔ ENTREGAR
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowReceptionModal(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-purple-600/25 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Store size={18} strokeWidth={2.5} />
            + Nueva Recepción
          </button>
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="px-5 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Truck size={16} strokeWidth={2.5} />
            Nueva Solicitud Domicilio
          </button>
        </div>
      </div>

      {/* KPIs Grid - Modern Light Palette */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Órdenes Pendientes', val: ordenesPendientes, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
          { label: 'Pendientes Retiro', val: pendientesRetiro, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
          { label: 'En Proceso Lavado', val: ordenesEnProceso, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
          { label: 'Listas para Entregar', val: listasParaEntregar, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
          { label: 'En Ruta Despacho', val: enRuta, bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
          { label: 'Entregadas Hoy', val: entregadasHoy, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
          { label: 'Ingresos del Día', val: `$${ingresosDia.toFixed(2)}`, bg: 'bg-emerald-500 text-white', text: 'text-white', border: 'border-emerald-600 shadow-md shadow-emerald-500/20' },
          { label: 'Ticket Promedio', val: `$${ticketPromedio.toFixed(2)}`, bg: 'bg-slate-900 text-white', text: 'text-emerald-400', border: 'border-slate-800 shadow-md' },
          { label: 'Clientes Nuevos', val: clientesNuevos, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { label: 'Clientes Recurrentes', val: clientesRecurrentes, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' }
        ].map((kpi, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border ${kpi.bg} ${kpi.border} space-y-1 transition-all hover:scale-[1.02]`}>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">{kpi.label}</span>
            <span className={`text-2xl font-black ${kpi.text}`}>{kpi.val}</span>
          </div>
        ))}
      </div>

      {/* Main Orders Section */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Órdenes de Servicio ({filteredOrders.length})</h2>
            <p className="text-xs text-slate-500 font-medium">Gestión de estados, inspección, cotización y entrega de calzado</p>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === 'TODOS' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              Todos ({ordenes.length})
            </button>
            {ESTADOS_LISTA.map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st.id ? 'bg-emerald-600 text-white font-black shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar cliente, teléfono o #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <Footprints size={36} className="mx-auto text-slate-400" />
            <h3 className="text-base font-black text-slate-800">No hay órdenes para mostrar</h3>
            <p className="text-xs text-slate-500">Haz clic en "+ Nueva Orden de Servicio" para registrar un ingreso.</p>
          </div>
        ) : (
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 uppercase text-[10px] font-black text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Número</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Pares</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Recepción</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-bold bg-white">
                {filteredOrders.map(ord => {
                  const stObj = ESTADOS_LISTA.find(s => s.id === ord.estado) || ESTADOS_LISTA[0];
                  const extra = (ord.extraInfo as any) || {};

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-black text-emerald-600">#{ord.numeroPedido}</td>
                      <td className="p-4 text-slate-900 font-black">{ord.nombreCliente}</td>
                      <td className="p-4 font-mono text-slate-600">{ord.telefonoCliente}</td>
                      <td className="p-4 text-slate-800">{extra.cantidadPares || 1} par(es)</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${stObj.color}`}>
                          {stObj.label}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-emerald-700 font-black text-sm">${ord.total?.toFixed(2)}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => router.push(`/admin/service-orders/${ord.id}`)}
                          className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase transition-all cursor-pointer shadow-sm"
                        >
                          Workspace ➔
                        </button>
                        <button
                          onClick={() => {
                            setShowInspectModal(ord);
                            setInspectForm({
                              nivelSuciedad: extra.nivelSuciedad || 'MEDIO',
                              precioBase: ord.subtotal || 6.00,
                              serviciosAdicionales: extra.serviciosAdicionales || [],
                              costoRetiro: ord.costoEnvio || 1.50,
                              costoEntrega: 1.50,
                              totalEditado: ord.total || 9.00,
                              fechaHoraEntregaEstimada: extra.fechaHoraEntregaEstimada || 'Mañana a las 5:00 PM',
                              notasInspeccion: ''
                            });
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-xs transition-all cursor-pointer"
                        >
                          Inspeccionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVA ORDEN */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowNewOrderModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <form onSubmit={handleSaveOrder} className="space-y-4 text-slate-800">
              <h2 className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2">
                <Plus className="text-emerald-600" size={22} />
                Nueva Orden de Servicio (ServiceEngine)
              </h2>

              {clientes && clientes.length > 0 && (
                <div className="space-y-1 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200">
                  <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span>👤 Seleccionar Cliente Registrado</span>
                    <span className="text-[9px] text-emerald-600 font-bold">({clientes.length} disponibles)</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = clientes.find(c => (c.id && c.id === e.target.value) || (c.telefono && c.telefono === e.target.value));
                      if (selected) {
                        setNewOrderForm(prev => ({
                          ...prev,
                          nombreCliente: selected.nombre || prev.nombreCliente,
                          telefonoCliente: selected.telefono || prev.telefonoCliente,
                          direccionCliente: selected.direccion || prev.direccionCliente
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-xs"
                  >
                    <option value="">-- Cargar cliente registrado... --</option>
                    {clientes.map((c, i) => (
                      <option key={c.id || i} value={c.id || c.telefono}>
                        {c.nombre} ({c.telefono})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nombre Cliente *</label>
                  <input 
                    type="text" 
                    required 
                    value={newOrderForm.nombreCliente}
                    onChange={e => setNewOrderForm({ ...newOrderForm, nombreCliente: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Teléfono WhatsApp *</label>
                  <div className="flex gap-1.5">
                    <select
                      value={orderCountryCode}
                      onChange={(e) => setOrderCountryCode(e.target.value)}
                      className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 shrink-0"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input 
                      type="tel" 
                      required 
                      value={newOrderForm.telefonoCliente}
                      onChange={e => setNewOrderForm({ ...newOrderForm, telefonoCliente: e.target.value })}
                      className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Modo de Ingreso / Servicio</label>
                  <select
                    value={newOrderForm.modo}
                    onChange={e => setNewOrderForm({ ...newOrderForm, modo: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  >
                    <option value="DOMICILIO">🚚 Servicio Completo (Retiro + Entrega a Domicilio)</option>
                    <option value="LOCAL">🏬 En Local (Entrega y Retira en Local)</option>
                    <option value="RETIRO_SOLO">📦 Solo Retiro a Domicilio (Cliente retira en local)</option>
                    <option value="DESPACHO_SOLO">🛵 Deja en Local + Envío a Domicilio</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Cantidad de Pares</label>
                  <input 
                    type="number" 
                    value={newOrderForm.cantidadPares}
                    onChange={e => setNewOrderForm({ ...newOrderForm, cantidadPares: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {newOrderForm.modo !== 'LOCAL' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-500">Dirección de Retiro</label>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"
                    >
                      📍 Fijar en Mapa GPS
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newOrderForm.direccionCliente}
                    onChange={e => setNewOrderForm({ ...newOrderForm, direccionCliente: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow-md">
                Crear Orden de Servicio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE INSPECCIÓN & COTIZACIÓN COMPLETO */}
      {showInspectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800">
            <button onClick={() => setShowInspectModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <form onSubmit={handleSaveInspect} className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2">
                  <Footprints className="text-emerald-600" size={22} />
                  Inspección Física & Cotización (Orden #{showInspectModal.numeroPedido})
                </h2>
                <p className="text-xs text-slate-500 font-semibold">Cliente: <strong className="text-slate-900">{showInspectModal.nombreCliente}</strong></p>
              </div>

              {/* Nivel de suciedad */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Nivel de Suciedad / Tratamiento Base</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'POCO', label: 'Poco', price: 4.00 },
                    { id: 'MEDIO', label: 'Medio', price: 6.00 },
                    { id: 'ALTO', label: 'Alto', price: 8.00 },
                    { id: 'RESTAURACION', label: 'Restauración', price: 10.00 }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        setInspectForm({
                          ...inspectForm,
                          nivelSuciedad: lvl.id,
                          precioBase: lvl.price
                        });
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        inspectForm.nivelSuciedad === lvl.id 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-black' 
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="text-xs block">{lvl.label}</span>
                      <span className="text-[10px] font-bold text-slate-900 block mt-0.5">${lvl.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Servicios Adicionales */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Servicios Adicionales Requeridos</label>
                <div className="space-y-2">
                  {ADICIONALES_CATALOGO.map(addon => {
                    const isSelected = inspectForm.serviciosAdicionales.some(s => s.nombre === addon.nombre);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => {
                          let newAddons = [...inspectForm.serviciosAdicionales];
                          if (isSelected) {
                            newAddons = newAddons.filter(s => s.nombre !== addon.nombre);
                          } else {
                            newAddons.push({ nombre: addon.nombre, precio: addon.precio });
                          }
                          setInspectForm({ ...inspectForm, serviciosAdicionales: newAddons });
                        }}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-black' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{addon.nombre}</span>
                        <span>+${addon.precio.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desglose Cotización */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Precio Base:</span>
                  <span className="font-bold text-slate-900">${inspectForm.precioBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Adicionales:</span>
                  <span className="font-bold text-slate-900">
                    +${inspectForm.serviciosAdicionales.reduce((acc, s) => acc + s.precio, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-sm font-black text-slate-900">TOTAL DEFINITIVO ($):</span>
                  <input 
                    type="number"
                    value={inspectForm.precioBase + inspectForm.serviciosAdicionales.reduce((acc, s) => acc + s.precio, 0) + inspectForm.costoRetiro + inspectForm.costoEntrega}
                    onChange={e => setInspectForm({ ...inspectForm, totalEditado: parseFloat(e.target.value) })}
                    className="w-24 px-3 py-1.5 bg-white border border-emerald-500 rounded-lg text-emerald-700 font-mono font-black text-base text-right shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow-md"
              >
                Guardar Cotización & Notificar por WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE LA ORDEN COMPLETO */}
      {showOrderDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800">
            <button onClick={() => setShowOrderDetailModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase italic">
                    Detalle de Orden #{showOrderDetailModal.numeroPedido}
                  </h2>
                  <span className="text-xs font-bold text-emerald-600">{showOrderDetailModal.nombreCliente} ({showOrderDetailModal.telefonoCliente})</span>
                </div>
                <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 font-black">
                  ${showOrderDetailModal.total?.toFixed(2)}
                </span>
              </div>

              {/* Timeline de Cambio de Estado */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Avanzar Estado de Servicio</label>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_LISTA.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateOrderStatus(showOrderDetailModal.id, st.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${
                        showOrderDetailModal.estado === st.id ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal de Cobro */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-black uppercase text-slate-900 block">Registrar Cobro & Finalizar Orden</span>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={payForm.metodoPago}
                    onChange={e => setPayForm({ ...payForm, metodoPago: e.target.value })}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="MERCADO_PAGO">Mercado Pago</option>
                  </select>
                  <button
                    onClick={() => {
                      setShowPayModal(showOrderDetailModal);
                      handleSavePay({ preventDefault: () => {} } as any);
                    }}
                    className="py-2 bg-emerald-600 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow-xs"
                  >
                    Cobrar y Entregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏬 MODAL DE NUEVA RECEPCIÓN EN LOCAL */}
      {showReceptionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowReceptionModal(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider rounded-full">
                  Recepción de Mostrador
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Store className="text-purple-600" size={24} />
                + Nueva Recepción en Local
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Registra la recepción física del calzado, datos del cliente, fotografías iniciales y fecha estimada.
              </p>
            </div>

            <form onSubmit={handleSaveReception} className="space-y-6">
              {/* 1. DATOS DEL CLIENTE */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User size={14} className="text-purple-600" />
                    Datos del Cliente
                  </span>
                  {receptionForm.telefonoCliente && (
                    clientes.some(c => c.telefono && c.telefono.includes(receptionForm.telefonoCliente.trim())) ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Cliente Registrado
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-[10px] font-black rounded-full border border-purple-200">
                        🆕 Nuevo Cliente
                      </span>
                    )
                  )}
                </div>

                {clientes && clientes.length > 0 && (
                  <div className="space-y-1 bg-purple-100/60 p-3 rounded-xl border border-purple-200">
                    <label className="text-[10px] font-black uppercase tracking-wider text-purple-800 flex items-center justify-between">
                      <span>👤 Cargar Cliente Registrado</span>
                      <span className="text-[9px] text-purple-600 font-bold">({clientes.length} disponibles)</span>
                    </label>
                    <select
                      onChange={(e) => {
                        const selected = clientes.find(c => (c.id && c.id === e.target.value) || (c.telefono && c.telefono === e.target.value));
                        if (selected) {
                          setReceptionForm(prev => ({
                            ...prev,
                            nombreCliente: selected.nombre || prev.nombreCliente,
                            telefonoCliente: selected.telefono || prev.telefonoCliente,
                            emailCliente: selected.email || prev.emailCliente
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 shadow-xs"
                    >
                      <option value="">-- Seleccionar cliente de la lista --</option>
                      {clientes.map((c, i) => (
                        <option key={c.id || i} value={c.id || c.telefono}>
                          {c.nombre} ({c.telefono})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Teléfono WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">WhatsApp / Teléfono *</label>
                    <div className="flex gap-1.5">
                      <select
                        value={receptionCountryCode}
                        onChange={(e) => setReceptionCountryCode(e.target.value)}
                        className="px-2 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-purple-500 shadow-xs shrink-0"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Ej: 0991234567"
                          value={receptionForm.telefonoCliente}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = clientes.find(c => c.telefono && c.telefono.includes(val.trim()));
                            setReceptionForm(prev => ({
                              ...prev,
                              telefonoCliente: val,
                              nombreCliente: found ? found.nombre : prev.nombreCliente,
                              emailCliente: found ? (found.email || prev.emailCliente) : prev.emailCliente
                            }));
                          }}
                          className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nombre Cliente */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Ramírez"
                      value={receptionForm.nombreCliente}
                      onChange={(e) => setReceptionForm({ ...receptionForm, nombreCliente: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Email Opcional */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="carlos@ejemplo.com"
                    value={receptionForm.emailCliente}
                    onChange={(e) => setReceptionForm({ ...receptionForm, emailCliente: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-500 shadow-xs"
                  />
                </div>
              </div>

              {/* 2. SERVICIO Y PARES */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Footprints size={14} className="text-purple-600" />
                  Servicio Requerido
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Tipo de Servicio *</label>
                    <select
                      value={receptionForm.servicioNombre}
                      onChange={(e) => {
                        const srvName = e.target.value;
                        const catalog = (negocio?.services && Array.isArray(negocio.services) && negocio.services.length > 0)
                          ? negocio.services
                          : [
                              { nombre: 'Lavado Básico', precio: 4.00 },
                              { nombre: 'Lavado Completo', precio: 6.00 },
                              { nombre: 'Sneakers Premium', precio: 8.00 },
                              { nombre: 'Blancos', precio: 7.00 },
                              { nombre: 'Gamuza', precio: 9.00 },
                              { nombre: 'Restauración', precio: 15.00 }
                            ];
                        const match = catalog.find((s: any) => s.nombre === srvName);
                        setReceptionForm({
                          ...receptionForm,
                          servicioNombre: srvName,
                          precioServicio: match ? parseFloat(match.precio) : 6.00
                        });
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 shadow-xs"
                    >
                      {[
                        'Lavado Básico',
                        'Lavado Completo',
                        'Sneakers Premium',
                        'Blancos',
                        'Gamuza',
                        'Restauración'
                      ].map((sName, idx) => (
                        <option key={idx} value={sName}>
                          {sName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Cantidad de Pares *</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={receptionForm.cantidadPares}
                      onChange={(e) => setReceptionForm({ ...receptionForm, cantidadPares: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 shadow-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900">Total Estimado Inicial:</span>
                  <span className="font-black text-purple-700 text-base">
                    ${(receptionForm.precioServicio * (parseInt(receptionForm.cantidadPares) || 1)).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* 3. FOTOGRAFÍAS DE RECEPCIÓN */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera size={14} className="text-purple-600" />
                  Fotografías de Recepción (Estado Inicial)
                </span>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Pegar URL de foto del estado inicial..."
                    value={receptionForm.fotoInputUrl}
                    onChange={(e) => setReceptionForm({ ...receptionForm, fotoInputUrl: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!receptionForm.fotoInputUrl.trim()) return;
                      setReceptionForm({
                        ...receptionForm,
                        fotosRecepcion: [...receptionForm.fotosRecepcion, receptionForm.fotoInputUrl.trim()],
                        fotoInputUrl: ''
                      });
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    + Añadir
                  </button>
                </div>

                {/* Previsualización de fotos */}
                {receptionForm.fotosRecepcion.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {receptionForm.fotosRecepcion.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-xs group">
                        <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setReceptionForm({
                              ...receptionForm,
                              fotosRecepcion: receptionForm.fotosRecepcion.filter((_, i) => i !== idx)
                            });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. OBSERVACIONES & NOTAS */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Observaciones del Estado Inicial</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del calzado, suela, raspaduras o manchas observadas al recibir..."
                  value={receptionForm.observaciones}
                  onChange={(e) => setReceptionForm({ ...receptionForm, observaciones: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-500"
                />
              </div>

              {/* 5. FECHA Y HORA ESTIMADA DE ENTREGA */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-600" />
                  Fecha y Hora Estimada de Entrega
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Fecha Estimada *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={receptionForm.fechaEstimada}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (selectedDate < todayStr) {
                          alert('La fecha de entrega no puede ser menor a la fecha actual.');
                          return;
                        }
                        setReceptionForm({ ...receptionForm, fechaEstimada: selectedDate });
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Hora Estimada *</label>
                    <input
                      type="time"
                      required
                      value={receptionForm.horaEstimada}
                      onChange={(e) => setReceptionForm({ ...receptionForm, horaEstimada: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceptionModal(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Crear Orden de Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 MODAL WHATSAPP CONFIRMACIÓN DE RECEPCIÓN */}
      {showWhatsAppReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">¡Recepción Creada Exitosamente!</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Orden <strong className="text-purple-700">#{showWhatsAppReceiptModal.numeroPedido}</strong> registrada en estado <strong className="text-cyan-700">RECIBIDO EN LOCAL</strong>.
              </p>
            </div>

            {/* Template Preview Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left font-mono text-xs text-slate-700 whitespace-pre-line relative">
              {generateWhatsAppMessage(showWhatsAppReceiptModal)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppReceiptModal(null)}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition cursor-pointer"
              >
                Cerrar
              </button>

              <a
                href={`https://wa.me/${showWhatsAppReceiptModal.telefonoCliente}?text=${encodeURIComponent(generateWhatsAppMessage(showWhatsAppReceiptModal))}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsAppReceiptModal(null)}
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone size={16} />
                Enviar WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mapa */}
      <MapSelectionModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={mapCoords.lat}
        initialLng={mapCoords.lng}
        onConfirmLocation={(lat, lng) => setMapCoords({ lat, lng })}
      />
    </div>
  );
}
