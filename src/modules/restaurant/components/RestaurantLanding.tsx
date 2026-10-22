'use client';
/**
 * @file RestaurantLanding.tsx
 * @module modules/restaurant/components
 * @description Home de Restaurante optimizado (sin botón Enviar A, sin barra de búsqueda y navegación limpia de 4 opciones).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Bell, ShoppingBag, Heart, Plus, Minus, Truck, Percent, ShieldCheck,
  Home, Tag, ClipboardList, User, ArrowRight, Utensils, ChevronRight, X,
  Flame, Store, Navigation, Eye, PackageCheck, MapPin, Star, CreditCard,
  Settings, HelpCircle, Smartphone, Camera, CheckCircle2, MessageSquare, Compass, Key, Lock, UserCircle2
} from 'lucide-react';
import { CartProvider, useCart } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import ItemDetailModal, { DetailItem, cleanDescriptionText } from '@/components/public/ItemDetailModal';
import { isPWAInstalled, installPWA, addInstallationListener, removeInstallationListener } from '@/lib/pwa-install';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precioAnterior?: number;
  imagenUrl?: string;
  activo?: boolean;
  categoriaId?: string;
  categoria?: { id: string; nombre: string };
}

interface Category {
  id: string;
  nombre: string;
  icono?: string;
}

interface HeroSlide {
  id: string;
  title?: string | null;
  description?: string | null;
  image: string;
  price?: number | null;
  originalPrice?: number | null;
  previousPrice?: number | null;
  hasVariants?: boolean;
  priceLabel?: string | null;
  type?: string | null;
  button?: {
    enabled?: boolean;
    text?: string | null;
    actionType?: string | null;
    actionValue?: string | null;
  };
}

interface HighlightItem {
  id: string;
  title?: string | null;
  description?: string | null;
  image: string;
  price?: number | null;
  originalPrice?: number | null;
  badge?: string | null;
}

export default function RestaurantLanding({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
}: {
  negocio: any;
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: HeroSlide[]; highlights: HighlightItem[] };
}) {
  const defaultDeliveryCost = Number((negocio?.configuracion as any)?.costoEnvio) || 2.50;

  return (
    <CartProvider businessId={negocio?.id || 'demo'} defaultDeliveryCost={defaultDeliveryCost}>
      <RestaurantLandingContent
        negocio={negocio}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialHeroContent={initialHeroContent}
      />
    </CartProvider>
  );
}

function RestaurantLandingContent({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
}: {
  negocio: any;
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: HeroSlide[]; highlights: HighlightItem[] };
}) {
  const {
    totalItemsCount,
    total,
    deliveryType,
    setDeliveryType,
    customerData,
    setCustomerData,
    getItemQuantity,
    addToCart,
    decrementQuantity,
    isCartOpen,
    setIsCartOpen
  } = useCart();

  // Configuración de Paleta de Colores Dinámicos del Admin
  const config = negocio?.configuracion 
    ? (typeof negocio.configuracion === 'string' 
        ? JSON.parse(negocio.configuracion) 
        : negocio.configuracion) 
    : {};

  const cp = negocio?.colorPrimario || '#ff5500';
  const cn = negocio?.colorFondo || negocio?.colorNeutral || '#ffffff';
  const cs = negocio?.colorSecundario || '#0f172a';

  // 🎨 COLOR DE BARRA SUPERIOR (COLOR DE HEADER CONFIGURADO EN EL ADMIN)
  const headerBg = config?.colorHeader || negocio?.colorHeader || '#ffffff';

  // Helper de Luminancia para calculo de contraste automatico
  const getHexLuma = (hex: string) => {
    if (!hex) return 1;
    const c = hex.replace('#', '');
    if (c.length !== 6) return 1;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };

  const headerLuma = getHexLuma(headerBg);
  const headerText = headerLuma < 0.5 ? '#ffffff' : '#0f172a';
  const headerSubText = headerLuma < 0.5 ? '#cbd5e1' : '#475569';
  const headerBtnBg = headerLuma < 0.5 ? 'rgba(255, 255, 255, 0.15)' : '#f1f5f9';
  const headerBorder = headerLuma < 0.5 ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';

  // 🎨 COLOR DE BARRA INFERIOR (BOTTOM NAV CONFIGURADO EN EL ADMIN)
  const navBg = config?.colorBottomNav || (negocio?.colorSecundario && negocio.colorSecundario !== '#0f172a' ? negocio.colorSecundario : '#ffffff');
  const navLuma = getHexLuma(navBg);
  const navUnselectedText = navLuma < 0.5 ? '#94a3b8' : '#64748b';

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(initialHeroContent?.hero || []);
  const [highlights, setHighlights] = useState<HighlightItem[]>(initialHeroContent?.highlights || []);

  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const showCartDrawer = isCartOpen;
  const setShowCartDrawer = setIsCartOpen;
  const [showChannelModal, setShowChannelModal] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  
  // MODAL DE DETALLES DE PRODUCTO / PROMOCIÓN
  const [selectedDetailItem, setSelectedDetailItem] = useState<DetailItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [activeNavTab, setActiveNavTab] = useState<'inicio' | 'ofertas' | 'pedidos' | 'cuenta'>('inicio');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Estados e instalador de PWA y modales de cuenta
  const [isPWAInstalledState, setIsPWAInstalledState] = useState<boolean>(false);
  const [canInstallPWA, setCanInstallPWA] = useState<boolean>(false);
  const [accountActiveModal, setAccountActiveModal] = useState<string | null>(null);

  // Perfil real y cupones desde la base de datos
  const [profileData, setProfileData] = useState<any>(null);
  const [realCuponesCount, setRealCuponesCount] = useState<number>(0);

  useEffect(() => {
    if (!negocio?.slug) return;

    fetch(`/api/${negocio.slug}/perfil`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !data.error) {
          setProfileData(data);
          if (data.nombre && !customerData?.nombre) setCustomerData({ nombre: data.nombre });
          if (data.telefono && !customerData?.telefono) setCustomerData({ telefono: data.telefono });
          if (data.email && !customerData?.email) setCustomerData({ email: data.email });
          if (data.direccion && !customerData?.direccion) setCustomerData({ direccion: data.direccion });
        }
      })
      .catch(() => {});

    fetch(`/api/${negocio.slug}/mis-cupones`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setRealCuponesCount(data.length);
      })
      .catch(() => {});
  }, [negocio?.slug]);

  // Datos 100% reales derivados de la DB / sesión
  const displayName = profileData?.nombre || customerData?.nombre || (typeof window !== 'undefined' ? (localStorage.getItem('user_name') || localStorage.getItem('pinchos_client_name')) : null) || 'Cliente';
  const displayPhone = profileData?.telefono || customerData?.telefono || (typeof window !== 'undefined' ? (localStorage.getItem('user_phone') || localStorage.getItem('pinchos_client_phone')) : null) || 'Sin teléfono';
  const displayEmail = profileData?.email || customerData?.email || 'Sin correo registrado';
  const displayAddress = customerData?.direccion || profileData?.direccion || (typeof window !== 'undefined' ? (localStorage.getItem('customer_address') || localStorage.getItem('pinchos_client_address')) : null) || 'Sin dirección registrada';
  const displayReference = customerData?.referencia || profileData?.referencia || (typeof window !== 'undefined' ? localStorage.getItem('customer_reference') : null) || '';

  const realOrdersCount = profileData?.totalPedidos ?? profileData?.stats?.totalPedidos ?? 0;
  const realPointsCount = profileData?.loyalty?.puntos ?? 0;

  const userLevelTag = React.useMemo(() => {
    const totalCount = realOrdersCount + (profileData?.stats?.reservasTotales || 0);
    if (totalCount >= 10) return { label: 'Cliente VIP', icon: '👑', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (totalCount >= 3) return { label: 'Usuario frecuente', icon: '⭐', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    if (totalCount > 0) return { label: 'Cliente Activo', icon: '🌱', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    return null;
  }, [realOrdersCount, profileData]);

  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
      try {
        localStorage.removeItem('pwa_installed');
      } catch (_) {}
    }

    setIsPWAInstalledState(isPWAInstalled());
    const handlePWAChange = (avail: boolean) => {
      setCanInstallPWA(avail);
      setIsPWAInstalledState(isPWAInstalled());
    };
    addInstallationListener(handlePWAChange);
    return () => removeInstallationListener(handlePWAChange);
  }, []);

  const handleInstallPWA = async () => {
    if (canInstallPWA) {
      const res = await installPWA();
      if (res) setIsPWAInstalledState(true);
    } else {
      alert(`Para instalar la App de ${negocio?.nombre || 'nuestro restaurante'} en tu celular:\n\n📱 En Android: Abre el menú de tu navegador (...) y presiona "Instalar aplicación" o "Agregar a inicio".\n\n📱 En iPhone: Toca el icono de Compartir y selecciona "Agregar a inicio".`);
    }
  };

  // Inicialización de Mini Mapa Leaflet cuando se activa la pestaña 'cuenta'
  useEffect(() => {
    if (activeNavTab !== 'cuenta' || !miniMapRef.current) return;
    const lat = customerData?.lat || -0.180653;
    const lng = customerData?.lng || -78.467838;

    const initMiniMap = () => {
      if (typeof window === 'undefined' || !(window as any).L) return;
      const L = (window as any).L;
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
      try {
        const map = L.map(miniMapRef.current, {
          center: [lat, lng],
          zoom: 15,
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        const icon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color:${cp}; width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        L.marker([lat, lng], { icon }).addTo(map);
        miniMapInstanceRef.current = map;
      } catch (e) {}
    };

    if (!(window as any).L) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initMiniMap();
        document.head.appendChild(script);
      }
    } else {
      initMiniMap();
    }

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [activeNavTab, customerData?.lat, customerData?.lng, cp]);

  useEffect(() => {
    if (!negocio?.slug) return;

    if (initialProducts.length === 0) {
      fetch(`/api/public/${negocio.slug}/products`)
        .then(res => res.json())
        .then(data => {
          if (data.products && data.products.length > 0) setProducts(data.products);
          if (data.categories && data.categories.length > 0) setCategories(data.categories);
        })
        .catch(() => {});
    }

    if (!initialHeroContent?.hero || initialHeroContent.hero.length === 0) {
      fetch(`/api/${negocio.slug}/landing-content`)
        .then(res => res.json())
        .then(data => {
          if (data.hero && data.hero.length > 0) setHeroSlides(data.hero);
          if (data.highlights && data.highlights.length > 0) setHighlights(data.highlights);
        })
        .catch(() => {});
    }
  }, [negocio?.slug, initialProducts.length, initialHeroContent?.hero]);

  useEffect(() => {
    const handleHashAndTab = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');

      if (hash === 'ofertas' || tabParam === 'ofertas') {
        setActiveNavTab('ofertas');
      } else if (hash === 'pedidos' || tabParam === 'pedidos') {
        setActiveNavTab('pedidos');
      } else if (hash === 'cuenta' || hash === 'perfil' || tabParam === 'cuenta' || tabParam === 'perfil') {
        setActiveNavTab('cuenta');
      } else if (hash === 'inicio' || tabParam === 'inicio') {
        setActiveNavTab('inicio');
      }
    };

    handleHashAndTab();

    const handleCustomTab = (e: any) => {
      if (e.detail) {
        if (e.detail === 'ofertas') setActiveNavTab('ofertas');
        else if (e.detail === 'pedidos') setActiveNavTab('pedidos');
        else if (e.detail === 'cuenta' || e.detail === 'perfil') setActiveNavTab('cuenta');
        else if (e.detail === 'inicio') setActiveNavTab('inicio');
      }
    };

    window.addEventListener('hashchange', handleHashAndTab);
    window.addEventListener('citiox_change_tab', handleCustomTab);
    return () => {
      window.removeEventListener('hashchange', handleHashAndTab);
      window.removeEventListener('citiox_change_tab', handleCustomTab);
    };
  }, []);

  // Rotación del Carrusel Hero cada 4.5s
  useEffect(() => {
    const totalSlides = heroSlides.length > 0 ? heroSlides.length : Math.min(products.length, 3);
    if (totalSlides <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(interval);
  }, [heroSlides.length, products.length]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenPromoDetail = (promo: HighlightItem) => {
    setSelectedDetailItem({
      id: promo.id,
      title: promo.title || 'Promoción Especial',
      description: cleanDescriptionText(promo.description) || 'Disfruta de esta increíble promoción gastronómica por tiempo limitado.',
      price: promo.price || 9.99,
      originalPrice: promo.originalPrice || undefined,
      badge: promo.badge || 'OFERTA',
      image: promo.image,
      category: 'Promoción Especial',
    });
    setShowDetailModal(true);
  };

  const handleOpenProductDetail = (prod: Product) => {
    setSelectedDetailItem({
      id: prod.id,
      title: prod.nombre,
      description: cleanDescriptionText(prod.descripcion) || 'Elaborado con los mejores ingredientes y la sazón de la casa.',
      price: prod.precio,
      originalPrice: prod.precioAnterior || undefined,
      badge: prod.precioAnterior && prod.precioAnterior > prod.precio ? 'OFERTA' : undefined,
      image: prod.imagenUrl,
      category: prod.categoria?.nombre || 'Menú Principal',
    });
    setShowDetailModal(true);
  };

  const handleAddToCartFromDetail = (item: DetailItem, qty: number) => {
    addToCart({
      id: item.id,
      nombre: item.title,
      precio: item.price,
      imagenUrl: item.image
    }, qty);
  };

  const filteredProducts = products.filter(p => {
    if (p.activo === false) return false;
    if (selectedCategory !== 'TODOS') {
      const matchCatId = p.categoriaId === selectedCategory;
      const matchCatName = p.categoria?.nombre?.toLowerCase() === selectedCategory.toLowerCase();
      const matchCatObjId = p.categoria?.id === selectedCategory;
      if (!matchCatId && !matchCatName && !matchCatObjId) return false;
    }
    return true;
  });

  // Datos para Hero Banner resolutivo
  const displayHeroSlides = heroSlides.length > 0 ? heroSlides : products.slice(0, 3).map(p => ({
    id: p.id,
    title: p.nombre,
    description: p.descripcion,
    image: p.imagenUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    price: p.precio,
    originalPrice: p.precioAnterior,
    previousPrice: p.precioAnterior,
    priceLabel: p.precio ? `$${Number(p.precio).toFixed(2)}` : null,
    hasVariants: false,
    button: { enabled: true, text: 'Pedir Ahora', actionType: 'PRODUCT', actionValue: p.id }
  }));

  const activeSlideIndex = displayHeroSlides.length > 0 ? currentSlideIndex % displayHeroSlides.length : 0;
  const rawSlide = displayHeroSlides[activeSlideIndex] || displayHeroSlides[0];

  const activeSlide = {
    image: rawSlide?.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    tagText: rawSlide?.title ? 'ESPECIAL DE LA CASA' : negocio?.nombre || 'RESTAURANTE',
    titleText: rawSlide?.title || negocio?.nombre || '',
    descText: rawSlide?.description || '',
    priceLabel: rawSlide?.priceLabel || (rawSlide?.price ? `$${Number(rawSlide.price).toFixed(2)}` : null),
    hasVariants: !!rawSlide?.hasVariants,
    isButtonEnabled: rawSlide?.button?.enabled ?? true,
    buttonText: rawSlide?.button?.text || 'Ver Menú',
    buttonAction: rawSlide?.button?.actionType,
    buttonValue: rawSlide?.button?.actionValue
  };

  // 1. Detectar si existe una promoción activa de Envío Gratis
  const freeShippingPromo = highlights.find(promo => {
    const titleLower = (promo.title || '').toLowerCase();
    return promo.badge === 'ENVÍO GRATIS' || titleLower.includes('envio gratis') || titleLower.includes('envío gratis');
  });

  // 2. Tarjetas de promociones gastronómicas para el carrusel horizontal (excluye tarjetas puras de envío gratis sin foto real)
  const displayPromotions = highlights.filter(promo => {
    if (freeShippingPromo && promo.id === freeShippingPromo.id) {
      const hasCustomPhoto = promo.image && !promo.image.includes('photo-1544025162-d76694265947');
      return hasCustomPhoto;
    }
    return true;
  });

  const activeFoodPromo = displayPromotions.length > 0 ? displayPromotions[0] : null;

  // 3. Variables para el Banner Superior Destacado (Prioriza Envío Gratis si existe)
  const promoBannerTitle = config?.bannerPromoTitulo ||
    (freeShippingPromo ? (freeShippingPromo.title ? `¡${freeShippingPromo.title.toUpperCase()}!` : '¡ENVÍO GRATIS EN TU PEDIDO!') : null) ||
    activeFoodPromo?.title ||
    (highlights.length > 0 ? '¡ENVÍO GRATIS Y PROMOCIONES DEL DÍA!' : null);

  const promoBannerDesc = config?.bannerPromoSubtitulo ||
    (freeShippingPromo ? (freeShippingPromo.description || 'Aplica automático en tus compras sobre el monto mínimo') : null) ||
    activeFoodPromo?.description ||
    (highlights.length > 0 ? 'Aplica automático en combos y pedidos de la casa' : null);

  const promoBannerBadge = config?.bannerPromoBadge ||
    (freeShippingPromo ? 'ENVÍO GRATIS' : null) ||
    activeFoodPromo?.badge ||
    'Automático';

  const handlePromoBannerClick = () => {
    if (activeFoodPromo) {
      handleOpenPromoDetail(activeFoodPromo);
      return;
    }
    if (freeShippingPromo) {
      handleOpenPromoDetail(freeShippingPromo);
      return;
    }
    const menuEl = document.getElementById('seccion-menu-productos');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHeroButtonClick = (slide: typeof activeSlide) => {
    if (slide.buttonAction === 'PRODUCT' && slide.buttonValue) {
      const prod = products.find(p => p.id === slide.buttonValue);
      if (prod) {
        handleOpenProductDetail(prod);
        return;
      }
    }
    const menuEl = document.getElementById('seccion-menu-productos');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ── Menú agrupado por categoría (en el orden del admin; lo que no tiene categoría va al final) ──
  const menuSections = React.useMemo(() => {
    const active = products.filter((p) => p.activo !== false);
    const byCat: { id: string; nombre: string; items: Product[] }[] = categories
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        items: active.filter((p) => p.categoriaId === c.id || p.categoria?.id === c.id),
      }))
      .filter((s) => s.items.length > 0);
    const used = new Set(byCat.flatMap((s) => s.items.map((p) => p.id)));
    const rest = active.filter((p) => !used.has(p.id));
    if (rest.length) byCat.push({ id: 'otros', nombre: byCat.length ? 'Otros' : 'Nuestro menú', items: rest });
    return byCat;
  }, [products, categories]);

  const [activeMenuSection, setActiveMenuSection] = useState<string>('');
  useEffect(() => {
    if (activeNavTab !== 'inicio' || menuSections.length < 2) return;
    const els = Array.from(document.querySelectorAll('[data-menu-section]')) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveMenuSection((visible[0].target as HTMLElement).dataset.menuSection || '');
      },
      { rootMargin: '-140px 0px -55% 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [activeNavTab, menuSections]);

  const scrollToMenuSection = (id: string) => {
    setActiveMenuSection(id);
    document.getElementById(`menu-sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Abierto / cerrado según el horario configurado ──
  const openInfo = React.useMemo(() => {
    const ap = String(negocio?.horarioApertura || '');
    const ci = String(negocio?.horarioCierre || '');
    const toMin = (t: string) => {
      const m = t.match(/^(\d{1,2}):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const a = toMin(ap), c = toMin(ci);
    if (a === null || c === null) return { open: true, label: 'Abierto' };
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const open = c > a ? cur >= a && cur < c : cur >= a || cur < c;
    return open ? { open, label: `Abierto · cierra ${ci.slice(0, 5)}` } : { open, label: `Cerrado · abre ${ap.slice(0, 5)}` };
  }, [negocio?.horarioApertura, negocio?.horarioCierre]);

  const defaultDelivery = Number(config?.costoEnvio) || 2.5;

  return (
    <div
      style={{ backgroundColor: cn, color: '#0f172a' }}
      className="min-h-screen w-full font-sans antialiased pb-28 select-none md:pt-[84px]"
    >
      {/* ── 1. ENCABEZADO MÓVIL: marca del restaurante + cómo recibir el pedido + carrito ── */}
      <div
        style={{ backgroundColor: headerBg, borderColor: headerBorder }}
        className="block md:hidden sticky top-0 z-30 px-4 py-2.5 border-b w-full"
      >
        <div className="flex items-center gap-3">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-white ring-1 ring-black/5 shrink-0" />
          ) : (
            <div style={{ backgroundColor: cp }} className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p style={{ color: headerText }} className="font-bold text-[15px] leading-tight truncate">{negocio?.nombre}</p>
            <button
              type="button"
              onClick={() => setShowChannelModal(true)}
              style={{ color: headerSubText }}
              className="text-xs font-medium flex items-center gap-1 mt-0.5"
            >
              {deliveryType === 'DOMICILIO' ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              <span className="truncate max-w-[180px]">
                {deliveryType === 'DOMICILIO'
                  ? (customerData?.direccion ? `Entregar en ${customerData.direccion}` : 'Envío a domicilio')
                  : 'Retiro en el local'}
              </span>
              <ChevronRight className="w-3 h-3 rotate-90" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            style={{ backgroundColor: headerBtnBg, color: headerText }}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            aria-label="Ver mi pedido"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemsCount > 0 && (
              <span style={{ backgroundColor: cp }} className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── CONTENEDOR PRINCIPAL ── */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 space-y-5">
        {/* ── PESTAÑA 1: INICIO ── */}
        {activeNavTab === 'inicio' && (
          <>
            {/* PORTADA */}
            <section className="relative w-full rounded-3xl overflow-hidden bg-slate-900 aspect-[16/10] sm:aspect-[21/8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={activeSlide.image}
                src={activeSlide.image}
                alt={activeSlide.titleText}
                className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              {activeSlide.priceLabel && (
                <span style={{ backgroundColor: cp }} className="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-sm font-bold shadow-lg">
                  {activeSlide.hasVariants ? 'Desde ' : ''}{activeSlide.priceLabel.replace(/^Desde\s+/i, '')}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <h2 className="text-white text-xl sm:text-3xl font-bold leading-tight max-w-lg">{activeSlide.titleText}</h2>
                {activeSlide.descText && (
                  <p className="text-white/85 text-sm mt-1 line-clamp-2 max-w-md">{activeSlide.descText}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  {activeSlide.isButtonEnabled ? (
                    <button
                      type="button"
                      onClick={() => handleHeroButtonClick(activeSlide)}
                      className="px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition"
                    >
                      {/servicio/i.test(activeSlide.buttonText) ? 'Ver menú' : activeSlide.buttonText}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : <span />}
                  {displayHeroSlides.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {displayHeroSlides.map((s, idx) => {
                        const on = idx === activeSlideIndex;
                        return (
                          <button
                            key={s.id || idx}
                            type="button"
                            aria-label={`Portada ${idx + 1}`}
                            onClick={() => setCurrentSlideIndex(idx)}
                            className={`h-1.5 rounded-full transition-all ${on ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* DATOS DEL LOCAL + CÓMO RECIBIR EL PEDIDO */}
            <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-3.5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${openInfo.open ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${openInfo.open ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {openInfo.label}
                </span>
                {negocio?.direccion && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{negocio.direccion}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'DOMICILIO', label: 'A domicilio', sub: `Envío desde $${defaultDelivery.toFixed(2)}`, Icon: Truck },
                  { key: 'RETIRO', label: 'Retiro en local', sub: 'Sin costo de envío', Icon: Store },
                ] as const).map((opt) => {
                  const on = deliveryType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setDeliveryType(opt.key as any);
                        if (opt.key === 'DOMICILIO' && !customerData?.direccion) setShowChannelModal(true);
                      }}
                      style={on ? { borderColor: cp, backgroundColor: `${cp}0D` } : undefined}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition ${on ? '' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <span style={on ? { backgroundColor: cp, color: '#fff' } : undefined} className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${on ? '' : 'bg-slate-100 text-slate-500'}`}>
                        <opt.Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 leading-tight">{opt.label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{opt.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* PROMOCIONES (solo si existen) */}
            {displayPromotions.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Flame style={{ color: cp }} className="w-5 h-5" /> Promociones
                  </h3>
                  <button type="button" onClick={() => setActiveNavTab('ofertas')} style={{ color: cp }} className="text-sm font-semibold flex items-center">
                    Ver todas <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none snap-x">
                  {displayPromotions.map((promo) => (
                    <button
                      key={promo.id}
                      type="button"
                      onClick={() => handleOpenPromoDetail(promo)}
                      className="snap-start shrink-0 w-[250px] text-left bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden active:scale-[0.99] transition"
                    >
                      <div className="relative h-28 bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={promo.image} alt="" className="w-full h-full object-cover" />
                        <span style={{ backgroundColor: cp }} className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold text-white">
                          {promo.badge || 'PROMO'}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-slate-900 truncate">{promo.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {promo.price ? <span style={{ color: cp }} className="text-sm font-bold">${Number(promo.price).toFixed(2)}</span> : null}
                          {promo.originalPrice ? <span className="text-xs text-slate-400 line-through">${Number(promo.originalPrice).toFixed(2)}</span> : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* MENÚ COMPLETO POR CATEGORÍAS */}
            <section id="seccion-menu-productos" className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Menú</h3>

              {menuSections.length > 1 && (
                <div
                  style={{ backgroundColor: cn }}
                  className="sticky top-[61px] md:top-[84px] z-20 -mx-4 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none"
                >
                  {menuSections.map((sec) => {
                    const on = activeMenuSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToMenuSection(sec.id)}
                        style={on ? { backgroundColor: cp, color: '#fff', borderColor: cp } : undefined}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${on ? '' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {sec.nombre}
                      </button>
                    );
                  })}
                </div>
              )}

              {menuSections.length === 0 ? (
                <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 text-center">
                  <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-800 mt-2">El menú se está preparando</p>
                  <p className="text-sm text-slate-500">Vuelve pronto para ver nuestros platos.</p>
                </div>
              ) : (
                menuSections.map((sec) => (
                  <div key={sec.id} id={`menu-sec-${sec.id}`} data-menu-section={sec.id} className="scroll-mt-32 md:scroll-mt-40 space-y-2">
                    <h4 className="text-base font-bold text-slate-900 pt-2">
                      {sec.nombre} <span className="text-slate-400 font-normal text-sm">· {sec.items.length}</span>
                    </h4>
                    <div className="grid md:grid-cols-2 gap-2.5">
                      {sec.items.map((prod) => {
                        const qty = getItemQuantity(prod.id);
                        const desc = cleanDescriptionText(prod.descripcion);
                        const hasDeal = prod.precioAnterior && prod.precioAnterior > prod.precio;
                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleOpenProductDetail(prod)}
                            className="bg-white rounded-2xl ring-1 ring-slate-100 hover:ring-slate-200 p-3 flex gap-3 cursor-pointer transition"
                          >
                            <div className="flex-1 min-w-0 flex flex-col">
                              <p className="font-semibold text-slate-900 leading-snug">{prod.nombre}</p>
                              {desc && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{desc}</p>}
                              <div className="mt-auto pt-2 flex items-center gap-2">
                                <span className="font-bold text-slate-900">${Number(prod.precio).toFixed(2)}</span>
                                {hasDeal && <span className="text-xs text-slate-400 line-through">${Number(prod.precioAnterior).toFixed(2)}</span>}
                                {hasDeal && <span style={{ color: cp, backgroundColor: `${cp}14` }} className="text-[10px] font-bold px-1.5 py-0.5 rounded">OFERTA</span>}
                              </div>
                            </div>
                            <div className="relative shrink-0">
                              {prod.imagenUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={prod.imagenUrl} alt="" loading="lazy" className="w-24 h-24 rounded-xl object-cover bg-slate-100" />
                              ) : (
                                <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center">
                                  <Utensils className="w-6 h-6 text-slate-300" />
                                </div>
                              )}
                              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2" onClick={(e) => e.stopPropagation()}>
                                {qty > 0 ? (
                                  <div className="flex items-center bg-white rounded-full shadow-md ring-1 ring-slate-200">
                                    <button type="button" aria-label="Quitar uno" onClick={() => decrementQuantity(prod.id)} className="w-7 h-7 flex items-center justify-center text-slate-700">
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-sm font-bold w-5 text-center">{qty}</span>
                                    <button
                                      type="button"
                                      aria-label="Agregar uno"
                                      onClick={() => addToCart({ id: prod.id, nombre: prod.nombre, precio: prod.precio, imagenUrl: prod.imagenUrl })}
                                      style={{ color: cp }}
                                      className="w-7 h-7 flex items-center justify-center"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={`Agregar ${prod.nombre}`}
                                    onClick={() => handleOpenProductDetail(prod)}
                                    style={{ backgroundColor: cp }}
                                    className="w-8 h-8 rounded-full text-white shadow-md flex items-center justify-center active:scale-95 transition"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* ── PESTAÑA 2: OFERTAS (PANTALLA DE OFERTAS Y PROMOCIONES COMPLETA) ── */}
        {activeNavTab === 'ofertas' && (
          <div className="space-y-4 pb-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Flame style={{ color: cp }} className="w-5 h-5" />
                Ofertas y Promociones Especiales
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Aprovecha los combos exclusivos y descuentos especiales del día
              </p>
            </div>

            {displayPromotions.length > 0 ? (
              <>
                {/* BANNER DESTACADO DE PROMOCIONES */}
                {promoBannerTitle && (
                  <div
                    onClick={handlePromoBannerClick}
                    style={{ backgroundColor: cs || '#1e293b' }}
                    className="rounded-3xl p-5 text-white shadow-lg flex items-center justify-between relative overflow-hidden border border-slate-800 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all group"
                  >
                    <div className="space-y-1 relative z-10 max-w-xs">
                      <span style={{ backgroundColor: cp }} className="text-xs font-bold text-white px-2 py-0.5 rounded-md uppercase tracking-wide inline-block">
                        PROMOCIÓN DEL DÍA
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white leading-tight group-hover:text-amber-300 transition-colors flex items-center gap-2">
                        <span>{promoBannerTitle}</span>
                        <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 group-hover:text-white transition-all" />
                      </h3>
                      {promoBannerDesc && (
                        <p className="text-xs text-slate-300 font-medium">
                          {promoBannerDesc}
                        </p>
                      )}
                    </div>

                    <div
                      style={{ backgroundColor: cp, color: '#ffffff' }}
                      className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-center shadow-xl rotate-[6deg] shrink-0 border-2 border-white/20 group-hover:scale-105 transition-transform"
                    >
                      <span className="text-xs leading-tight">Oferta</span>
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>
                )}

                {/* REJILLA COMPLETA DE PROMOCIONES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {displayPromotions.map((promo) => (
                    <div
                      key={promo.id}
                      onClick={() => handleOpenPromoDetail(promo)}
                      style={{ backgroundColor: '#ffffff' }}
                      className="rounded-3xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                    >
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative">
                          <img src={promo.image} alt={promo.title || 'Promoción'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          {promo.badge && (
                            <div style={{ backgroundColor: cp }} className="absolute top-1 left-1 text-xs font-bold text-white px-1.5 py-0.5 rounded-md shadow-xs">
                              {promo.badge}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-orange-600 transition-colors">
                            {promo.title}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2">
                            {promo.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {promo.price && (
                            <span style={{ color: cp }} className="text-base font-bold">
                              ${promo.price.toFixed(2)}
                            </span>
                          )}
                          {promo.originalPrice && (
                            <span className="text-xs font-bold text-slate-400 line-through">
                              ${promo.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPromoDetail(promo);
                          }}
                          style={{ backgroundColor: cp, color: '#ffffff' }}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-white" />
                          <span>Ver Oferta</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-2">
                <Flame className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No hay ofertas publicadas actualmente</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Las promociones especiales y combos creados desde el panel de administración aparecerán en esta sección.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── PESTAÑA 3: MIS PEDIDOS ── */}
        {activeNavTab === 'pedidos' && (
          <div className="space-y-4 pb-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList style={{ color: cp }} className="w-5 h-5" />
                Mis Pedidos
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Consulta el estado de tus órdenes activas e historial de compras
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">¡Tu historial está actualizado!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Tus pedidos confirmados aparecerán en esta sección con su estado en tiempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNavTab('inicio')}
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Realizar un Pedido
              </button>
            </div>
          </div>
        )}

        {/* ── PESTAÑA 4: MI CUENTA (REDISEÑADA Y COMPLETA) ── */}
        {activeNavTab === 'cuenta' && (
          <div className="space-y-4 pb-12 animate-in fade-in duration-300">
            
            {/* TARJETA SUPERIOR DE PERFIL */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {/* Avatar con foto o inicial + botón de edición de foto */}
                  <div className="relative shrink-0">
                    <div 
                      style={{ backgroundColor: cp }} 
                      className="w-16 h-16 rounded-full text-white font-bold flex items-center justify-center text-2xl shadow-md border-2 border-white"
                    >
                      {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setAccountActiveModal('personal_info')}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-white text-slate-700 rounded-full border border-slate-200 shadow-md cursor-pointer hover:bg-slate-50"
                    >
                      <Camera size={13} />
                    </button>
                  </div>

                  {/* Información de usuario */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {displayName}
                      </h3>
                      {userLevelTag && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${userLevelTag.color}`}>
                          <span>{userLevelTag.icon}</span>
                          <span>{userLevelTag.label}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-500 leading-tight">
                      {displayPhone}
                    </p>
                    <p className="text-xs text-slate-400 font-medium leading-tight">
                      {displayEmail}
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setAccountActiveModal('personal_info')}
                  className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <ChevronRight size={22} />
                </button>
              </div>

              {/* RESUMEN DE ACTIVIDAD (PEDIDOS, PUNTOS, CUPONES EN 3 BLOQUES CON DATOS REALES) */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <button 
                  type="button"
                  onClick={() => setActiveNavTab('pedidos')}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                      <ShoppingBag size={14} />
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-400">Pedidos</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 block leading-tight">{realOrdersCount}</span>
                    <span className="text-xs font-medium text-slate-400 block">Realizados</span>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => setAccountActiveModal('points')}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                      <Star size={14} />
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-400">Puntos</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 block leading-tight">{realPointsCount}</span>
                    <span className="text-xs font-medium text-slate-400 block">Disponibles</span>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => setActiveNavTab('ofertas')}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-colors cursor-pointer text-left space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-amber-100/60 text-amber-700 rounded-xl">
                      <Tag size={14} />
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-400">Cupones</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 block leading-tight">{realCuponesCount}</span>
                    <span className="text-xs font-medium text-slate-400 block">Disponibles</span>
                  </div>
                </button>
              </div>

              {/* DIRECCIÓN REGISTRADA Y MINI MAPA */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="p-2 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
                      <MapPin size={18} />
                    </span>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-500 block tracking-wider">Dirección registrada</span>
                      <p className="text-xs font-bold text-slate-900 leading-snug">
                        {displayAddress}
                      </p>
                      {displayReference && (
                        <p className="text-xs text-slate-500 font-medium">Ref: {displayReference}</p>
                      )}
                    </div>
                  </div>

                  {/* Contenedor del Mini Mapa Interactivo */}
                  <div className="w-28 h-20 rounded-2xl bg-slate-200 overflow-hidden border border-slate-200 shadow-inner shrink-0 relative">
                    <div ref={miniMapRef} className="w-full h-full" />
                  </div>
                </div>

                {/* Botón para actualizar ubicación en mapa */}
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="w-full py-3 px-4 bg-red-50 hover:bg-red-100/70 text-red-600 font-bold text-xs uppercase tracking-wider rounded-2xl border border-red-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Compass size={16} />
                  <span>Actualizar ubicación en el mapa</span>
                </button>
              </div>

            </div>

            {/* BANNER / AVISO INTELIGENTE DE DESCARGA DE LA APP DE RESTAURANTE */}
            <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-3xl p-4.5 text-white shadow-lg space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white p-1.5 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                    <img
                      src={negocio?.logoUrl || '/citiox-icon.png'}
                      alt={negocio?.nombre || 'CitiOx'}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/citiox-icon.png';
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-amber-200 block">App del Restaurante</span>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {isPWAInstalledState ? '¡Ya tienes la App instalada!' : `Descarga la App de ${negocio?.nombre || 'nuestro restaurante'}`}
                    </h4>
                    <p className="text-xs text-white/90 font-medium leading-tight mt-0.5">
                      {isPWAInstalledState 
                        ? 'Disfruta de la máxima velocidad al pedir tu comida y notificaciones en tiempo real.' 
                        : 'Instala nuestra aplicación oficial para pedir en 1-clic, seguir el estado de tu pedido en vivo y obtener ofertas exclusivas.'}
                    </p>
                  </div>
                </div>
              </div>

              {!isPWAInstalledState ? (
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-red-600 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95 border border-white"
                >
                  <Smartphone size={16} />
                  <span>Instalar App Gratis en mi Celular</span>
                </button>
              ) : (
                <div className="py-2 px-3 bg-white/15 rounded-xl border border-white/20 flex items-center justify-center gap-2 text-xs font-bold text-emerald-200">
                  <CheckCircle2 size={15} />
                  <span>App lista y activa en tu dispositivo</span>
                </div>
              )}
            </div>

            {/* LISTADO DE OPCIONES "MI CUENTA" */}
            <div className="bg-white rounded-3xl p-2 shadow-xs border border-slate-200 space-y-1">
              <h3 className="text-xs font-bold uppercase text-slate-900 tracking-wider px-4 pt-3 pb-1">Mi cuenta</h3>

              {[
                { id: 'personal_info', label: 'Información personal', desc: 'Actualiza tus datos personales', icon: User, color: 'bg-red-50 text-red-600' },
                { id: 'addresses', label: 'Mis direcciones', desc: 'Gestiona tus direcciones guardadas', icon: MapPin, color: 'bg-red-50 text-red-600' },
                { id: 'payments', label: 'Métodos de pago', desc: 'Tarjetas y pagos guardados', icon: CreditCard, color: 'bg-red-50 text-red-600' },
                { id: 'favorites', label: 'Mis favoritos', desc: 'Restaurantes y productos favoritos', icon: Star, color: 'bg-red-50 text-red-600' },
                { id: 'settings', label: 'Configuración', desc: 'Notificaciones, privacidad y más', icon: Settings, color: 'bg-red-50 text-red-600' },
                { id: 'support', label: 'Ayuda y soporte', desc: 'Centro de ayuda y contacto', icon: HelpCircle, color: 'bg-red-50 text-red-600' },
              ].map(item => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAccountActiveModal(item.id)}
                    className="w-full p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`p-2.5 rounded-2xl ${item.color} shrink-0`}>
                        <IconComponent size={18} />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">{item.label}</span>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">{item.desc}</span>
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </main>

      {/* ── BARRA FLOTANTE DEL CARRITO SI HAY PRODUCTOS AGREGADOS ── */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 w-full max-w-4xl mx-auto pointer-events-none">
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            style={{ backgroundColor: cp, color: '#ffffff' }}
            className="pointer-events-auto w-full py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-between shadow-2xl hover:opacity-95 active:scale-95 transition-all text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Ver mi pedido ({totalItemsCount})</span>
            </div>
            <span className="text-xs font-bold">${total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── NAVEGACIÓN INFERIOR FIJA DE 4 OPCIONES (INICIO, OFERTAS, MIS PEDIDOS, MI CUENTA) — SOLO EN MÓVIL ── */}
      <nav 
        style={{ 
          backgroundColor: navBg,
          borderColor: navLuma < 0.5 ? 'rgba(255,255,255,0.1)' : '#e2e8f0' 
        }} 
        className="md:hidden fixed bottom-0 left-0 right-0 border-t py-2 px-3 flex justify-around items-center z-50 shadow-lg w-full max-w-4xl mx-auto transition-colors duration-200"
      >
        <button
          type="button"
          onClick={() => setActiveNavTab('inicio')}
          className="flex flex-col items-center gap-0.5 text-xs font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'inicio' ? cp : navUnselectedText }}
        >
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('ofertas')}
          className="flex flex-col items-center gap-0.5 text-xs font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'ofertas' ? cp : navUnselectedText }}
        >
          <Tag className="w-4 h-4" />
          <span>Ofertas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('pedidos')}
          className="flex flex-col items-center gap-0.5 text-xs font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'pedidos' ? cp : navUnselectedText }}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Mis pedidos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('cuenta')}
          className="flex flex-col items-center gap-0.5 text-xs font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'cuenta' ? cp : navUnselectedText }}
        >
          <User className="w-4 h-4" />
          <span>Mi cuenta</span>
        </button>
      </nav>

      {/* Drawer Carrito */}
      {showCartDrawer && (
        <CustomerCartDrawer
          slug={negocio?.slug || 'demo'}
          businessName={negocio?.nombre || 'Restaurante'}
          primaryColor={cp}
          isOpen={showCartDrawer}
          onClose={() => setShowCartDrawer(false)}
        />
      )}

      {/* ── MODAL CANAL Y DIRECCIÓN DE ENTREGA ── */}
      {showChannelModal && (
        <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin style={{ color: cp }} className="w-5 h-5" />
                Dirección de Entrega
              </h3>
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Tipo de Entrega */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setDeliveryType('DOMICILIO')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
 deliveryType === 'DOMICILIO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
 }`}
              >
                <Truck className="w-4 h-4" style={{ color: deliveryType === 'DOMICILIO' ? cp : undefined }} />
                <span>A Domicilio</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('RETIRO')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
 deliveryType === 'RETIRO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
 }`}
              >
                <Store className="w-4 h-4" style={{ color: deliveryType === 'RETIRO' ? cp : undefined }} />
                <span>Para Llevar</span>
              </button>
            </div>

            {deliveryType === 'DOMICILIO' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChannelModal(false);
                    setShowMapModal(true);
                  }}
                  className="w-full py-3 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>📍 Abrir Mapa para Fijar Ubicación y Referencia</span>
                </button>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Calle / Dirección Exacta *</label>
                  <input
                    type="text"
                    placeholder="Ej: Av. Principal #123 y Calle 4"
                    value={customerData?.direccion || ''}
                    onChange={(e) => setCustomerData({ direccion: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all text-white cursor-pointer"
              >
                Guardar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MAPA SELECCIÓN PANTALLA COMPLETA ── */}
      {showMapModal && (
        <MapSelectionModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          initialLat={customerData?.lat}
          initialLng={customerData?.lng}
          initialReference={customerData?.referencia}
          onConfirmLocation={(lat, lng, address, ref) => {
            setCustomerData({
              lat,
              lng,
              direccion: address || customerData?.direccion || 'Ubicación seleccionada en mapa',
              referencia: ref || customerData?.referencia
            });
            setShowMapModal(false);
          }}
        />
      )}

      {/* ── MODAL DETALLES COMPLETOS DE PROMOCIÓN / PRODUCTO ── */}
      {showDetailModal && (
        <ItemDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          item={selectedDetailItem}
          primaryColor={cp}
          onAddToCart={handleAddToCartFromDetail}
        />
      )}

      {/* ── MODALES INTERACTIVOS DE MI CUENTA ── */}
      {accountActiveModal === 'personal_info' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm uppercase text-slate-900">Información Personal</h3>
              </div>
              <button type="button" onClick={() => setAccountActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setAccountActiveModal(null); }} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={customerData?.nombre || ''}
                  onChange={(e) => setCustomerData({ nombre: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={customerData?.email || ''}
                  onChange={(e) => setCustomerData({ email: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Teléfono Móvil</label>
                <input
                  type="text"
                  value={customerData?.telefono || ''}
                  onChange={(e) => setCustomerData({ telefono: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAccountActiveModal(null)} className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl">
                  Cancelar
                </button>
                <button type="submit" style={{ backgroundColor: cp }} className="py-2.5 px-5 text-white font-bold rounded-xl shadow-md">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {accountActiveModal === 'payments' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm uppercase text-slate-900">Métodos de Pago</h3>
              </div>
              <button type="button" onClick={() => setAccountActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💵</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Efectivo al Recibir</span>
                    <span className="text-xs text-slate-400 font-medium">Pago directo al entregador</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏦</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Transferencia Bancaria</span>
                    <span className="text-xs text-slate-400 font-medium">Comprobante por WhatsApp</span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              🔒 Métodos de pago seguros y protegidos por el establecimiento.
            </p>
          </div>
        </div>
      )}

      {accountActiveModal === 'support' && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm uppercase text-slate-900">Ayuda y Soporte</h3>
              </div>
              <button type="button" onClick={() => setAccountActiveModal(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">¿Tienes alguna duda o problema con un pedido reciente? Estamos para ayudarte.</p>
              
              <a
                href={`https://wa.me/593959997521?text=Hola,%20necesito%20soporte%20con%20mi%20pedido%20en%20${encodeURIComponent(negocio?.nombre || 'Restaurante')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-2xl shadow-md flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} /> Contactar Soporte WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
