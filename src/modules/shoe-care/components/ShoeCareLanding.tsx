'use client';

import { useState, useEffect, useMemo } from 'react';
import DynamicFavicon from '@/components/DynamicFavicon';
import { 
  Sparkles, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight, 
  Phone, 
  Store, 
  AlertCircle, 
  X, 
  Loader2, 
  Footprints, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  Check,
  Star,
  Camera,
  Layers,
  HeartHandshake,
  UserCheck,
  Info,
  Instagram,
  Facebook,
  Trophy,
  User,
  ShoppingBag,
  Tag,
  Gift,
  Percent,
  Copy,
  CheckCheck,
  Flame,
  Package,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Heart
} from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import CoverageMapPublic from '@/components/public/CoverageMapPublic';
import PublicMobileNav from '@/components/public/PublicMobileNav';
import PhoneInput from '@/components/ui/PhoneInput';
import { isPointInPolygon } from '@/lib/geoUtils';
import UniversalServiceRequestModal from '@/components/public/UniversalServiceRequestModal';
import { CartProvider, useCart } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';

interface ShoeCareLandingProps {
  negocio: any;
  reviews?: any[];
  paginasPersonalizadas?: any[];
}

const cleanHtmlContent = (html: string) => {
  if (!html) return '';
  return html
    .replace(/\{\/\*.*?\*\/\}/g, '')
    .replace(/<!--.*?-->/g, '')
    .replace(/<p>\s*<\/p>/g, '');
};

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

const TIME_SLOTS = [
  { id: '09-11', label: '09:00 - 11:00 AM', icon: '🌅 Mañana', startHour: 9, endHour: 11 },
  { id: '11-13', label: '11:00 AM - 01:00 PM', icon: '☀️ Mediodía', startHour: 11, endHour: 13 },
  { id: '14-16', label: '02:00 - 04:00 PM', icon: '🌤️ Tarde', startHour: 14, endHour: 16 },
  { id: '16-18', label: '04:00 - 06:00 PM', icon: '🌆 Víspera', startHour: 16, endHour: 18 }
];

const SERVICIOS_CATALOGO = [
  {
    id: 'basico',
    nombre: 'Lavado Básico',
    precio: '4',
    descripcion: 'Ideal para zapatos con poco suciedad.',
    imagen: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80'
  },
  {
    id: 'completo',
    nombre: 'Lavado Completo',
    precio: '6',
    descripcion: 'Limpieza profunda interior y exterior.',
    imagen: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&q=80'
  },
  {
    id: 'premium',
    nombre: 'Sneakers Premium',
    precio: '8',
    descripcion: 'Materiales delicados y premium.',
    imagen: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=400&q=80'
  },
  {
    id: 'blancos',
    nombre: 'Blancos',
    precio: '7',
    descripcion: 'Recuperación de color.',
    imagen: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80'
  },
  {
    id: 'gamuza',
    nombre: 'Gamuza',
    precio: '9',
    descripcion: 'Proceso especializado.',
    imagen: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80'
  },
  {
    id: 'restauracion',
    nombre: 'Restauración',
    precio: '15',
    descripcion: 'Limpieza + recuperación.',
    imagen: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80'
  }
];

const FAQS = [
  { q: '¿Cuánto tarda el servicio?', a: 'El servicio estándar toma entre 24 y 48 horas según el tipo de calzado y el secado requerido.' },
  { q: '¿Cómo sé cuánto pagaré?', a: 'Realizamos una inspección inicial al recibir tus zapatos y confirmamos el precio final por WhatsApp antes de lavar.' },
  { q: '¿Qué pasa si mis zapatos necesitan restauración?', a: 'Si requieren pegado, costura o repintado de suela, te enviaremos una cotización detallada para tu aprobación.' },
  { q: '¿Puedo llevarlos directamente al local?', a: '¡Claro que sí! Puedes dejarlos en nuestro taller físico en el horario de atención.' },
  { q: '¿Toman fotos del proceso?', a: 'Sí, fotografiamos tus zapatos al recibirlos y al finalizar para enviarte el estado Antes/Después.' }
];

export default function ShoeCareLanding(props: ShoeCareLandingProps) {
  const defaultDeliveryCost = Number((props.negocio?.configuracion as any)?.costoEnvio) || 2.00;
  return (
    <CartProvider businessId={props.negocio?.id || 'sneaker-wash-id'} defaultDeliveryCost={defaultDeliveryCost}>
      <ShoeCareLandingInner {...props} />
    </CartProvider>
  );
}

function ShoeCareLandingInner({ negocio, reviews = [], paginasPersonalizadas = [] }: ShoeCareLandingProps) {
  const [isMounted, setIsMounted] = useState(false);
  // Páginas: inicialmente las del servidor (pueden ser vacías si Prisma falla), se recargan desde API pública al montar
  const [paginas, setPaginas] = useState<any[]>(paginasPersonalizadas);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showInStoreModal, setShowInStoreModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [searchingLookup, setSearchingLookup] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [lookupStep, setLookupStep] = useState<'PHONE' | 'OTP' | 'ORDERS'>('PHONE');
  const [otpCode, setOtpCode] = useState('');

  // Carrito de compras integrado (E-Commerce Store Phase)
  const { addToCart, totalItemsCount, isCartOpen, setIsCartOpen, getItemQuantity } = useCart();
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Estado para Tienda de Productos y Promociones
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dbPromotions, setDbPromotions] = useState<any[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null);
  const [selectedPromotionDetail, setSelectedPromotionDetail] = useState<any | null>(null);
  const [promoQty, setPromoQty] = useState<number>(1);
  const [copiedPromoCode, setCopiedPromoCode] = useState<string | null>(null);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('TODOS');

  // Montar y cargar páginas desde API pública si el servidor no las entregó
  useEffect(() => {
    setIsMounted(true);
    if (negocio?.id) {
      fetch(`/api/public/pages/${negocio.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setPaginas(data);
          }
        })
        .catch(() => {});

      // Cargar productos de la tienda
      setLoadingProducts(true);
      fetch(`/api/shoe-care/inventory?businessId=${negocio.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) setDbProducts(data);
        })
        .catch(() => {})
        .finally(() => setLoadingProducts(false));

      // Cargar promociones activas
      setLoadingPromotions(true);
      fetch(`/api/shoe-care/promotions?negocioId=${negocio.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) setDbPromotions(data);
        })
        .catch(() => {})
        .finally(() => setLoadingPromotions(false));
    }

    // Detectar si el usuario viene de la lista de servicios con ?service=...
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const requestedService = urlParams.get('service');
      if (requestedService) {
        setForm(prev => ({ ...prev, notas: `Servicio solicitado: ${requestedService}` }));
        setShowPickupModal(true);
      }
    }
  }, [negocio?.id]);

  // Carrusel del Banner Hero
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  // Ubicación por mapa
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Selección de fecha y hora
  const [selectedDayOption, setSelectedDayOption] = useState<'HOY' | 'MANANA' | 'PASADO'>('MANANA');
  const [selectedSlot, setSelectedSlot] = useState<string>('14-16');

  const [form, setForm] = useState({
    nombreCliente: '',
    telefonoCliente: '',
    direccionCliente: '',
    referenciaCliente: '',
    cantidadPares: '1',
    notas: ''
  });

  const [coveragePolygon, setCoveragePolygon] = useState<Array<[number, number]>>([]);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ nombre?: string; telefono?: string } | null>(null);

  // Cargar la cobertura oficial del negocio (Requirement 3)
  useEffect(() => {
    if (negocio?.id) {
      fetch(`/api/shoe-care/coverage?negocioId=${negocio.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data.poligono) && data.poligono.length >= 3) {
            setCoveragePolygon(data.poligono);
          }
        })
        .catch(() => {});
    }
  }, [negocio?.id]);

  // Cargar perfil del cliente si existe sesión iniciada (Requirement 4)
  useEffect(() => {
    if (negocio?.slug) {
      fetch(`/api/${negocio.slug}/perfil`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && (data.nombre || data.telefono)) {
            setIsCustomerLoggedIn(true);
            setCustomerProfile(data);
            setForm(prev => ({
              ...prev,
              nombreCliente: data.nombre || prev.nombreCliente,
              telefonoCliente: data.telefono || prev.telefonoCliente
            }));
          }
        })
        .catch(() => {});
    }
  }, [negocio?.slug]);

  // Determinar si la posición GPS seleccionada está fuera de cobertura (Requirement 3)
  const isOutsideCoverage = useMemo(() => {
    if (!coords.lat || !coords.lng || !coveragePolygon || coveragePolygon.length < 3) {
      return false;
    }
    return !isPointInPolygon([coords.lat, coords.lng], coveragePolygon);
  }, [coords.lat, coords.lng, coveragePolygon]);

  // Helper para verificar si un horario está pasado para HOY (Requirement 5)
  const isSlotDisabled = (slot: typeof TIME_SLOTS[0]) => {
    if (selectedDayOption !== 'HOY') return false;
    const currentHour = new Date().getHours();
    return currentHour >= slot.startHour;
  };

  // Ajustar horario automáticamente al cambiar el día preferido (Requirement 5)
  useEffect(() => {
    if (selectedDayOption === 'HOY') {
      const available = TIME_SLOTS.find(s => !isSlotDisabled(s));
      if (available) {
        setSelectedSlot(available.id);
      }
    }
  }, [selectedDayOption]);

  const nombreNegocio = negocio?.nombre || 'BubbleWash';
  const logoUrl = negocio?.logoUrl || '';
  const whatsappNum = negocio?.whatsapp || negocio?.telefono || '0991234567';
  const direccion = negocio?.direccion || 'Calle 123 #45-67';
  const horarioApertura = negocio?.horarioApertura || '09:00';
  const horarioCierre = negocio?.horarioCierre || '19:00';

  // Recopilar todas las imágenes de portada (carrusel)
  const bannerImages: string[] = [];
  if (negocio?.imagenesPortada && Array.isArray(negocio.imagenesPortada) && negocio.imagenesPortada.length > 0) {
    bannerImages.push(...negocio.imagenesPortada);
  }
  if (negocio?.media && Array.isArray(negocio.media) && negocio.media.length > 0) {
    negocio.media.forEach((m: any) => {
      if (m.url && !bannerImages.includes(m.url)) {
        bannerImages.push(m.url);
      }
    });
  }
  if (negocio?.portadaUrl && !bannerImages.includes(negocio.portadaUrl)) {
    bannerImages.push(negocio.portadaUrl);
  }
  if (negocio?.configuracion?.bannerUrl && !bannerImages.includes(negocio.configuracion.bannerUrl)) {
    bannerImages.push(negocio.configuracion.bannerUrl);
  }
  if (bannerImages.length === 0) {
    bannerImages.push(
      '/images/bubblewash/hero_sneakers.jpg',
      '/images/bubblewash/store_front.jpg',
      '/images/bubblewash/delivery_driver.jpg'
    );
  }

  // Auto-play para el carrusel de banner hero
  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerImages.length]);

  const displayServices = (negocio?.services && Array.isArray(negocio.services) && negocio.services.length > 0)
    ? negocio.services.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        precio: s.precio?.toString() || '6',
        descripcion: s.descripcion || 'Servicio profesional de limpieza.',
        imagen: s.imagenUrl || s.imagen || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80'
      }))
    : SERVICIOS_CATALOGO;

  // Promociones canónicas de alta conversión con compra directa al carrito (idéntico al módulo de tienda)
  const CANONICAL_PROMOTIONS = [
    {
      id: 'promo-combo-sneakers',
      codigo: 'COMBOSNEAKERNY',
      titulo: 'Combo Sneakers Court + Gorra NY',
      descripcion: 'Pack Streetwear Calzado + Accesorio: Sneakers Urban Court Low + Gorra NY Vintage Fitted.',
      badge: 'COMBO 2x1',
      precioPromo: 59.90,
      precioAnterior: 104.40,
      imagenUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&q=80',
      porcentajeReservado: 85,
      disponibilidadTexto: 'Quedan pocas unidades',
      color: 'from-purple-600 via-indigo-600 to-pink-600',
      tagColor: 'bg-purple-100 text-purple-700',
      incluye: [
        'Sneakers Urban Court Low edición especial',
        'Gorra NY Vintage Fitted estructurada con bordado 3D',
        'Caja protectora de colección + stickers exclusivos'
      ],
      caracteristicas: [
        'Ahorro directo de $44.50 USD en el paquete',
        'Garantía de originalidad y satisfacción 100%',
        'Entrega inmediata a domicilio o retiro en taller'
      ]
    },
    {
      id: 'promo-gorra-fitted',
      codigo: 'GORRANYFITTED',
      titulo: 'Gorra NY Fitted Streetwear',
      descripcion: 'El accesorio perfecto para tus sneakers ahora con descuento exclusivo por compra en línea.',
      badge: 'TOP VENTA',
      precioPromo: 16.90,
      precioAnterior: 24.50,
      imagenUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80',
      porcentajeReservado: 90,
      disponibilidadTexto: 'Quedan pocas unidades',
      color: 'from-amber-600 via-orange-600 to-rose-600',
      tagColor: 'bg-amber-100 text-amber-700',
      incluye: [
        'Gorra New York Fitted estructurada 100% algodón',
        'Bordado frontal en relieve de alta definición',
        'Visera rígida curva pre-formada con ajuste ergonómico'
      ],
      caracteristicas: [
        '31% de descuento por tiempo limitado',
        'Material transpirable con banda absorbente interna',
        'Ideal para combinar con cualquier sneaker'
      ]
    },
    {
      id: 'promo-pack-limpieza',
      codigo: 'PACKCAREPRO',
      titulo: 'Kit Completo Sneaker Care Pro',
      descripcion: 'Espuma activa + Impermeabilizante nano + Cepillo suave de cerdas naturales con 35% de ahorro.',
      badge: 'AHORRA 35%',
      precioPromo: 24.90,
      precioAnterior: 38.50,
      imagenUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80',
      porcentajeReservado: 75,
      disponibilidadTexto: 'Alta demanda hoy',
      color: 'from-emerald-600 via-teal-600 to-cyan-600',
      tagColor: 'bg-emerald-100 text-emerald-700',
      incluye: [
        '1x Espuma Limpiadora Bubble Clean (250ml)',
        '1x Impermeabilizante Nano Protector (200ml)',
        '1x Cepillo de Cerdas Suaves de Cerdo natural',
        '1x Toalla de Microfibra de secado rápido'
      ],
      caracteristicas: [
        'Kit todo en uno para el cuidado completo de hasta 30 pares',
        'Fórmula segura para cuero, lona, nobuk, gamuza y malla',
        'Protección invisible que repele agua, manchas y líquidos'
      ]
    }
  ];

  // Productos canónicos profesionales de Sneaker Care
  const CANONICAL_PRODUCTS = [
    {
      id: 'prod-foam-cleaner',
      nombre: 'Espuma Limpiadora Bubble Clean (250ml)',
      descripcion: 'Fórmula activa de limpieza instantánea y secado ultra rápido. Segura en malla, cuero, lona y sintéticos.',
      precio: 12.50,
      categoria: { nombre: 'Limpieza' },
      imagenUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
      stock: 25,
      caracteristicas: ['Efecto espuma activa sin sumergir en agua', 'Protege el color original de los sneakers', 'Incluye aplicador ergonómico'],
      isCanonical: true
    },
    {
      id: 'prod-nano-protect',
      nombre: 'Impermeabilizante Nano Protector (200ml)',
      descripcion: 'Capa molecular invisible que repele agua, lluvia, café, salsas y suciedad extrema hasta por 4 semanas.',
      precio: 14.00,
      categoria: { nombre: 'Protección' },
      imagenUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
      stock: 18,
      caracteristicas: ['Fórmula nanotecnológica transpirable', 'Ideal para gamuza, nobuk, lona y cuero', 'No altera la textura ni el tono'],
      isCanonical: true
    },
    {
      id: 'prod-soft-brush',
      nombre: 'Cepillo de Cerdas Suaves de Cerdo',
      descripcion: 'Cerdas naturales extra suaves pensadas para limpiar telas premium, gamuza y nobuk sin raspar ni deshilachar.',
      precio: 6.50,
      categoria: { nombre: 'Accesorios' },
      imagenUrl: 'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=500&q=80',
      stock: 30,
      caracteristicas: ['Mango de madera ergonómico barnizado', 'Cerdas 100% naturales libres de estática', 'Larga vida útil'],
      isCanonical: true
    },
    {
      id: 'prod-laces-pack',
      nombre: 'Cordones Premium Reflectivos 3M (Par)',
      descripcion: 'Laces de alta densidad con filamentos reflectivos para máxima visibilidad nocturna y estilo sneakerhead.',
      precio: 5.00,
      categoria: { nombre: 'Estilo' },
      imagenUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80',
      stock: 40,
      caracteristicas: ['Punteras transparentes reforzadas', 'Longitud universal 120cm', 'Resistentes al lavado'],
      isCanonical: true
    }
  ];

  // Consolidar Promociones con soporte para carrito y combos
  const displayPromotions = useMemo(() => {
    const list = [...(dbPromotions || [])];
    const formattedDb = list.map((p: any) => {
      // Helper para extraer lista de items si viene en descripción o meta
      let incluyeList: string[] = [];
      if (p.incluye && Array.isArray(p.incluye) && p.incluye.length > 0) {
        incluyeList = p.incluye;
      } else if (p.meta?.items && Array.isArray(p.meta.items)) {
        incluyeList = p.meta.items;
      } else if (p.meta?.comboProducts && Array.isArray(p.meta.comboProducts)) {
        incluyeList = p.meta.comboProducts.map((cp: any) => cp.nombre || cp.title);
      } else {
        const titleLower = (p.titulo || '').toLowerCase();
        if (titleLower.includes('court') || (titleLower.includes('sneaker') && titleLower.includes('gorra'))) {
          incluyeList = [
            'Sneakers Urban Court Low edición especial',
            'Gorra NY Vintage Fitted estructurada con bordado 3D',
            'Caja protectora de colección + stickers exclusivos'
          ];
        } else if (titleLower.includes('kit') || titleLower.includes('care pro') || titleLower.includes('limpieza')) {
          incluyeList = [
            '1x Espuma Limpiadora Bubble Clean (250ml)',
            '1x Impermeabilizante Nano Protector (200ml)',
            '1x Cepillo de Cerdas Suaves de Cerdo natural',
            '1x Toalla de Microfibra de secado rápido'
          ];
        } else if (titleLower.includes('gorra')) {
          incluyeList = [
            'Gorra New York Fitted estructurada 100% algodón',
            'Bordado frontal en relieve de alta definición',
            'Visera rígida curva pre-formada con ajuste ergonómico'
          ];
        } else if (p.descripcion && p.descripcion.includes('+')) {
          incluyeList = p.descripcion.split('+').map((s: string) => s.trim()).filter(Boolean);
        } else {
          incluyeList = [
            'Artículo original con certificación de calidad',
            'Empaque de protección especial incluido',
            'Garantía de satisfacción BubbleWash'
          ];
        }
      }

      let beneficiosList: string[] = [];
      if (p.caracteristicas && Array.isArray(p.caracteristicas) && p.caracteristicas.length > 0) {
        beneficiosList = p.caracteristicas;
      } else {
        const titleLower = (p.titulo || '').toLowerCase();
        if (titleLower.includes('court') || titleLower.includes('sneaker')) {
          beneficiosList = [
            'Ahorro directo garantizado frente al precio de lista',
            'Materiales premium de alta resistencia y durabilidad',
            'Envío a domicilio o retiro inmediato en taller'
          ];
        } else if (titleLower.includes('kit') || titleLower.includes('care pro') || titleLower.includes('limpieza')) {
          beneficiosList = [
            'Rinde para el cuidado y protección de hasta 30 pares',
            'Fórmula segura para cuero, lona, nobuk, gamuza y malla',
            'Repele agua, manchas y líquidos por hasta 4 semanas'
          ];
        } else if (titleLower.includes('gorra')) {
          beneficiosList = [
            'Descuento exclusivo por tiempo limitado',
            'Banda absorbente interna y diseño transpirable',
            'Combinación perfecta para tus mejores sneakers'
          ];
        } else {
          beneficiosList = [
            'Oferta por tiempo limitado sujeta a disponibilidad',
            'Garantía de satisfacción y entrega inmediata'
          ];
        }
      }

      return {
        id: p.id,
        codigo: p.codigo,
        valor: p.valor,
        tipo: p.tipo || 'PORCENTAJE',
        titulo: p.titulo || p.descripcion || `Cupón ${p.codigo}`,
        descripcion: p.descripcion || (p.tipo === 'PORCENTAJE' 
          ? `Obtén un ${p.valor}% de descuento en tu orden con este cupón exclusivo.`
          : `Ahorra $${p.valor} USD en tu servicio con este cupón.`),
        badge: p.badge || (p.tipo === 'PORCENTAJE' ? `${p.valor}% OFF` : (p.tipoPromo === 'COMBO' ? 'COMBO 2x1' : 'OFERTA')),
        precioPromo: Number(p.precioPromo || (p.tipo === 'FIJO' ? p.valor : 19.99)),
        precioAnterior: p.precioAnterior ? Number(p.precioAnterior) : 29.99,
        porcentajeReservado: p.porcentajeReservado || 80,
        disponibilidadTexto: p.disponibilidadTexto || 'Quedan pocas unidades',
        imagenUrl: p.imagenUrl || 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&q=80',
        color: p.color || 'from-purple-700 via-indigo-700 to-pink-700',
        tagColor: p.tagColor || 'bg-purple-100 text-purple-700',
        incluye: incluyeList,
        caracteristicas: beneficiosList
      };
    });

    const existingCodes = new Set(formattedDb.map(d => d.codigo));
    const complementary = CANONICAL_PROMOTIONS.filter(c => !existingCodes.has(c.codigo));
    return [...formattedDb, ...complementary].slice(0, 4);
  }, [dbPromotions]);

  // Consolidar Productos con búsqueda de texto y filtrado de categorías
  const displayProducts = useMemo(() => {
    const list = [...(dbProducts || [])];
    const formattedDb = list.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || 'Producto profesional para el cuidado y mantenimiento de calzado.',
      precio: Number(p.precio || 0),
      categoria: p.categoria || { nombre: 'General' },
      imagenUrl: p.imagenUrl || p.imagen || 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80',
      stock: p.stock ?? 10,
      rating: 4.8,
      caracteristicas: p.extraInfo?.caracteristicas || ['Producto de calidad garantizada', 'Apto para todo tipo de calzado'],
      isCanonical: false
    }));

    const existingNames = new Set(formattedDb.map(p => p.nombre.toLowerCase().trim()));
    const complementary = CANONICAL_PRODUCTS.filter(c => !existingNames.has(c.nombre.toLowerCase().trim())).map(c => ({
      ...c,
      rating: c.id.includes('foam') ? 4.9 : 4.8
    }));
    let merged = [...formattedDb, ...complementary];

    // Filtro por categoría
    if (productCategoryFilter !== 'TODOS') {
      merged = merged.filter(p => (p.categoria?.nombre || '').toUpperCase() === productCategoryFilter.toUpperCase());
    }

    // Filtro por búsqueda de texto
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase().trim();
      merged = merged.filter(p => 
        p.nombre.toLowerCase().includes(q) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
        (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(q))
      );
    }

    return merged;
  }, [dbProducts, productCategoryFilter, productSearchQuery]);

  const handleCopyPromo = (code: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopiedPromoCode(code);
      setTimeout(() => setCopiedPromoCode(null), 2500);
    }
  };

  const handleApplyPromoToOrder = (promo: any) => {
    const code = promo.codigo || promo.id;
    setForm(prev => ({
      ...prev,
      notas: prev.notas ? `${prev.notas} | Cupón aplicado: ${code}` : `Cupón aplicado: ${code}`
    }));
    setShowPickupModal(true);
  };

  const handleBuyProductWhatsApp = (prod: any) => {
    const phone = formatWhatsAppPhone(whatsappNum || '593968118444');
    const msg = encodeURIComponent(`¡Hola ${nombreNegocio}! 👋 Me interesa comprar el producto:\n\n🛍️ *${prod.nombre}*\n💰 Precio: $${Number(prod.precio).toFixed(2)} USD\n\n¿Tienen disponibilidad y cómo coordinamos el retiro o envío?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleAddProductToOrder = (prod: any) => {
    setForm(prev => ({
      ...prev,
      notas: prev.notas ? `${prev.notas} | + Incluir producto de tienda: ${prod.nombre} ($${Number(prod.precio).toFixed(2)})` : `+ Incluir producto de tienda: ${prod.nombre} ($${Number(prod.precio).toFixed(2)})`
    }));
    setShowPickupModal(true);
  };

  const getFormattedRetiroDate = () => {
    const today = new Date();
    let targetDate = new Date(today);

    if (selectedDayOption === 'MANANA') {
      targetDate.setDate(today.getDate() + 1);
    } else if (selectedDayOption === 'PASADO') {
      targetDate.setDate(today.getDate() + 2);
    }

    const dayName = targetDate.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    const slotObj = TIME_SLOTS.find(s => s.id === selectedSlot) || TIME_SLOTS[2];

    const prefix = selectedDayOption === 'HOY' ? 'Hoy' : selectedDayOption === 'MANANA' ? 'Mañana' : 'Pasado mañana';
    return `${prefix} (${dayName}) entre ${slotObj.label}`;
  };

  const handleConfirmLocationOnMap = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const mainAddress = data.display_name.split(',').slice(0, 3).join(',');
          setForm(prev => ({ ...prev, direccionCliente: mainAddress }));
        }
      }
    } catch (e) {
      console.error('Error reverse geocoding:', e);
    }
  };

  const handlePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreCliente || !form.telefonoCliente || !form.direccionCliente || isOutsideCoverage) return;

    setSubmitting(true);
    try {
      const fechaHoraCalculada = getFormattedRetiroDate();

      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: negocio?.id || 'sneaker-wash-id',
          nombreCliente: form.nombreCliente,
          telefonoCliente: form.telefonoCliente,
          direccionCliente: form.direccionCliente,
          referenciaCliente: form.referenciaCliente,
          cantidadPares: form.cantidadPares,
          notas: form.notas,
          modo: 'DOMICILIO',
          fechaHoraRetiro: fechaHoraCalculada,
          latitud: coords.lat,
          longitud: coords.lng
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessOrder(data);
        setShowPickupModal(false);
      }
    } catch (e) {
      console.error('Error creando orden:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // isMounted solo se usa para componentes que requieren el DOM (mapas, etc.)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-purple-500 selection:text-white pb-24">
      <DynamicFavicon negocio={negocio} defaultTitle="BubbleWash | Lavado de Zapatos" defaultIcon="/images/bubblewash/hero_sneakers.jpg" />



      {/* 🔮 TOP HEADER UNIFICADO (Platform Clean) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={nombreNegocio} className="h-10 w-auto max-w-[150px] object-contain rounded-xl" />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
              <span className="font-black text-xl italic tracking-tighter">{nombreNegocio.charAt(0)}</span>
            </div>
          )}
          <span className="text-xl font-black text-slate-900 tracking-tight">
            {nombreNegocio}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Carrito de Compras (E-Commerce Store) */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative px-3.5 py-2.5 rounded-xl font-black text-xs text-purple-950 bg-purple-100/80 hover:bg-purple-200/80 border border-purple-200 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-purple-700" />
            <span className="hidden sm:inline font-extrabold text-purple-900">Carrito</span>
            {totalItemsCount > 0 && (
              <span className="size-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                {totalItemsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowPickupModal(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            Solicitar al local
          </button>
        </div>
      </div>

      {/* 🧭 BARRA DE NAVEGACIÓN RÁPIDA POR SECCIONES (Pills / Chips) */}
      <div className="sticky top-2 z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 no-scrollbar">
          <a
            href="#servicios"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            <Footprints size={14} className="text-purple-600" />
            Servicios
          </a>
          <a
            href="#promociones"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            <Flame size={14} className="text-pink-500" />
            Promociones
            <span className="px-1.5 py-0.2 bg-pink-100 text-pink-700 text-[10px] font-black rounded-full">Top</span>
          </a>
          <a
            href="#productos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            <ShoppingBag size={14} className="text-indigo-600" />
            Tienda
          </a>
          <a
            href="#como-funciona"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 transition-colors whitespace-nowrap"
          >
            <Clock size={14} className="text-emerald-600" />
            Cómo funciona
          </a>
        </div>
      </div>

      {/* 🚀 HERO SECTION */}
      <section id="inicio" className="pt-8 pb-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Tus zapatos <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                  como nuevos.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl mx-auto lg:mx-0">
                Lavamos, desinfectamos y restauramos tus zapatos con procesos profesionales.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => setShowInStoreModal(true)}
                className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Store size={18} />
                Llevar al local
              </button>

              <button
                onClick={() => setShowPickupModal(true)}
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-black text-sm rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                Solicitar retiro a domicilio
              </button>
            </div>

            {/* Features Row */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Entrega rápida</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Atención por WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Fotos antes y después</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Cuidado profesional</span>
              </div>
            </div>
          </div>

          {/* Right Image Column — Carrusel de Banner Hero */}
          <div className="lg:col-span-6 relative order-1 lg:order-2">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/20 to-indigo-300/20 rounded-full blur-3xl -z-10 transform scale-90" />
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white h-[380px] sm:h-[450px] bg-slate-100">
              {bannerImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    idx === heroSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img 
                    src={imgUrl} 
                    alt={`${nombreNegocio} Banner ${idx + 1}`} 
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}

              {/* Indicadores de diapositivas (dots) */}
              {bannerImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                  {bannerImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHeroSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === heroSlideIndex ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Ver foto ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 📍 SECTION 2: ¿CÓMO FUNCIONA? / PÁGINAS PERSONALIZADAS DINÁMICAS DESDE ADMIN */}
      {(() => {
        const comoFuncionaPage = paginas.find((p: any) => {
          const s = (p.slug || '').toLowerCase();
          const t = (p.title || '').toLowerCase().replace(/<[^>]*>?/gm, '');
          return s === 'como-funciona' || t.includes('funciona');
        });
        if (comoFuncionaPage && comoFuncionaPage.contentHtml) {
          return (
            <section className="py-16 bg-slate-50 border-y border-slate-200/80">
              <div 
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 custom-page-content"
                dangerouslySetInnerHTML={{ __html: cleanHtmlContent(comoFuncionaPage.contentHtml) }}
              />
            </section>
          );
        }
        return (
          <section className="py-16 bg-slate-50 border-y border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">¿Cómo funciona?</h2>
                <div className="w-12 h-1 bg-purple-600 mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Card 1: Entrega en el local */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center shadow-xs">
                  <img 
                    src="/images/bubblewash/store_front.jpg" 
                    alt="Local BubbleWash" 
                    className="w-full sm:w-1/2 h-56 object-cover rounded-2xl border border-slate-200 shadow-sm"
                  />
                  <div className="space-y-4 w-full sm:w-1/2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <Store size={18} />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Entrega en el local</h3>
                    </div>

                    <ol className="space-y-2 text-xs font-semibold text-slate-700">
                      {[
                        'Traes tus zapatos.',
                        'Los inspeccionamos.',
                        'Tomamos fotografías.',
                        'Creamos tu orden.',
                        'Indicamos fecha de entrega.',
                        'Recibes WhatsApp cuando estén listos.'
                      ].map((step, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Card 2: Retiro a domicilio */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center shadow-xs">
                  <div className="space-y-3 w-full sm:w-1/2 order-2 sm:order-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <Truck size={18} />
                      </div>
                      <h3 className="text-base font-black text-slate-900">Retiro a domicilio</h3>
                    </div>

                    <ol className="space-y-1.5 text-xs font-semibold text-slate-700">
                      {[
                        'Solicitas retiro.',
                        'Elegimos horario.',
                        'Recogemos tus zapatos.',
                        'Los inspeccionamos.',
                        'Confirmamos el precio.',
                        'Los lavamos.',
                        'Te notificamos.',
                        'Te los entregamos.'
                      ].map((step, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <img 
                    src="/images/bubblewash/delivery_driver.jpg" 
                    alt="Repartidor BubbleWash" 
                    className="w-full sm:w-1/2 h-56 object-cover rounded-2xl border border-slate-200 shadow-sm order-1 sm:order-2"
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 🏷️ SECTION 3: NUESTROS SERVICIOS */}
      <section id="servicios" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Nuestros servicios</h2>
          <div className="w-12 h-1 bg-purple-600 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayServices.map((srv: any) => (
            <div key={srv.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <img 
                  src={srv.imagen} 
                  alt={srv.nombre}
                  className="w-full h-28 object-cover rounded-xl border border-slate-100"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{srv.nombre}</h3>
                  <div className="mt-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Desde</span>
                    <span className="text-lg font-black text-slate-900">${srv.precio}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">{srv.descripcion}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedServiceDetail(srv)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Ver detalle
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
          <Info size={14} className="text-purple-600" />
          El precio final puede variar según el estado del calzado.
        </p>
      </section>

      {/* ── 3. SECCIÓN DE PROMOCIONES & COMBOS (DISEÑO EXACTO A LA TIENDA DE LA REFERENCIA) ── */}
      {displayPromotions.length > 0 && (
        <section id="promociones" className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-700 font-extrabold text-[10px] uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-500" /> OFERTAS DE TEMPORADA
              </span>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                Promociones & Combos
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1 border border-slate-200/60">
              <Clock className="w-3 h-3 text-slate-400" /> Tiempo Limitado
            </span>
          </div>

          {/* Carrusel Horizontal de Promociones (Idéntico a la Captura) */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {displayPromotions.map((promo: any) => (
              <div
                key={promo.id}
                onClick={() => {
                  setPromoQty(1);
                  setSelectedPromotionDetail(promo);
                }}
                className="min-w-[260px] max-w-[280px] bg-white border border-slate-200/80 rounded-3xl p-3 shadow-2xs space-y-2.5 shrink-0 flex flex-col justify-between group hover:shadow-xl hover:border-cyan-200 transition-all duration-300 cursor-pointer relative overflow-hidden text-left"
              >
                <div className="space-y-2">
                  {/* Foto de la Promo con Badges Limpios */}
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-slate-100">
                    <img
                      src={promo.imagenUrl}
                      alt={promo.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-xl bg-slate-950/85 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-xs">
                      {promo.badge || 'PROMO'}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-white/90 text-slate-700 font-bold text-[9px] backdrop-blur-md border border-slate-200/60 shadow-2xs">
                      ⏱️ 12h restantes
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight line-clamp-1 group-hover:text-cyan-600 transition-colors">
                      {promo.titulo}
                    </h4>
                    <p className="text-slate-500 text-[10px] font-medium leading-snug line-clamp-2 mt-0.5">
                      {promo.descripcion}
                    </p>
                  </div>
                </div>

                {/* Micro Barra de Disponibilidad (Idéntica a la Captura) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="text-cyan-600">⚡ {promo.disponibilidadTexto || 'Quedan pocas unidades'}</span>
                    <span className="text-slate-400">{promo.porcentajeReservado || 85}% reservado</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${promo.porcentajeReservado || 85}%` }}
                    />
                  </div>
                </div>

                {/* Precios & Botón "PEDIR PROMO" */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-sm sm:text-base font-black text-slate-900 block leading-tight">
                      ${Number(promo.precioPromo || promo.valor || 19.99).toFixed(2)}
                    </span>
                    {promo.precioAnterior && (
                      <span className="text-[10px] text-slate-400 line-through font-bold">
                        ${Number(promo.precioAnterior).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPromoQty(1);
                      setSelectedPromotionDetail(promo);
                    }}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <ShoppingBag className="w-3 h-3 text-cyan-400" />
                    <span>PEDIR PROMO</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. BUSCADOR & BOTÓN FILTRAR & CATEGORÍAS (EXACTO A LA CAPTURA) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 space-y-2">
        {/* Buscador + Botón Filtrar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              placeholder="Buscar por producto, descripción o SKU..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100/80 border border-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-300 shadow-2xs transition-all font-medium"
            />
            {productSearchQuery && (
              <button
                type="button"
                onClick={() => setProductSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setProductCategoryFilter('TODOS');
              setProductSearchQuery('');
            }}
            className="px-3.5 py-2.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-extrabold text-xs rounded-2xl border border-cyan-100 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
            <span>Filtrar</span>
          </button>
        </div>

        {/* Categorías Pills Horizontal Scroll con Iconos y Contadores */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setProductCategoryFilter('TODOS')}
            className={`px-3.5 py-2 rounded-2xl font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
              productCategoryFilter === 'TODOS'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Todos ({displayProducts.length})</span>
          </button>

          {[
            { id: 'LIMPIEZA', nombre: 'Limpieza', icon: Sparkles },
            { id: 'PROTECCIÓN', nombre: 'Protección', icon: ShieldCheck },
            { id: 'ACCESORIOS', nombre: 'Accesorios', icon: Package },
            { id: 'ESTILO', nombre: 'Estilo & Sneakers', icon: Footprints }
          ].map((cat) => {
            const isSelected = productCategoryFilter.toUpperCase() === cat.id.toUpperCase();
            const count = displayProducts.filter(p => (p.categoria?.nombre || '').toUpperCase() === cat.id.toUpperCase()).length;
            const CatIcon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setProductCategoryFilter(isSelected ? 'TODOS' : cat.id)}
                className={`px-3.5 py-2 rounded-2xl font-extrabold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'
                }`}
              >
                <CatIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{cat.nombre} {count > 0 ? `(${count})` : ''}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 5. SECCIÓN PRODUCTOS DESTACADOS (TARJETAS EXACTAS A LA CAPTURA) ── */}
      <section id="productos" className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 mb-16">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 tracking-tight">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>Productos destacados</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setProductCategoryFilter('TODOS');
              setProductSearchQuery('');
            }}
            className="text-[11px] font-extrabold text-cyan-600 hover:text-cyan-700 cursor-pointer"
          >
            Ver todo
          </button>
        </div>

        {displayProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs max-w-md mx-auto my-8">
            <span className="text-5xl block mb-3">🔎</span>
            <h3 className="font-extrabold text-slate-900 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Intenta con otra palabra clave o limpia el filtro de categorías.
            </p>
            <button
              type="button"
              onClick={() => {
                setProductSearchQuery('');
                setProductCategoryFilter('TODOS');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200 cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {displayProducts.map((prod: any) => {
              const inCartQty = getItemQuantity(prod.id);
              const isFav = !!favorites[prod.id];
              const isOutOfStock = prod.stock !== undefined && prod.stock <= 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductDetail(prod)}
                  className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer text-left shadow-2xs"
                >
                  {/* Imagen del Producto (Relación de Aspecto 4/5 Exacta a la Captura) */}
                  <div className="relative w-full aspect-[4/5] bg-slate-100 overflow-hidden flex items-center justify-center p-0">
                    <img
                      src={prod.imagenUrl}
                      alt={prod.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Badge Superior Izquierda: NUEVO / AGOTADO */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
                      {isOutOfStock ? (
                        <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-rose-600 text-white shadow-xs uppercase tracking-wider">
                          Agotado
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-slate-950 text-white shadow-xs uppercase tracking-wider">
                          NUEVO
                        </span>
                      )}
                    </div>

                    {/* Botón Favorito: Corazón Superior Derecha */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(prod.id, e)}
                      className="absolute top-3 right-3 z-20 size-8 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                    </button>

                    {/* Badge Flotante Inferior: "1 en carrito" (Idéntico a la Captura) */}
                    {inCartQty > 0 && (
                      <span className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-md bg-cyan-500 animate-pulse">
                        {inCartQty} en carrito
                      </span>
                    )}
                  </div>

                  {/* Info del Producto: Nombre, Precio & Rating */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-1 leading-snug group-hover:text-cyan-600 transition-colors">
                        {prod.nombre}
                      </h3>
                    </div>

                    {/* Precio & Rating */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          ${Number(prod.precio || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{prod.rating || '4.8'}</span>
                      </div>
                    </div>

                    {/* Botón Añadir al Carrito de la Tienda */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart({
                          id: prod.id,
                          nombre: prod.nombre,
                          precio: Number(prod.precio || 0),
                          imagenUrl: prod.imagenUrl,
                          descripcion: prod.descripcion,
                          categoriaId: prod.categoria?.id || prod.categoriaId
                        }, 1);
                        setIsCartOpen(true);
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <ShoppingBag size={13} className="text-cyan-400" />
                      Agregar al carrito
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 🌟 SECTION 4: ANTES Y DESPUÉS & ELEGIRNOS & RESEÑAS (DINÁMICO DESDE PÁGINAS DEL ADMIN Y RATINGS) */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {(() => {
            const featuresPage = paginas.find((p: any) => {
              const s = (p.slug || '').toLowerCase();
              const t = (p.title || '').toLowerCase().replace(/<[^>]*>?/gm, '');
              return s === 'por-que-elegirnos' || s === 'por-que-elegirnos-y-resultados' || t.includes('elegirnos') || t.includes('resultados');
            });

            if (featuresPage && featuresPage.contentHtml) {
              return (
                <div 
                  className="w-full custom-features-content"
                  dangerouslySetInnerHTML={{ __html: cleanHtmlContent(featuresPage.contentHtml) }}
                />
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Col 1: Antes y Después */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-base font-black text-slate-900">Antes y después</h3>
                    <div className="w-10 h-1 bg-purple-600 mt-1 rounded-full mx-auto lg:mx-0" />
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-4 space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img 
                        src="/images/bubblewash/before_after.jpg" 
                        alt="Antes y después de lavado" 
                        className="w-full h-52 object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <Footprints size={14} className="text-purple-600" /> Lavado Completo
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock size={14} /> Tiempo: 2 días
                      </span>
                    </div>
                  </div>
                </div>

                {/* Col 2: ¿Por qué elegirnos? */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-base font-black text-slate-900">¿Por qué elegirnos?</h3>
                    <div className="w-10 h-1 bg-purple-600 mt-1 rounded-full mx-auto lg:mx-0" />
                  </div>

                  <ul className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 text-xs font-bold text-slate-700">
                    {[
                      { icon: ShieldCheck, text: 'Productos profesionales' },
                      { icon: Footprints, text: 'Cuidado de materiales delicados' },
                      { icon: Camera, text: 'Fotos del estado del calzado' },
                      { icon: MessageSquare, text: 'Seguimiento por WhatsApp' },
                      { icon: Truck, text: 'Entrega puntual' },
                      { icon: UserCheck, text: 'Personal capacitado' }
                    ].map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <IconComp size={16} />
                          </div>
                          <span>{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Col 3: Lo que dicen nuestros clientes */}
                <div className="space-y-4">
                  <div className="text-center lg:text-left">
                    <h3 className="text-base font-black text-slate-900">Lo que dicen nuestros clientes</h3>
                    <div className="w-10 h-1 bg-purple-600 mt-1 rounded-full mx-auto lg:mx-0" />
                  </div>

                  <div className="space-y-3">
                    {(reviews && reviews.length > 0 ? reviews : [
                      { comment: 'Mis zapatillas quedaron increíbles, como nuevas. ¡Excelente atención!', author: 'Andrés G.', stars: 5 },
                      { comment: 'Muy profesionales y cumplidos con la entrega.', author: 'Mariana P.', stars: 5 },
                      { comment: 'El servicio de retiro a domicilio es súper cómodo.', author: 'Carlos R.', stars: 5 }
                    ]).slice(0, 4).map((rev: any, idx: number) => (
                      <div key={rev.id || idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex text-amber-400 gap-0.5">
                          {[...Array(rev.stars || 5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                        </div>
                        <p className="text-slate-600 italic font-medium">"{rev.comment || rev.text}"</p>
                        <div className="flex items-center justify-between mt-1">
                          {rev.servicio && (
                            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                              {rev.servicio}
                            </span>
                          )}
                          <span className="font-black text-slate-900 block text-right ml-auto">— {rev.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 📄 OTRAS PÁGINAS PERSONALIZADAS CREADAS DESDE ADMIN */}
      {paginas && paginas.length > 0 && (
        <div className="space-y-12">
          {paginas
            .filter((p: any) => p.slug !== 'como-funciona' && p.slug !== 'por-que-elegirnos' && p.slug !== 'por-que-elegirnos-y-resultados')
            .map((page: any) => (
              <section key={page.id} className="py-16 bg-slate-50 border-y border-slate-200/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                  {page.title && (
                    <div className="text-center space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{page.title}</h2>
                      <div className="w-12 h-1 bg-purple-600 mx-auto rounded-full" />
                    </div>
                  )}

                  {page.featuredImage && (
                    <div className="max-w-3xl mx-auto overflow-hidden rounded-3xl border border-slate-200 shadow-md">
                      <img src={page.featuredImage} alt={page.title} className="w-full h-64 object-cover" />
                    </div>
                  )}

                  <div 
                    className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-purple-600 custom-page-content"
                    dangerouslySetInnerHTML={{ __html: cleanHtmlContent(page.contentHtml) }}
                  />

                  {page.buttonText && page.buttonUrl && (
                    <div className="text-center pt-4">
                      <a 
                        href={page.buttonUrl} 
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95"
                      >
                        {page.buttonText}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* 🗺️ SECTION 5: NUESTRA COBERTURA & FAQS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cobertura Interactiva con Polígono en Mapa */}
          <CoverageMapPublic
            negocioId={negocio?.id}
            onCheckLocation={() => setShowPickupModal(true)}
          />

          {/* FAQs */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h3 className="text-xl font-black text-slate-900 mb-4">Preguntas frecuentes</h3>

            <div className="space-y-2">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-4 text-left text-xs font-black text-slate-900 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp size={16} className="text-purple-600" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {openFaq === idx && (
                    <div className="p-4 text-xs text-slate-600 font-medium bg-white border-t border-slate-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 💜 PURPLE FOOTER CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-6 text-center md:text-left max-w-xl">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Devuélvele la vida a tus zapatos
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => setShowPickupModal(true)}
                className="px-6 py-3.5 bg-white text-purple-900 font-black text-xs rounded-xl shadow-lg hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck size={16} />
                Solicitar retiro a domicilio
              </button>
              <button
                onClick={() => setShowInStoreModal(true)}
                className="px-6 py-3.5 bg-purple-800/80 border border-purple-400/40 text-white font-black text-xs rounded-xl hover:bg-purple-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Store size={16} />
                Llevar al local
              </button>
            </div>
          </div>

          <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0">
            <img src="/images/bubblewash/hero_sneakers.jpg" alt="Zapatillas" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* 🦶 FOOTER */}
      <footer className="bg-white border-t border-slate-200 text-xs text-slate-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">B</div>
              <span className="font-black text-slate-900 text-base">{nombreNegocio}</span>
            </div>
            <p className="text-slate-500 font-medium">Expertos en limpieza profesional de zapatos.</p>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider mb-3">Contáctanos</h4>
            <ul className="space-y-1.5 font-medium">
              <li>💬 WhatsApp: {whatsappNum}</li>
              {direccion && <li>📍 {direccion}</li>}
              <li>⏰ Atención: {horarioApertura} - {horarioCierre}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider mb-3">Enlaces</h4>
            <ul className="space-y-1.5 font-medium">
              <li><a href="#servicios" className="hover:text-purple-600">Servicios</a></li>
              <li><a href="#como-funciona" className="hover:text-purple-600">¿Cómo funciona?</a></li>
              <li><a href="#nosotros" className="hover:text-purple-600">Nosotros</a></li>
              <li><a href="#contacto" className="hover:text-purple-600">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider mb-3">Pagos Seguros</h4>
            <div className="flex items-center gap-2 font-black text-slate-800">
              <span className="px-2 py-1 bg-slate-100 rounded border">VISA</span>
              <span className="px-2 py-1 bg-slate-100 rounded border">Mastercard</span>
              <span className="px-2 py-1 bg-slate-100 rounded border text-cyan-600">Mercado Pago</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 💬 FLOATING WHATSAPP BUTTON */}
      <a
        href={`https://wa.me/${whatsappNum}?text=Hola%20${encodeURIComponent(nombreNegocio)},%20quisiera%20solicitar%20un%20servicio.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
      >
        <Phone size={24} className="fill-white" />
      </a>

      {/* 🏬 MODAL INFORMATIVO: LLEVAR AL LOCAL */}
      {showInStoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowInStoreModal(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black text-xl shrink-0">
                <Store size={26} />
              </div>
              <div>
                <span className="text-xs font-black text-purple-600 uppercase tracking-widest block">{nombreNegocio}</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Trae tus zapatos directamente al local</h3>
              </div>
            </div>

            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100/80 text-xs font-medium text-purple-900 space-y-1">
              <p className="font-bold">No necesitas realizar ninguna reserva.</p>
              <p className="text-purple-700/90">
                Nuestro personal recibirá tus zapatos, realizará la inspección, tomará fotografías y creará tu orden de servicio.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-xs font-medium text-slate-700">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 block">Dirección</span>
                  <span>{direccion}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-2.5">
                <Clock size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 block">Horarios de Atención</span>
                  <span>Lunes a Sábado: {horarioApertura} - {horarioCierre}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-2.5">
                <Phone size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 block">Teléfono / WhatsApp</span>
                  <span>{whatsappNum}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-purple-600/25 transition-all text-center flex items-center justify-center gap-2"
              >
                <MapIcon size={16} />
                Cómo llegar
              </a>
              <a
                href={`https://wa.me/${formatWhatsAppPhone(whatsappNum)}?text=${encodeURIComponent(`Hola ${nombreNegocio}, quisiera consultar para llevar mis zapatos al local.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-center flex items-center justify-center gap-2"
              >
                <Phone size={16} />
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 📦 MODAL DE SOLICITUD DE RETIRO / SERVICIO MULTI-ARTÍCULOS (WIZARD 4 PASOS) */}
      <UniversalServiceRequestModal
        isOpen={showPickupModal}
        onClose={() => {
          setShowPickupModal(false);
          setForm(prev => ({ ...prev, notas: '' }));
        }}
        negocio={negocio}
        initialServiceName={form.notas?.startsWith('Servicio solicitado:') ? form.notas.replace('Servicio solicitado: ', '').trim() : undefined}
      />

      {/* 🌟 MODAL DETALLE DE SERVICIO */}
      {selectedServiceDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 border border-purple-100">
            <button
              onClick={() => setSelectedServiceDetail(null)}
              className="absolute top-4 right-4 size-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition-all z-10"
            >
              ✕
            </button>

            {selectedServiceDetail.imagen && (
              <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img 
                  src={selectedServiceDetail.imagen} 
                  alt={selectedServiceDetail.nombre}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-3 right-3 bg-purple-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-md">
                  ${selectedServiceDetail.precio}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block">Detalle del Servicio</span>
              <h3 className="text-xl font-black text-slate-900">{selectedServiceDetail.nombre}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedServiceDetail.descripcion || 'Servicio profesional especializado de lavado y cuidado de calzado.'}
              </p>
            </div>

            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
              <p className="text-[11px] font-bold text-purple-950 uppercase flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-600" /> ¿Qué incluye este servicio?
              </p>
              <ul className="text-xs text-slate-700 space-y-1 font-medium pl-1">
                <li>• Lavado artesanal exterior e interior</li>
                <li>• Desinfección antibacteriana y desodorización</li>
                <li>• Limpieza de pasadores y plantillas</li>
                {selectedServiceDetail.duracion && <li>• Tiempo estimado: {selectedServiceDetail.duracion} min / 24h</li>}
              </ul>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedServiceDetail(null)}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl cursor-pointer transition-all"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const srvName = selectedServiceDetail.nombre;
                  setSelectedServiceDetail(null);
                  setForm(prev => ({ ...prev, notas: `Servicio solicitado: ${srvName}` }));
                  setShowPickupModal(true);
                }}
                className="w-2/3 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/20 cursor-pointer transition-all"
              >
                Solicitar Servicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 MODAL CONSULTAR MIS ÓRDENES & PERFIL (ESTILO APP CON OTP) */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-purple-100">
            <button
              onClick={() => setShowLookupModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Footprints size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Mis Órdenes & Estado</h3>
                <p className="text-xs text-slate-500">Consulta el avance de tu calzado sin contraseñas</p>
              </div>
            </div>

            {lookupStep === 'PHONE' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">Ingresa tu número de WhatsApp para consultar tus servicios activos o historial:</p>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={lookupPhone}
                    onChange={e => setLookupPhone(e.target.value)}
                    placeholder="Ej: 0998887777"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!lookupPhone.trim()) return;
                    setSearchingLookup(true);
                    try {
                      const res = await fetch(`/api/shoe-care/orders?phone=${encodeURIComponent(lookupPhone.trim())}&businessId=${negocio?.id || 'sneaker-wash-id'}`);
                      if (res.ok) {
                        const data = await res.json();
                        setCustomerOrders(Array.isArray(data) ? data : []);
                        setLookupStep('ORDERS');
                      }
                    } catch (e) {
                      console.error('Error buscando ordenes:', e);
                    } finally {
                      setSearchingLookup(false);
                    }
                  }}
                  disabled={searchingLookup}
                  className="w-full py-3 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {searchingLookup ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Consultar mis Órdenes
                </button>
              </div>
            )}

            {lookupStep === 'ORDERS' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {customerOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Footprints size={40} className="mx-auto opacity-30 text-purple-600" />
                    <p className="font-bold text-sm text-slate-700">No encontramos órdenes con este número</p>
                    <p className="text-xs text-slate-500">Si enviaste tu pedido recién, asegúrate de escribir el número correctamente.</p>
                  </div>
                ) : (
                  customerOrders.map(ord => (
                    <div key={ord.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-purple-600">Orden #{ord.numeroPedido}</span>
                          <p className="text-xs font-bold text-slate-900">{ord.extraInfo?.servicioNombre || 'Lavado Completo'}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[10px] font-black rounded-lg">
                          {ord.estado.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 font-mono">
                        <div>Fecha: <strong className="text-slate-800">{new Date(ord.createdAt).toLocaleDateString('es-PE')}</strong></div>
                        <div>Total: <strong className="text-purple-700 font-bold">${ord.total?.toFixed(2)}</strong></div>
                      </div>

                      {/* PROPUESTA DEL NEGOCIO / CONFIRMACIÓN DE PRECIO */}
                      {(ord.estado === 'CAMBIOS_SOLICITADOS' || ord.estado === 'PRODUCTOS_CONFIRMADOS') && (
                        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2.5 animate-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-2 text-purple-900">
                            <Sparkles size={16} className="text-purple-600 shrink-0" />
                            <span className="text-xs font-black uppercase">Propuesta y Confirmación del Negocio</span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium leading-normal">
                            El negocio ha inspeccionado tus artículos y ha determinado el precio final de <strong className="text-purple-700 font-mono text-sm">${ord.total?.toFixed(2)}</strong>.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/shoe-care/orders/${ord.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ estado: 'ACEPTADO' })
                                });
                                const res = await fetch(`/api/shoe-care/orders?phone=${encodeURIComponent(lookupPhone.trim())}&businessId=${negocio?.id || 'sneaker-wash-id'}`);
                                if (res.ok) setCustomerOrders(await res.json());
                              }}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer text-center"
                            >
                              ✓ Aceptar y Procesar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/shoe-care/orders/${ord.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ estado: 'CANCELADO' })
                                });
                                const res = await fetch(`/api/shoe-care/orders?phone=${encodeURIComponent(lookupPhone.trim())}&businessId=${negocio?.id || 'sneaker-wash-id'}`);
                                if (res.ok) setCustomerOrders(await res.json());
                              }}
                              className="py-2 px-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tracker Visual de Progreso */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Recibido</span>
                          <span>En Proceso</span>
                          <span>Listo / Entregado</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="bg-purple-600 transition-all duration-500"
                            style={{
                              width:
                                ord.estado === 'ENTREGADO'
                                  ? '100%'
                                  : ord.estado === 'LISTO'
                                  ? '85%'
                                  : ord.estado === 'RECIBIDO'
                                  ? '30%'
                                  : '60%',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={() => setLookupStep('PHONE')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Probar con otro número
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAP MODAL */}
      <MapSelectionModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={coords.lat}
        initialLng={coords.lng}
        onConfirmLocation={handleConfirmLocationOnMap}
      />

      {/* 🛍️ MODAL INTERACTIVO DETALLE DE PRODUCTO */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="relative h-64 sm:h-72 w-full bg-slate-100 shrink-0">
              <img
                src={selectedProductDetail.imagenUrl || selectedProductDetail.imagen || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80'}
                alt={selectedProductDetail.nombre}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white text-slate-700 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-600 text-white shadow-md">
                  {selectedProductDetail.categoria?.nombre || 'Sneaker Care'}
                </span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  {selectedProductDetail.nombre}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-purple-600 font-mono">
                    ${Number(selectedProductDetail.precio).toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">USD</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedProductDetail.descripcion}
              </p>

              {selectedProductDetail.caracteristicas && selectedProductDetail.caracteristicas.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Beneficios clave</span>
                  <ul className="space-y-1.5">
                    {selectedProductDetail.caracteristicas.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const prod = selectedProductDetail;
                    setSelectedProductDetail(null);
                    addToCart({
                      id: prod.id,
                      nombre: prod.nombre,
                      precio: Number(prod.precio || 0),
                      imagenUrl: prod.imagenUrl,
                      descripcion: prod.descripcion,
                      categoriaId: prod.categoria?.id || prod.categoriaId
                    }, 1);
                    setIsCartOpen(true);
                  }}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                >
                  <ShoppingBag size={18} className="text-cyan-400" />
                  <span>Agregar al carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ MODAL INTERACTIVO DETALLE DE PROMOCIÓN / COMBO */}
      {selectedPromotionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Foto de la Promo con Badges */}
            <div className="relative h-60 sm:h-72 w-full bg-slate-100 shrink-0">
              <img
                src={selectedPromotionDetail.imagenUrl}
                alt={selectedPromotionDetail.titulo}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedPromotionDetail(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white text-slate-700 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer z-10"
              >
                <X size={18} />
              </button>

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-950/85 text-white shadow-md backdrop-blur-md">
                  {selectedPromotionDetail.badge || 'COMBO 2x1'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-slate-800 shadow-sm border border-slate-200/60 backdrop-blur-md">
                  ⏱️ 12h restantes
                </span>
              </div>

              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-600 text-white shadow-md flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Promoción Especial
                </span>
              </div>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {selectedPromotionDetail.titulo}
                </h3>

                <div className="flex items-baseline gap-3 mt-2 flex-wrap">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    ${Number(selectedPromotionDetail.precioPromo || selectedPromotionDetail.valor || 19.99).toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">USD</span>

                  {selectedPromotionDetail.precioAnterior && (
                    <span className="text-sm font-bold text-slate-400 line-through">
                      ${Number(selectedPromotionDetail.precioAnterior).toFixed(2)}
                    </span>
                  )}

                  {selectedPromotionDetail.precioAnterior && Number(selectedPromotionDetail.precioAnterior) > Number(selectedPromotionDetail.precioPromo || selectedPromotionDetail.valor || 0) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Ahorras ${(Number(selectedPromotionDetail.precioAnterior) - Number(selectedPromotionDetail.precioPromo || selectedPromotionDetail.valor)).toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Disponibilidad / Urgencia */}
              <div className="bg-cyan-50/60 border border-cyan-100 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-cyan-700 flex items-center gap-1">
                    <Flame size={14} className="text-cyan-600" />
                    {selectedPromotionDetail.disponibilidadTexto || 'Quedan pocas unidades disponibles'}
                  </span>
                  <span className="text-slate-500">{selectedPromotionDetail.porcentajeReservado || 85}% reservado</span>
                </div>
                <div className="h-2 w-full bg-cyan-200/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${selectedPromotionDetail.porcentajeReservado || 85}%` }}
                  />
                </div>
              </div>

              {/* Descripción */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {selectedPromotionDetail.descripcion}
              </p>

              {/* Contenido que incluye el combo */}
              {selectedPromotionDetail.incluye && selectedPromotionDetail.incluye.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={15} className="text-cyan-600" />
                    ¿Qué incluye este combo?
                  </span>
                  <div className="space-y-1.5">
                    {selectedPromotionDetail.incluye.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Beneficios & Garantía */}
              {selectedPromotionDetail.caracteristicas && selectedPromotionDetail.caracteristicas.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-purple-600" />
                    Beneficios & Garantía
                  </span>
                  <ul className="space-y-1">
                    {selectedPromotionDetail.caracteristicas.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check size={14} className="text-purple-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Selector de Cantidad */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Cantidad:</span>
                <div className="flex items-center gap-3 bg-slate-100 rounded-2xl p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPromoQty(Math.max(1, promoQty - 1))}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center shadow-xs transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-900 font-mono">
                    {promoQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPromoQty(promoQty + 1)}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center shadow-xs transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const promo = selectedPromotionDetail;
                    setSelectedPromotionDetail(null);
                    addToCart({
                      id: promo.id,
                      nombre: promo.titulo,
                      precio: Number(promo.precioPromo || promo.valor || 19.99),
                      imagenUrl: promo.imagenUrl,
                      descripcion: promo.descripcion,
                      categoriaId: 'promociones'
                    }, promoQty);
                    setIsCartOpen(true);
                  }}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                >
                  <ShoppingBag size={18} className="text-cyan-400" />
                  <span>
                    Agregar al Carrito • ${(Number(selectedPromotionDetail.precioPromo || selectedPromotionDetail.valor || 19.99) * promoQty).toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛒 DRAWER DE CHECKOUT Y CARRITO DE COMPRA (E-COMMERCE REAL) */}
      <CustomerCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        primaryColor="#06b6d4"
        slug={negocio?.slug || 'lavado'}
        businessName={negocio?.nombre || 'BubbleWash'}
      />

      {/* 📱 BARRA DE NAVEGACIÓN INFERIOR DE LA PLATAFORMA */}
      <PublicMobileNav
        slug={negocio?.slug || 'lavado'}
        tipoNegocio={negocio?.tipoNegocio || 'SHOE_CARE'}
        isLoyaltyEnabled={true}
      />
    </div>
  );
}
