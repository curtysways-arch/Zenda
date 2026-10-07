'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Video,
  Play,
  UploadCloud,
  Film,
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
  CheckCircle,
  Lock,
  ArrowRight,
  Package,
  Zap,
  MessageCircle,
  Banknote,
  WashingMachine,
  Wind,
  Sparkle,
  PackageCheck,
  SendHorizonal
} from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';

interface ShoeCareBackofficeProps {
  negocio?: any;
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

export interface ReceptionItem {
  id: string;
  tipo: string;
  servicioNombre: string;
  precioUnitario: number;
  cantidad: number;
  notas: string;
  fotos: string[];
}

const PRESET_ITEM_TYPES = [
  'Sneakers / Calzado Deportivo',
  'Zapatos de Gamuza / Nobuk',
  'Zapatos de Cuero / Formales',
  'Botas / Botines',
  'Mochila / Bolso / Maletín',
  'Gorra / Sombrero',
  'Chaqueta / Casaca / Abrigo',
  'Prenda de Vestir / Ropa',
  'Edredón / Cobija',
  'Maleta / Equipaje',
  'Otro Artículo'
];

export default function ShoeCareBackoffice({ negocio: negocioProp }: ShoeCareBackofficeProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionNegocioId = (session?.user as any)?.negocioId;
  const [negocio, setNegocio] = useState<any>(negocioProp || {});
  const negocioId = negocio?.id || negocioProp?.id || sessionNegocioId || '';

  useEffect(() => {
    if (negocioProp?.id && negocioProp.id !== negocio?.id) {
      setNegocio(negocioProp);
    }
  }, [negocioProp]);

  useEffect(() => {
    if (!negocio?.id && !negocioProp?.id && !sessionNegocioId) {
      fetch('/api/negocio')
        .then(r => r.json())
        .then(d => {
          if (d && d.id) {
            setNegocio(d);
          }
        })
        .catch(() => {});
    }
  }, [negocio?.id, negocioProp?.id, sessionNegocioId]);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isPlanFree, setIsPlanFree] = useState(false);

  useEffect(() => {
    fetch('/api/features')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.communications_module === false) {
          setIsPlanFree(true);
        }
      })
      .catch(() => {});
  }, []);

  const maskClientName = (name?: string) => {
    if (!name) return 'Cliente';
    if (!isPlanFree) return name;
    const parts = name.trim().split(' ');
    return parts.map(p => p.charAt(0) + '***').join(' ');
  };

  const maskClientPhone = (phone?: string) => {
    if (!phone) return 'Sin teléfono';
    if (!isPlanFree) return phone;
    const clean = phone.trim();
    if (clean.length <= 4) return '***';
    return clean.slice(0, 3) + ' *** *** ' + clean.slice(-3);
  };

  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [servicesList, setServicesList] = useState<any[]>(
    Array.isArray(negocioProp?.services) && negocioProp.services.length > 0 ? negocioProp.services : []
  );

  // Catálogo unificado y reactivo de servicios registrados para el negocio
  const effectiveServices = useMemo(() => {
    const raw = (servicesList && servicesList.length > 0)
      ? servicesList
      : ((negocio?.services && Array.isArray(negocio.services) && negocio.services.length > 0)
          ? negocio.services
          : []);

    if (raw.length > 0) {
      return raw.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        precio: parseFloat(s.precio) || 0,
        descripcion: s.descripcion || ''
      }));
    }

    return [
      { id: 'basico', nombre: 'Lavado Básico', precio: 4.00, descripcion: 'Ideal para calzado con poco suciedad' },
      { id: 'completo', nombre: 'Lavado Completo', precio: 6.00, descripcion: 'Limpieza profunda interior y exterior' },
      { id: 'premium', nombre: 'Sneakers Premium', precio: 8.00, descripcion: 'Materiales delicados y gamuza fina' },
      { id: 'blancos', nombre: 'Blancos', precio: 7.00, descripcion: 'Recuperación de color y suelas' },
      { id: 'gamuza', nombre: 'Gamuza', precio: 9.00, descripcion: 'Proceso especializado para gamuza y nobuk' },
      { id: 'restauracion', nombre: 'Restauración', precio: 15.00, descripcion: 'Limpieza profunda + repintado / retoques' }
    ];
  }, [servicesList, negocio?.services]);

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

  // Form Nueva Recepción en Local (Multi-Item)
  const [receptionForm, setReceptionForm] = useState({
    telefonoCliente: '',
    nombreCliente: '',
    emailCliente: '',
    items: [
      {
        id: 'item_1',
        tipo: 'Sneakers / Calzado Deportivo',
        servicioNombre: 'Lavado Completo',
        precioUnitario: 6.00,
        cantidad: 1,
        notas: '',
        fotos: []
      }
    ] as ReceptionItem[],
    servicioNombre: 'Lavado Completo',
    precioServicio: 6.00,
    cantidadPares: '1',
    fotosRecepcion: [] as string[],
    fotoInputUrl: '',
    observaciones: '',
    fechaEstimada: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    horaEstimada: '17:00'
  });

  const receptionTotalPares = useMemo(() => {
    return receptionForm.items.reduce((acc, it) => acc + (parseInt(String(it.cantidad)) || 1), 0);
  }, [receptionForm.items]);

  const receptionTotalEstimado = useMemo(() => {
    return receptionForm.items.reduce((acc, it) => acc + ((parseFloat(String(it.precioUnitario)) || 0) * (parseInt(String(it.cantidad)) || 1)), 0);
  }, [receptionForm.items]);

  const handleAddReceptionItem = () => {
    const defaultSrv = effectiveServices[0] || { nombre: 'Lavado Completo', precio: 6.00 };
    setReceptionForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tipo: 'Sneakers / Calzado Deportivo',
          servicioNombre: defaultSrv.nombre,
          precioUnitario: defaultSrv.precio,
          cantidad: 1,
          notas: '',
          fotos: []
        }
      ]
    }));
  };

  const handleRemoveReceptionItem = (idx: number) => {
    if (receptionForm.items.length <= 1) return;
    setReceptionForm(prev => {
      const nextItems = prev.items.filter((_, i) => i !== idx);
      const allFotos = nextItems.flatMap(it => it.fotos || []);
      return {
        ...prev,
        items: nextItems,
        fotosRecepcion: Array.from(new Set(allFotos))
      };
    });
  };

  const handleUpdateReceptionItem = (idx: number, patch: Partial<ReceptionItem>) => {
    setReceptionForm(prev => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], ...patch };
      return { ...prev, items: nextItems };
    });
  };

  const handleRemovePhotoFromItem = (itemIdx: number, photoUrl: string) => {
    setReceptionForm(prev => {
      const nextItems = [...prev.items];
      if (!nextItems[itemIdx]) return prev;
      const currentItem = nextItems[itemIdx];
      nextItems[itemIdx] = {
        ...currentItem,
        fotos: (currentItem.fotos || []).filter(u => u !== photoUrl)
      };
      const allFotos = nextItems.flatMap(it => it.fotos || []);
      return {
        ...prev,
        items: nextItems,
        fotosRecepcion: Array.from(new Set(allFotos))
      };
    });
  };

  // Estados para subida de fotos y video en recepción
  const [clientSectionCollapsed, setClientSectionCollapsed] = useState(false);
  const [itemDetailModalIdx, setItemDetailModalIdx] = useState<number | null>(null);
  const [activeMediaItemIdx, setActiveMediaItemIdx] = useState<number | null>(null);
  const [uploadingReceptionMedia, setUploadingReceptionMedia] = useState(false);
  const [receptionUploadProgress, setReceptionUploadProgress] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewMediaModal, setPreviewMediaModal] = useState<string | null>(null);

  const receptionCameraPhotoRef = useRef<HTMLInputElement | null>(null);
  const receptionCameraVideoRef = useRef<HTMLInputElement | null>(null);
  const receptionGalleryRef = useRef<HTMLInputElement | null>(null);

  const isVideoMedia = (url: string) => /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.includes('/video');

  const triggerUploadForItem = (itemIdx: number, type: 'photo' | 'video' | 'gallery') => {
    setActiveMediaItemIdx(itemIdx);
    if (type === 'photo') receptionCameraPhotoRef.current?.click();
    else if (type === 'video') receptionCameraVideoRef.current?.click();
    else if (type === 'gallery') receptionGalleryRef.current?.click();
  };

  const handleUploadReceptionMedia = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingReceptionMedia(true);
    setReceptionUploadProgress(`Preparando ${files.length} archivo(s)...`);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setReceptionUploadProgress(`Subiendo archivo ${i + 1} de ${files.length}...`);

        const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
        const maxSizeBytes = isVideo ? 60 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          alert(`El archivo "${file.name}" supera el tamaño permitido (${isVideo ? '60MB para videos' : '20MB para fotos'}).`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'order-inspection');

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error al subir ${file.name}`);
        }

        const data = await res.json();
        if (data.url) {
          newUrls.push(data.url);
        }
      }

      if (newUrls.length > 0) {
        setReceptionForm(prev => {
          if (activeMediaItemIdx !== null && prev.items[activeMediaItemIdx]) {
            const nextItems = [...prev.items];
            const currentItem = nextItems[activeMediaItemIdx];
            nextItems[activeMediaItemIdx] = {
              ...currentItem,
              fotos: [...(currentItem.fotos || []), ...newUrls]
            };
            const allFotos = nextItems.flatMap(it => it.fotos || []);
            return {
              ...prev,
              items: nextItems,
              fotosRecepcion: Array.from(new Set(allFotos))
            };
          }
          return {
            ...prev,
            fotosRecepcion: [...prev.fotosRecepcion, ...newUrls]
          };
        });
      }
    } catch (err: any) {
      console.error('Error subiendo multimedia de recepción:', err);
      alert(err.message || 'Error al procesar la multimedia');
    } finally {
      setUploadingReceptionMedia(false);
      setReceptionUploadProgress('');
      if (receptionCameraPhotoRef.current) receptionCameraPhotoRef.current.value = '';
      if (receptionCameraVideoRef.current) receptionCameraVideoRef.current.value = '';
      if (receptionGalleryRef.current) receptionGalleryRef.current.value = '';
    }
  };

  // Inicializar o ajustar servicio en receptionForm y newOrderForm con el catálogo real disponible
  useEffect(() => {
    if (effectiveServices.length > 0) {
      const matchRec = effectiveServices.find((s: any) => s.nombre === receptionForm.servicioNombre);
      if (!matchRec) {
        setReceptionForm(prev => ({
          ...prev,
          servicioNombre: effectiveServices[0].nombre,
          precioServicio: effectiveServices[0].precio
        }));
      } else if (receptionForm.precioServicio !== matchRec.precio) {
        setReceptionForm(prev => ({
          ...prev,
          precioServicio: matchRec.precio
        }));
      }

      const matchOrd = effectiveServices.find((s: any) => s.nombre === newOrderForm.servicioNombre);
      if (!matchOrd) {
        setNewOrderForm(prev => ({
          ...prev,
          servicioNombre: effectiveServices[0].nombre,
          precioServicio: effectiveServices[0].precio
        }));
      } else if (newOrderForm.precioServicio !== matchOrd.precio) {
        setNewOrderForm(prev => ({
          ...prev,
          precioServicio: matchOrd.precio
        }));
      }
    }
  }, [effectiveServices]);

  // Form Nueva Orden (Domicilio)
  const [newOrderForm, setNewOrderForm] = useState({
    nombreCliente: '',
    telefonoCliente: '',
    modo: 'LOCAL',
    servicioNombre: 'Lavado Completo',
    precioServicio: 6.00,
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
      const [resOrd, resCli, resDrv, resInv, resSet, resProf, resProm, resSrv] = await Promise.all([
        fetch(`/api/shoe-care/orders?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/clients?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/drivers?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/inventory?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/settings?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/profile?negocioId=${negocioId}`),
        fetch(`/api/shoe-care/promotions?negocioId=${negocioId}`),
        fetch(`/api/services?negocioId=${negocioId}`)
      ]);

      if (resOrd.ok) setOrdenes(await resOrd.json());
      if (resCli.ok) setClientes(await resCli.json());
      if (resDrv.ok) setDrivers(await resDrv.json());
      if (resInv.ok) setInventory(await resInv.json());
      if (resSet.ok) setSettings(await resSet.json());
      if (resProm.ok) setPromotions(await resProm.json());
      if (resProf.ok) {
        const profData = await resProf.json();
        if (profData && profData.id) {
          setNegocio((prev: any) => ({ ...prev, ...profData }));
          if (Array.isArray(profData.services) && profData.services.length > 0) {
            setServicesList(profData.services);
          }
        }
      }
      if (resSrv && resSrv.ok) {
        const srvData = await resSrv.json();
        if (Array.isArray(srvData) && srvData.length > 0) {
          setServicesList(srvData);
        }
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
        setNewOrderForm({ 
          nombreCliente: '', 
          telefonoCliente: '', 
          modo: 'LOCAL', 
          servicioNombre: effectiveServices[0]?.nombre || 'Lavado Completo',
          precioServicio: effectiveServices[0]?.precio || 6.00,
          cantidadPares: '1', 
          notas: '', 
          direccionCliente: '', 
          referenciaCliente: '', 
          fechaHoraRetiro: '', 
          fotosRecepcion: [] 
        });
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
    if (!receptionForm.nombreCliente || !receptionForm.telefonoCliente) {
      alert('Por favor ingresa el nombre y teléfono del cliente.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (receptionForm.fechaEstimada < todayStr) {
      alert('La fecha de entrega no puede ser menor a la fecha actual.');
      return;
    }

    setSubmitting(true);
    try {
      const articulosPayload = receptionForm.items.map(it => ({
        tipo: it.tipo || 'Artículo',
        servicioNombre: it.servicioNombre || 'Servicio',
        variante: it.notas || it.tipo || 'Estándar',
        precioUnitario: parseFloat(String(it.precioUnitario)) || 0,
        cantidad: parseInt(String(it.cantidad)) || 1,
        notas: it.notas || '',
        fotos: Array.isArray(it.fotos) ? it.fotos : []
      }));

      const mainServicioNombre = articulosPayload.length === 1
        ? `${articulosPayload[0].cantidad}x ${articulosPayload[0].tipo} (${articulosPayload[0].servicioNombre})`
        : `${articulosPayload.length} artículos: ${articulosPayload.map(a => `${a.cantidad}x ${a.tipo}`).join(', ')}`;

      const allItemFotos = receptionForm.items.flatMap(it => it.fotos || []);
      const combinedFotos = Array.from(new Set([...allItemFotos, ...(receptionForm.fotosRecepcion || [])]));

      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          modo: 'LOCAL',
          nombreCliente: receptionForm.nombreCliente,
          telefonoCliente: receptionForm.telefonoCliente,
          emailCliente: receptionForm.emailCliente,
          cantidadPares: receptionTotalPares,
          servicioNombre: mainServicioNombre,
          precioServicio: receptionTotalEstimado,
          articulos: articulosPayload,
          observaciones: receptionForm.observaciones,
          fotosRecepcion: combinedFotos,
          fechaEstimadaEntrega: `${receptionForm.fechaEstimada}T${receptionForm.horaEstimada}:00`
        })
      });

      if (res.ok) {
        const createdOrder = await res.json();
        setShowReceptionModal(false);
        setShowWhatsAppReceiptModal(createdOrder);
        setClientSectionCollapsed(false);
        setItemDetailModalIdx(null);
        const defaultSrv = effectiveServices[0] || { nombre: 'Lavado Completo', precio: 6.00 };
        setReceptionForm({
          telefonoCliente: '',
          nombreCliente: '',
          emailCliente: '',
          items: [
            {
              id: 'item_1',
              tipo: 'Sneakers / Calzado Deportivo',
              servicioNombre: defaultSrv.nombre,
              precioUnitario: defaultSrv.precio,
              cantidad: 1,
              notas: '',
              fotos: []
            }
          ],
          servicioNombre: defaultSrv.nombre,
          precioServicio: defaultSrv.precio,
          cantidadPares: '1',
          fotosRecepcion: [],
          fotoInputUrl: '',
          observaciones: '',
          fechaEstimada: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          horaEstimada: '17:00'
        });
        fetchAllData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Error creando orden de recepción');
      }
    } catch (e: any) {
      console.error('Error creando recepción:', e);
      alert(e.message || 'Error al procesar la recepción');
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

    const articulos = order?.extraInfo?.articulos || [];
    let itemsTexto = '';
    if (Array.isArray(articulos) && articulos.length > 0) {
      itemsTexto = articulos.map((a: any) => {
        const extraNote = a.notas ? ` (${a.notas})` : (a.variante && a.variante !== a.tipo ? ` (${a.variante})` : '');
        const itemSubtotal = ((parseFloat(a.precioUnitario) || 0) * (parseInt(a.cantidad) || 1)).toFixed(2);
        return `  • ${a.cantidad || 1}x ${a.tipo || 'Artículo'}: ${a.servicioNombre || 'Servicio'}${extraNote} - $${itemSubtotal} USD`;
      }).join('\n');
    } else if (Array.isArray(order?.items) && order.items.length > 0) {
      itemsTexto = order.items.map((it: any) => `  • ${it.cantidad}x ${it.nombreProducto}`).join('\n');
    } else {
      itemsTexto = `  • ${order?.extraInfo?.cantidadPares || 1} artículo(s) / calzado`;
    }

    const totalStr = Number(order?.total || 0).toFixed(2);

    return `Hola ${nombre} 👋

Confirmamos la recepción de tus prendas/artículos en ${marca}:
📋 Orden: #${codigo}

Artículos recibidos:
${itemsTexto}

💰 Total estimado: $${totalStr} USD

📅 Fecha estimada de entrega:
${fechaFormatted} a las ${horaFormatted}

Te notificaremos en cuanto estén listos para entrega. ¡Gracias por tu confianza!

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

  // Filtrado de órdenes con grupos
  const GRUPOS_ESTADOS: Record<string, string[]> = {
    '__NUEVAS__': ['SOLICITADA','PENDIENTE_RETIRO','ESPERANDO_REPARTIDOR_RETIRO','ESPERANDO_ACEPTACION_REPARTIDOR','REPARTIDOR_EN_CAMINO'],
    '__RECIBIDAS__': ['RECIBIDO','RETIRADO','RECOGIDO'],
    '__EN_PROCESO__': ['INSPECCIONADO','EN_PROCESO','EN_LAVADO','EN_SECADO','EN_ACABADOS'],
    '__LISTOS__': ['LISTO','LISTO_PARA_ENTREGA','ESPERANDO_REPARTIDOR_ENTREGA'],
    '__EN_RUTA__': ['EN_RUTA','EN_RUTA_ENTREGA'],
    '__CERRADAS__': ['ENTREGADO','FINALIZADA','CANCELADO','CANCELADA'],
  };

  const filteredOrders = ordenes.filter(o => {
    const matchStatus = statusFilter === 'TODOS'
      ? true
      : GRUPOS_ESTADOS[statusFilter]
        ? GRUPOS_ESTADOS[statusFilter].includes(o.estado)
        : o.estado === statusFilter;
    const matchSearch = (o.nombreCliente || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (o.telefonoCliente || '').includes(searchQuery) ||
                        (o.numeroPedido || '').toString().includes(searchQuery);
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

      {/* ── ÓRDENES ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Órdenes de Servicio
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold">{filteredOrders.length}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Gestiona el flujo completo de cada orden desde aquí</p>
          </div>
        </div>

        {/* Filtros agrupados */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { key: 'TODOS', label: '📋 Todas', count: ordenes.length },
            { key: '__NUEVAS__', label: '🆕 Nuevas', count: ordenes.filter(o => ['SOLICITADA','PENDIENTE_RETIRO','ESPERANDO_REPARTIDOR_RETIRO','ESPERANDO_ACEPTACION_REPARTIDOR','REPARTIDOR_EN_CAMINO'].includes(o.estado)).length },
            { key: '__RECIBIDAS__', label: '📦 Recibidas', count: ordenes.filter(o => ['RECIBIDO','RETIRADO','RECOGIDO'].includes(o.estado)).length },
            { key: '__EN_PROCESO__', label: '🧼 En Taller', count: ordenes.filter(o => ['INSPECCIONADO','EN_PROCESO','EN_LAVADO','EN_SECADO','EN_ACABADOS'].includes(o.estado)).length },
            { key: '__LISTOS__', label: '✅ Listos', count: ordenes.filter(o => ['LISTO','LISTO_PARA_ENTREGA','ESPERANDO_REPARTIDOR_ENTREGA'].includes(o.estado)).length },
            { key: '__EN_RUTA__', label: '🚴 En Ruta', count: ordenes.filter(o => ['EN_RUTA','EN_RUTA_ENTREGA'].includes(o.estado)).length },
            { key: '__CERRADAS__', label: '🏁 Cerradas', count: ordenes.filter(o => ['ENTREGADO','FINALIZADA','CANCELADO','CANCELADA'].includes(o.estado)).length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === f.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
          <div className="relative w-full sm:w-64 mt-1 sm:mt-0 sm:ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, tel. o #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Grid de tarjetas de órdenes */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
            <Footprints size={36} className="mx-auto text-slate-300" />
            <h3 className="text-base font-black text-slate-700">Sin órdenes en este filtro</h3>
            <p className="text-xs text-slate-400">Cambia el filtro o crea una nueva recepción.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map(ord => {
              const extra = (ord.extraInfo as any) || {};
              const stObj = ESTADOS_LISTA.find(s => s.id === ord.estado) || ESTADOS_LISTA[0];
              const pares = extra.cantidadPares || (Array.isArray(extra.articulos) ? extra.articulos.reduce((a: number, i: any) => a + (parseInt(i.cantidad) || 1), 0) : 1);
              const phoneForWA = (ord.telefonoCliente || '').replace(/\D/g, '');
              const articuloDesc = Array.isArray(extra.articulos) && extra.articulos.length > 0
                ? extra.articulos.map((a: any) => `${a.cantidad}x ${a.tipo || 'Artículo'}`).join(' · ')
                : ord.servicioNombre || `${pares} artículo(s)`;

              const ESTADOS_NUEVAS = ['SOLICITADA','PENDIENTE_RETIRO','ESPERANDO_REPARTIDOR_RETIRO','ESPERANDO_ACEPTACION_REPARTIDOR','REPARTIDOR_EN_CAMINO'];
              const ESTADOS_RECIBIDAS = ['RECIBIDO','RETIRADO','RECOGIDO'];
              const ESTADOS_EN_PROCESO = ['INSPECCIONADO','EN_PROCESO','EN_LAVADO','EN_SECADO','EN_ACABADOS'];
              const ESTADOS_LISTO = ['LISTO','LISTO_PARA_ENTREGA','ESPERANDO_REPARTIDOR_ENTREGA'];
              const ESTADOS_EN_RUTA = ['EN_RUTA','EN_RUTA_ENTREGA'];

              // Acción principal según estado
              let accionLabel = '';
              let accionCls = '';
              let accionFn: (() => void) | null = null;
              let accionIcon: React.ReactNode = null;

              // Acción secundaria (cobro, etc.)
              let accion2Label = '';
              let accion2Cls = '';
              let accion2Fn: (() => void) | null = null;
              let accion2Icon: React.ReactNode = null;

              if (ESTADOS_NUEVAS.includes(ord.estado)) {
                accionLabel = 'Marcar Recibido';
                accionCls = 'bg-cyan-600 hover:bg-cyan-700 text-white';
                accionIcon = <Package size={13} />;
                accionFn = () => handleUpdateOrderStatus(ord.id, 'RECIBIDO');
              } else if (ESTADOS_RECIBIDAS.includes(ord.estado)) {
                accionLabel = 'Inspeccionar & Cotizar';
                accionCls = 'bg-indigo-600 hover:bg-indigo-700 text-white';
                accionIcon = <Zap size={13} />;
                accionFn = () => {
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
                };
              } else if (ord.estado === 'INSPECCIONADO') {
                accionLabel = 'Iniciar Lavado';
                accionCls = 'bg-indigo-600 hover:bg-indigo-700 text-white';
                accionIcon = <ArrowRight size={13} />;
                accionFn = () => handleUpdateOrderStatus(ord.id, 'EN_LAVADO');
              } else if (ord.estado === 'EN_LAVADO') {
                accionLabel = '→ Pasar a Secado';
                accionCls = 'bg-violet-600 hover:bg-violet-700 text-white';
                accionIcon = <ArrowRight size={13} />;
                accionFn = () => handleUpdateOrderStatus(ord.id, 'EN_SECADO');
              } else if (ord.estado === 'EN_SECADO') {
                accionLabel = '→ Acabados';
                accionCls = 'bg-emerald-600 hover:bg-emerald-700 text-white';
                accionIcon = <ArrowRight size={13} />;
                accionFn = () => handleUpdateOrderStatus(ord.id, 'EN_ACABADOS');
              } else if (ord.estado === 'EN_ACABADOS' || ord.estado === 'EN_PROCESO') {
                accionLabel = '✅ Marcar Listo';
                accionCls = 'bg-emerald-600 hover:bg-emerald-700 text-white';
                accionIcon = <CheckCircle size={13} />;
                accionFn = () => handleUpdateOrderStatus(ord.id, 'LISTO_PARA_ENTREGA');
              } else if (ESTADOS_LISTO.includes(ord.estado)) {
                accionLabel = 'Entregar & Cobrar';
                accionCls = 'bg-purple-600 hover:bg-purple-700 text-white';
                accionIcon = <CheckCircle size={13} />;
                accionFn = () => { setShowPayModal(ord); setPayForm({ metodoPago: 'EFECTIVO' }); };
              } else if (ESTADOS_EN_RUTA.includes(ord.estado)) {
                accionLabel = '✅ Confirmar Entrega';
                accionCls = 'bg-purple-600 hover:bg-purple-700 text-white';
                accionIcon = <CheckCircle size={13} />;
                accionFn = () => handleUpdateOrderStatus(ord.id, 'ENTREGADO');
                accion2Label = 'Cobrar';
                accion2Cls = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200';
                accion2Icon = <Banknote size={13} />;
                accion2Fn = () => { setShowPayModal(ord); setPayForm({ metodoPago: 'EFECTIVO' }); };
              } else if (ord.estado === 'ENTREGADO') {
                accionLabel = 'Cobrar & Cerrar';
                accionCls = 'bg-emerald-600 hover:bg-emerald-700 text-white';
                accionIcon = <Banknote size={13} />;
                accionFn = () => { setShowPayModal(ord); setPayForm({ metodoPago: 'EFECTIVO' }); };
              }

              const borderAccent =
                ESTADOS_NUEVAS.includes(ord.estado) ? 'border-l-amber-400' :
                ESTADOS_RECIBIDAS.includes(ord.estado) ? 'border-l-cyan-400' :
                ESTADOS_EN_PROCESO.includes(ord.estado) ? 'border-l-indigo-400' :
                ESTADOS_LISTO.includes(ord.estado) ? 'border-l-emerald-500' :
                ESTADOS_EN_RUTA.includes(ord.estado) ? 'border-l-orange-400' :
                ord.estado === 'ENTREGADO' ? 'border-l-purple-400' :
                'border-l-slate-300';

              return (
                <div key={ord.id} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${borderAccent} shadow-sm hover:shadow-md transition-all flex flex-col`}>
                  {/* Header */}
                  <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0">
                        {(ord.nombreCliente || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm leading-tight truncate">{maskClientName(ord.nombreCliente)}</p>
                        <p className="text-[11px] text-slate-400">
                          {isPlanFree
                            ? <span className="blur-sm select-none">{maskClientPhone(ord.telefonoCliente)}</span>
                            : ord.telefonoCliente}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-emerald-600 text-sm">#{ord.numeroPedido}</span>
                      <p className="text-[11px] text-slate-400">{new Date(ord.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>

                  {/* Descripción artículos */}
                  <div className="px-4 pb-2">
                    <p className="text-[11px] text-slate-500 line-clamp-2">{articuloDesc}</p>
                  </div>

                  {/* Estado + Total */}
                  <div className="flex items-center justify-between px-4 pb-3 gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${stObj.color}`}>
                      {stObj.label}
                    </span>
                    <span className="font-black text-slate-900">${(ord.total || 0).toFixed(2)}</span>
                  </div>

                  {/* Acciones */}
                  <div className="border-t border-slate-100 px-3 py-2.5 flex flex-wrap gap-2 items-center">
                    {accionFn && (
                      <button
                        onClick={accionFn}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${accionCls}`}
                      >
                        {accionIcon}
                        {accionLabel}
                      </button>
                    )}
                    {accion2Fn && (
                      <button
                        onClick={accion2Fn}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${accion2Cls}`}
                      >
                        {accion2Icon}
                        {accion2Label}
                      </button>
                    )}
                    <div className="flex gap-1.5 ml-auto">
                      {!isPlanFree && phoneForWA && (
                        <a
                          href={`https://wa.me/${phoneForWA}`}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp"
                          className="p-2 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 transition-all"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => router.push(`/admin/service-orders/${ord.id}`)}
                        title="Ver detalle"
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-all"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Tipo de Servicio *</label>
                <select
                  value={newOrderForm.servicioNombre}
                  onChange={(e) => {
                    const srvName = e.target.value;
                    const match = effectiveServices.find((s: any) => s.nombre === srvName);
                    setNewOrderForm({
                      ...newOrderForm,
                      servicioNombre: srvName,
                      precioServicio: match ? match.precio : 6.00
                    });
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                >
                  {effectiveServices.map((srv: any, idx: number) => (
                    <option key={srv.id || idx} value={srv.nombre}>
                      {srv.nombre} (${srv.precio.toFixed(2)} USD)
                    </option>
                  ))}
                </select>
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
                    min={1}
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
                <p className="text-xs text-slate-500 font-semibold">Cliente: <strong className="text-slate-900">{maskClientName(showInspectModal.nombreCliente)}</strong></p>
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
                  <span className="text-xs font-bold text-emerald-600">{maskClientName(showOrderDetailModal.nombreCliente)} ({maskClientPhone(showOrderDetailModal.telefonoCliente)})</span>
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

      {/* 🏬 MODAL DE NUEVA RECEPCIÓN EN LOCAL - FORMATO COTIZACIÓN */}
      {showReceptionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* BARRA SUPERIOR (HEADER ESTÁTICO) */}
          <div className="h-16 px-4 sm:px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                <Store size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    + Nueva Recepción / Cotización
                  </h2>
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-purple-200">
                    Mostrador / Taller
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Recepción compacta tipo cotización con detalle de productos e inspección fotográfica
                </p>
              </div>
            </div>

            {/* Contador / Resumen rápido al centro */}
            <div className="hidden md:flex items-center gap-3 bg-purple-50 px-4 py-1.5 rounded-full border border-purple-200">
              <span className="text-xs font-bold text-purple-900">
                <strong className="text-purple-700">{receptionTotalPares}</strong> {receptionTotalPares === 1 ? 'artículo' : 'artículos'}
              </span>
              <span className="w-1 h-1 rounded-full bg-purple-300" />
              <span className="text-xs font-black text-purple-700">
                Total: ${receptionTotalEstimado.toFixed(2)} USD
              </span>
            </div>

            {/* Botones de acción derecha */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReceptionModal(false);
                  setClientSectionCollapsed(false);
                  setItemDetailModalIdx(null);
                }}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveReception}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-purple-600/25 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>Confirmar Orden</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReceptionModal(false);
                  setClientSectionCollapsed(false);
                  setItemDetailModalIdx(null);
                }}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Inputs ocultos para Cámara, Video y Archivos vinculados a activeMediaItemIdx */}
          <input
            type="file"
            ref={receptionCameraPhotoRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleUploadReceptionMedia(e.target.files)}
          />
          <input
            type="file"
            ref={receptionCameraVideoRef}
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={e => handleUploadReceptionMedia(e.target.files)}
          />
          <input
            type="file"
            ref={receptionGalleryRef}
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => handleUploadReceptionMedia(e.target.files)}
          />

          {/* CUERPO DEL MODAL (FORMATO COTIZACIÓN COMPACTA) */}
          <form onSubmit={handleSaveReception} className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-5 pb-8">
              
              {/* 1. ARRIBA: CLIENTE (SELECCIONAR / NUEVO, ESCONDE DATOS AL AÑADIR) */}
              {clientSectionCollapsed && (receptionForm.nombreCliente || receptionForm.telefonoCliente) ? (
                <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {receptionForm.nombreCliente?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {receptionForm.nombreCliente || 'Cliente'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-200">
                          ✓ Cliente Asignado
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        📱 {receptionCountryCode} {receptionForm.telefonoCliente} {receptionForm.emailCliente ? `· ✉️ ${receptionForm.emailCliente}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClientSectionCollapsed(false)}
                    className="self-start sm:self-auto px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit3 size={13} />
                    <span>Cambiar / Editar Cliente</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-purple-600" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        1. Cliente de la Orden
                      </span>
                    </div>
                    {receptionForm.nombreCliente && receptionForm.telefonoCliente && (
                      <button
                        type="button"
                        onClick={() => setClientSectionCollapsed(true)}
                        className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={12} /> Esconder datos
                      </button>
                    )}
                  </div>

                  {/* Dropdown de cliente frecuente */}
                  {clientes && clientes.length > 0 && (
                    <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center justify-between">
                        <span>👤 Seleccionar Cliente Frecuente</span>
                        <span className="text-[9px] text-purple-600 font-bold">({clientes.length} registrados)</span>
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
                            setClientSectionCollapsed(true);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                      >
                        <option value="">-- Buscar / Seleccionar cliente registrado --</option>
                        {clientes.map((c, i) => (
                          <option key={c.id || i} value={c.id || c.telefono}>
                            {c.nombre} ({c.telefono})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Inputs manuales: Teléfono, Nombre, Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">WhatsApp / Teléfono *</label>
                      <div className="flex gap-1">
                        <select
                          value={receptionCountryCode}
                          onChange={(e) => setReceptionCountryCode(e.target.value)}
                          className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-purple-500 shrink-0"
                        >
                          {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="0991234567"
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
                            className="w-full pl-7 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Carlos Ramírez"
                        value={receptionForm.nombreCliente}
                        onChange={(e) => setReceptionForm({ ...receptionForm, nombreCliente: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Email (Opcional)</label>
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={receptionForm.emailCliente}
                        onChange={(e) => setReceptionForm({ ...receptionForm, emailCliente: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {receptionForm.nombreCliente && receptionForm.telefonoCliente && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setClientSectionCollapsed(true)}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check size={13} />
                        <span>Confirmar Cliente & Ocultar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. ABAJO: INGRESO DE PRODUCTOS TIPO LISTADO / COTIZACIÓN */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Footprints size={16} className="text-purple-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      2. Artículos & Servicios ({receptionForm.items.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddReceptionItem}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus size={14} />
                    <span>+ Agregar Ítem</span>
                  </button>
                </div>

                {/* Tabla de Productos / Cotización */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[190px]">Tipo de Artículo</th>
                        <th className="py-2.5 px-3 min-w-[210px]">Servicio Requerido</th>
                        <th className="py-2.5 px-3 w-20 text-center">Cant.</th>
                        <th className="py-2.5 px-3 w-28">P. Unit ($)</th>
                        <th className="py-2.5 px-3 w-24 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 min-w-[150px] text-center">Fotos & Detalles</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receptionForm.items.map((item, idx) => {
                        const subtotalItem = (parseFloat(String(item.precioUnitario)) || 0) * (parseInt(String(item.cantidad)) || 1);
                        const hasMedia = item.fotos && item.fotos.length > 0;
                        const hasNotes = Boolean(item.notas && item.notas.trim());

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.tipo}
                                onChange={(e) => handleUpdateReceptionItem(idx, { tipo: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500 transition"
                              >
                                {PRESET_ITEM_TYPES.map(tipo => (
                                  <option key={tipo} value={tipo}>{tipo}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.servicioNombre}
                                onChange={(e) => {
                                  const srvName = e.target.value;
                                  const match = effectiveServices.find((s: any) => s.nombre === srvName);
                                  handleUpdateReceptionItem(idx, {
                                    servicioNombre: srvName,
                                    precioUnitario: match ? match.precio : item.precioUnitario
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-purple-500 transition"
                              >
                                {effectiveServices.map((srv: any, sIdx: number) => (
                                  <option key={srv.id || sIdx} value={srv.nombre}>
                                    {srv.nombre} (${srv.precio.toFixed(2)} USD)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={item.cantidad}
                                onChange={(e) => handleUpdateReceptionItem(idx, { cantidad: parseInt(e.target.value) || 1 })}
                                className="w-14 px-2 py-1.5 text-center bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.50"
                                  min={0}
                                  value={item.precioUnitario}
                                  onChange={(e) => handleUpdateReceptionItem(idx, { precioUnitario: parseFloat(e.target.value) || 0 })}
                                  className="w-24 pl-5 pr-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-black text-purple-700 outline-none focus:border-purple-500"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-800">
                              ${subtotalItem.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setItemDetailModalIdx(idx)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                  hasMedia || hasNotes
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                }`}
                                title="Ver / editar fotos y observaciones de este ítem"
                              >
                                <Camera size={13} className={hasMedia ? 'text-purple-600' : 'text-slate-400'} />
                                <span>
                                  {hasMedia ? `${item.fotos.length} foto${item.fotos.length > 1 ? 's' : ''}` : 'Fotos'}
                                  {hasNotes ? ' · 📝' : ''}
                                </span>
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {receptionForm.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReceptionItem(idx)}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer mx-auto"
                                  title="Eliminar ítem"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Barra inferior de la tabla */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleAddReceptionItem}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> + Agregar otro artículo a la cotización
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    Total artículos: <strong className="text-slate-900">{receptionTotalPares}</strong>
                  </span>
                </div>
              </div>

              {/* 3. ABAJO: OBSERVACIONES GENERALES */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  3. Observaciones Generales de la Orden
                </label>
                <textarea
                  rows={2}
                  placeholder="Indicaciones especiales de entrega, notas para el taller, solicitud del cliente..."
                  value={receptionForm.observaciones}
                  onChange={(e) => setReceptionForm({ ...receptionForm, observaciones: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              {/* 4. ABAJO: TIEMPO DE ENTREGA Y FECHA */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={15} className="text-purple-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      4. Tiempo de Entrega & Fecha
                    </span>
                  </div>
                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Mañana (+1d)', days: 1 },
                      { label: '+2 Días', days: 2 },
                      { label: '+3 Días', days: 3 },
                      { label: '+5 Días', days: 5 },
                      { label: '+1 Semana', days: 7 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          const targetDate = new Date(Date.now() + 86400000 * preset.days);
                          setReceptionForm(prev => ({
                            ...prev,
                            fechaEstimada: targetDate.toISOString().split('T')[0]
                          }));
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Fecha Estimada *</label>
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Hora Estimada *</label>
                    <input
                      type="time"
                      required
                      value={receptionForm.horaEstimada}
                      onChange={(e) => setReceptionForm({ ...receptionForm, horaEstimada: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. ABAJO: RESUMEN Y CONFIRMACIÓN */}
              <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Resumen de Cotización
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-bold rounded-full">
                      {receptionTotalPares} {receptionTotalPares === 1 ? 'artículo' : 'artículos'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      ${receptionTotalEstimado.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">USD Total Estimado</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReceptionModal(false);
                      setClientSectionCollapsed(false);
                      setItemDetailModalIdx(null);
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-purple-600/40 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>Confirmar Recepción</span>
                  </button>
                </div>
              </div>

            </div>
          </form>

          {/* MODAL APARTE: DETALLES E INSPECCIÓN DEL ÍTEM */}
          {itemDetailModalIdx !== null && receptionForm.items[itemDetailModalIdx] && (
            <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider rounded-md">
                      Ítem #{itemDetailModalIdx + 1}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      Detalles & Fotos de Inspección
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {receptionForm.items[itemDetailModalIdx].tipo} — {receptionForm.items[itemDetailModalIdx].servicioNombre}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItemDetailModalIdx(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Observaciones específicas del ítem */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-600 block">
                    Observaciones / Estado de este Ítem
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Mancha de grasa en puntera derecha, suela despegada, raspadura en talón..."
                    value={receptionForm.items[itemDetailModalIdx].notas || ''}
                    onChange={(e) => handleUpdateReceptionItem(itemDetailModalIdx, { notas: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                {/* Fotos & Video de este ítem */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase text-slate-600 block flex items-center gap-1.5">
                    <Camera size={14} className="text-purple-600" />
                    Fotos y Video de Ingreso ({receptionForm.items[itemDetailModalIdx].fotos?.length || 0})
                  </label>

                  {/* Botones de captura */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={uploadingReceptionMedia}
                      onClick={() => triggerUploadForItem(itemDetailModalIdx, 'photo')}
                      className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Camera size={14} />
                      <span>Tomar Foto</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploadingReceptionMedia}
                      onClick={() => triggerUploadForItem(itemDetailModalIdx, 'video')}
                      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Video size={14} />
                      <span>Grabar Video</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploadingReceptionMedia}
                      onClick={() => triggerUploadForItem(itemDetailModalIdx, 'gallery')}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-200"
                    >
                      <UploadCloud size={14} />
                      <span>Subir Archivo</span>
                    </button>
                  </div>

                  {uploadingReceptionMedia && activeMediaItemIdx === itemDetailModalIdx && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs text-purple-700 font-bold animate-pulse">
                      <Loader2 size={14} className="animate-spin text-purple-600" />
                      <span>{receptionUploadProgress || 'Subiendo archivo...'}</span>
                    </div>
                  )}

                  {/* Galería de miniaturas */}
                  {receptionForm.items[itemDetailModalIdx].fotos && receptionForm.items[itemDetailModalIdx].fotos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                      {receptionForm.items[itemDetailModalIdx].fotos.map((url, fIdx) => {
                        const isVid = isVideoMedia(url);
                        return (
                          <div key={fIdx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-950 group">
                            {isVid ? (
                              <div onClick={() => setPreviewMediaModal(url)} className="w-full h-full flex items-center justify-center cursor-pointer relative">
                                <video src={url} className="w-full h-full object-cover opacity-70" muted playsInline />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-md">
                                    <Play size={12} className="ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img src={url} alt={`Foto ${fIdx + 1}`} onClick={() => setPreviewMediaModal(url)} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePhotoFromItem(itemDetailModalIdx, url)}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                      <p className="text-xs text-slate-400">Sin fotos adjuntas para este ítem.</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setItemDetailModalIdx(null)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase rounded-xl transition cursor-pointer"
                  >
                    Listo / Guardar Detalles
                  </button>
                </div>
              </div>
            </div>
          )}
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

              {isPlanFree ? (
                <div className="py-3.5 px-4 bg-slate-100 border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed" title="WhatsApp disponible en Plan Pro">
                  <Lock size={16} />
                  WhatsApp (Plan Pro)
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Previsualización de Multimedia (Foto o Video) */}
      {previewMediaModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999999] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setPreviewMediaModal(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>
            {isVideoMedia(previewMediaModal) ? (
              <video 
                src={previewMediaModal} 
                controls 
                autoPlay 
                playsInline 
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img 
                src={previewMediaModal} 
                alt="Vista previa" 
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl" 
              />
            )}
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
