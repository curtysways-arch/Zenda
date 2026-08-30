'use client';
/**
 * @file RestaurantLanding.tsx
 * @module modules/restaurant/components
 * @description Rediseño optimizado del Home de Restaurante con sincronización dinámica de colores configurados desde el Admin (Header, Fondo, Botones, etc.).
 */

import React, { useState, useEffect } from 'react';
import {
  Menu, Search, SlidersHorizontal, MapPin, ChevronDown, Bell, ShoppingBag,
  Heart, Plus, Minus, Truck, Percent, ShieldCheck, Home, Grid, Tag,
  ClipboardList, User, ArrowRight, Utensils, ChevronRight, X, Sparkles, Flame, Store, Navigation
} from 'lucide-react';
import { CartProvider, useCart } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import MapSelectionModal from '@/components/public/MapSelectionModal';

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

// Fallback de demostración
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    nombre: 'Hamburguesa Clásica',
    descripcion: 'Carne 150g, lechuga, tomate, queso cheddar y salsa especial.',
    precio: 6.99,
    precioAnterior: 8.99,
    imagenUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-burgers', nombre: 'Hamburguesas' }
  },
  {
    id: 'demo-2',
    nombre: 'Pizza Pepperoni',
    descripcion: 'Pepperoni, mozzarella y salsa de tomate.',
    precio: 8.50,
    precioAnterior: 10.50,
    imagenUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-pizzas', nombre: 'Pizzas' }
  },
  {
    id: 'demo-3',
    nombre: 'Ensalada César',
    descripcion: 'Pollo a la parrilla, lechuga, parmesano y aderezo césar.',
    precio: 5.75,
    precioAnterior: 7.00,
    imagenUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-salads', nombre: 'Ensaladas' }
  },
  {
    id: 'demo-4',
    nombre: 'Combo Familiar Burger',
    descripcion: '2 Hamburguesas dobles + 2 Papas grandes + 2 Gaseosas.',
    precio: 14.99,
    precioAnterior: 19.99,
    imagenUrl: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-combos', nombre: 'Combos' }
  }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-burgers', nombre: 'Hamburguesas', icono: '🍔' },
  { id: 'cat-pizzas', nombre: 'Pizzas', icono: '🍕' },
  { id: 'cat-salads', nombre: 'Ensaladas', icono: '🥗' },
  { id: 'cat-drinks', nombre: 'Bebidas', icono: '🥤' },
  { id: 'cat-desserts', nombre: 'Postres', icono: '🍰' },
  { id: 'cat-combos', nombre: 'Combos', icono: '📦' },
];

const FALLBACK_PROMOTIONS: HighlightItem[] = [
  {
    id: 'promo-1',
    title: 'Combo 2x1 Hamburguesas',
    description: '2 Hamburguesas Clásicas + Papas Fritas + Gaseosa 1L',
    image: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&q=80&w=800',
    price: 11.99,
    originalPrice: 16.99,
    badge: '2x1 OFERTA'
  },
  {
    id: 'promo-2',
    title: 'Parrillada Familiar Premium',
    description: 'Cortes premium, chorizos artesanas, yuca y chimichurri',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
    price: 18.50,
    originalPrice: 24.99,
    badge: '25% OFF'
  },
  {
    id: 'promo-3',
    title: 'Pizza Familiar + Alitas',
    description: '1 Pizza Gigante Pepperoni + 8 Alitas BBQ + Gaseosa',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    price: 15.99,
    originalPrice: 21.00,
    badge: 'SUPER COMBO'
  }
];

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
    decrementQuantity
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

  const [products, setProducts] = useState<Product[]>(initialProducts.length > 0 ? initialProducts : FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(initialHeroContent?.hero || []);
  const [highlights, setHighlights] = useState<HighlightItem[]>(initialHeroContent?.highlights || []);

  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [showChannelModal, setShowChannelModal] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [activeNavTab, setActiveNavTab] = useState<'inicio' | 'categorias' | 'ofertas' | 'pedidos' | 'cuenta'>('inicio');

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

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

  const filteredProducts = products.filter(p => {
    if (p.activo === false) return false;
    if (selectedCategory !== 'TODOS') {
      const matchCatId = p.categoriaId === selectedCategory;
      const matchCatName = p.categoria?.nombre?.toLowerCase() === selectedCategory.toLowerCase();
      const matchCatObjId = p.categoria?.id === selectedCategory;
      if (!matchCatId && !matchCatName && !matchCatObjId) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.nombre.toLowerCase().includes(q);
      const matchDesc = p.descripcion?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Datos para Hero Banner
  const displayHeroSlides = heroSlides.length > 0 ? heroSlides : products.slice(0, 3).map(p => ({
    id: p.id,
    title: p.nombre,
    description: p.descripcion,
    image: p.imagenUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    price: p.precio,
    originalPrice: p.precio ? Number((p.precio * 1.25).toFixed(2)) : undefined,
    button: { enabled: true, text: 'Pedir Ahora', actionType: 'PRODUCT', actionValue: p.id }
  }));

  const activeSlideIndex = displayHeroSlides.length > 0 ? currentSlideIndex % displayHeroSlides.length : 0;
  const rawSlide = displayHeroSlides[activeSlideIndex] || displayHeroSlides[0];

  const activeSlide = {
    image: rawSlide?.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    tagText: rawSlide?.title ? 'ESPECIAL DE LA CASA' : negocio?.nombre || 'RESTAURANTE',
    titleText: rawSlide?.title || negocio?.nombre || 'Hamburguesa Clásica',
    descText: rawSlide?.description || 'Parrillas artesanales, cortes premium y la mejor experiencia gastronómica.',
    priceText: rawSlide?.price ? `$${Number(rawSlide.price).toFixed(2)}` : '$6.99',
    isButtonEnabled: rawSlide?.button?.enabled ?? true,
    buttonText: rawSlide?.button?.text || 'Ver Menú',
    buttonAction: rawSlide?.button?.actionType,
    buttonValue: rawSlide?.button?.actionValue
  };

  const displayPromotions = highlights.length > 0 ? highlights : FALLBACK_PROMOTIONS;

  const handleHeroButtonClick = (slide: typeof activeSlide) => {
    if (slide.buttonAction === 'PRODUCT' && slide.buttonValue) {
      const prod = products.find(p => p.id === slide.buttonValue);
      if (prod) {
        addToCart({
          id: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          imagenUrl: prod.imagenUrl
        });
        setShowCartDrawer(true);
        return;
      }
    }
    const menuEl = document.getElementById('seccion-menu-productos');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{ backgroundColor: cn, color: '#0f172a' }}
      className="min-h-screen w-full font-sans antialiased pb-28 select-none"
    >
      {/* ── 1. BARRA SUPERIOR (HEADER APLICANDO EXACTAMENTE EL "COLOR DE BARRA SUPERIOR" CONFIGURADO EN EL ADMIN) ── */}
      <div 
        style={{ 
          backgroundColor: headerBg, 
          borderColor: headerBorder 
        }}
        className="sticky top-0 z-30 px-3 sm:px-5 py-3 border-b shadow-xs w-full max-w-4xl mx-auto transition-colors duration-200"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Lado Izquierdo: Menú Hamburguesa + Saludo de Usuario */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowChannelModal(true)}
              style={{ backgroundColor: headerBtnBg, color: headerText }}
              className="p-2 rounded-xl transition-all border border-transparent cursor-pointer"
            >
              <Menu className="w-5 h-5" style={{ color: headerText }} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: headerText }} className="font-extrabold text-sm tracking-tight">
                  ¡Hola, {customerData?.nombre || 'Carlos Caicedo'}!
                </span>
                <span className="text-sm">👋</span>
              </div>
              <p style={{ color: headerSubText }} className="text-[11px] font-medium leading-none mt-0.5">
                ¿Qué se te antoja hoy?
              </p>
            </div>
          </div>

          {/* Lado Derecho: Notificaciones + Carrito Flotante */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              style={{ backgroundColor: headerBtnBg, color: headerText }}
              className="relative p-2 rounded-xl transition-all border border-transparent cursor-pointer"
            >
              <Bell className="w-4 h-4" style={{ color: headerText }} />
              <span
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs"
              >
                2
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              style={{ backgroundColor: headerBtnBg, color: headerText }}
              className="relative p-2 rounded-xl transition-all border border-transparent cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" style={{ color: headerText }} />
              {totalItemsCount > 0 && (
                <span
                  style={{ backgroundColor: cp, color: '#ffffff' }}
                  className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full text-[10px] font-black flex items-center justify-center shadow-xs"
                >
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENEDOR PRINCIPAL FULL ANCHO ── */}
      <main className="w-full max-w-4xl mx-auto px-3 sm:px-5 pt-3 space-y-4">
        {/* ── 2. SECTOR SELECCIÓN DE DIRECCIÓN Y CANAL DE ENTREGA (ABRE DIRECTAMENTE EL MAPA O EL MODAL) ── */}
        <button 
          type="button"
          onClick={() => setShowMapModal(true)}
          style={{ backgroundColor: '#ffffff' }}
          className="w-full rounded-2xl p-3 border border-slate-200 flex items-center justify-between text-xs shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              style={{ backgroundColor: cp, color: '#ffffff' }}
              className="p-2.5 rounded-xl text-white font-bold shrink-0 shadow-xs flex items-center justify-center"
            >
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block leading-none">
                {deliveryType === 'RETIRO' ? 'MÉTODO DE ENTREGA' : 'ENVIAR A'}
              </span>
              <span style={{ color: '#0f172a' }} className="font-extrabold text-xs text-slate-900 truncate block mt-1">
                {deliveryType === 'RETIRO'
                  ? 'Retiro en local / Para llevar'
                  : (customerData?.direccion && customerData.direccion.trim().length > 0
                      ? customerData.direccion
                      : 'Seleccionar ubicación de entrega en mapa...')}
              </span>
            </div>
          </div>

          <div className="text-slate-500 p-1 shrink-0 ml-2">
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>

        {/* ── 3. BARRA DE BÚSQUEDA ── */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Buscar platos, combos, bebidas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl font-bold text-xs text-slate-900 placeholder:text-slate-400 shadow-xs border border-slate-200 focus:border-slate-400 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="button"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* ── 4. BANNER HERO RECTANGULAR WIDESCREEN CON FOTO DE COMIDA Y COLOR DE MARCA ── */}
        <div
          style={{ backgroundColor: cs || '#1e293b' }}
          className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-800 min-h-[165px] sm:min-h-[195px] max-h-[210px] flex items-center"
        >
          {/* Lado Derecho: Imagen de Comida Real Bright 50% de Ancho */}
          <div className="absolute top-0 right-0 bottom-0 w-1/2 h-full z-0 overflow-hidden">
            <img
              src={activeSlide.image}
              alt={activeSlide.titleText}
              className="w-full h-full object-cover object-center scale-105 transition-all duration-700"
            />
            {/* Gradiente sutil para integrar la foto */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent" />
          </div>

          {/* Etiqueta Flotante Circular "DESDE $6.99" en la esquina de la imagen */}
          <div
            style={{ backgroundColor: cp, color: '#ffffff' }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-12 h-12 rounded-full flex flex-col items-center justify-center text-white font-black shadow-xl border-2 border-white/20 rotate-[6deg] scale-95"
          >
            <span className="text-[8px] uppercase tracking-tighter leading-tight opacity-90">DESDE</span>
            <span className="text-xs font-black leading-none">{activeSlide.priceText}</span>
          </div>

          {/* Lado Izquierdo: Textos Nítidos e Informativos */}
          <div className="relative z-10 w-1/2 p-4 sm:p-6 space-y-1.5 flex flex-col justify-center">
            <span style={{ color: cp }} className="text-[9px] font-black uppercase tracking-widest block">
              {activeSlide.tagText}
            </span>

            <h2 className="text-white text-lg sm:text-xl font-black tracking-tight leading-tight">
              {activeSlide.titleText}
            </h2>

            {activeSlide.descText && (
              <p className="text-slate-300 text-[10px] font-normal leading-relaxed line-clamp-2 max-w-[210px]">
                {activeSlide.descText}
              </p>
            )}

            {activeSlide.isButtonEnabled && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleHeroButtonClick(activeSlide)}
                  style={{ backgroundColor: cp, color: '#ffffff' }}
                  className="px-4 py-1.5 rounded-full text-[11px] font-black text-white shadow-lg flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  <span>{activeSlide.buttonText}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {displayHeroSlides.length > 1 && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {displayHeroSlides.map((s, idx) => {
                const isActive = idx === currentSlideIndex % displayHeroSlides.length;
                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    style={{ backgroundColor: isActive ? cp : undefined }}
                    className={`transition-all duration-300 ${
                      isActive ? 'w-5 h-1.5 rounded-full shadow-sm' : 'w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── 5. CATEGORÍAS HORIZONTALES CON BORDES Y SELECCIÓN SEGÚN COLOR DE MARCA ── */}
        <div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              style={{
                borderColor: selectedCategory === 'TODOS' ? cp : '#e2e8f0',
                color: selectedCategory === 'TODOS' ? cp : '#334155',
                backgroundColor: '#ffffff'
              }}
              className={`px-3 py-2 rounded-2xl border flex flex-col items-center justify-center min-w-[76px] shrink-0 transition-all shadow-xs cursor-pointer ${
                selectedCategory === 'TODOS' ? 'shadow-md border-2' : ''
              }`}
            >
              <span className="text-xl mb-0.5">🍔</span>
              <span
                style={{ color: selectedCategory === 'TODOS' ? cp : '#334155' }}
                className="text-[10px] font-extrabold whitespace-nowrap"
              >
                Hamburguesas
              </span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id || selectedCategory === cat.nombre;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    borderColor: isActive ? cp : '#e2e8f0',
                    color: isActive ? cp : '#334155',
                    backgroundColor: '#ffffff'
                  }}
                  className={`px-3 py-2 rounded-2xl border flex flex-col items-center justify-center min-w-[76px] shrink-0 transition-all shadow-xs cursor-pointer ${
                    isActive ? 'shadow-md border-2' : ''
                  }`}
                >
                  <span className="text-xl mb-0.5">{cat.icono || '🍲'}</span>
                  <span
                    style={{ color: isActive ? cp : '#334155' }}
                    className="text-[10px] font-extrabold whitespace-nowrap"
                  >
                    {cat.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 6. MÓDULO DE ENVÍO Y BENEFICIOS COMPACTO CON ICONOS EN COLOR PRIMARIO ── */}
        <div
          style={{ backgroundColor: '#fff8f5', borderColor: 'rgba(254, 215, 170, 0.7)' }}
          className="rounded-2xl border p-2.5 flex items-center justify-between shadow-2xs text-xs"
        >
          {/* Beneficio 1: Envío Rápido */}
          <div className="flex items-center gap-2 flex-1 justify-center px-1">
            <div style={{ color: cp }} className="shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span style={{ color: '#0f172a' }} className="font-extrabold block leading-tight text-[11px]">
                Envío rápido
              </span>
              <span style={{ color: '#475569' }} className="text-[9px] block leading-none mt-0.5">
                30–45 min
              </span>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-orange-200/60 shrink-0" />

          {/* Beneficio 2: Promociones */}
          <div className="flex items-center gap-2 flex-1 justify-center px-1">
            <div style={{ color: cp }} className="shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span style={{ color: '#0f172a' }} className="font-extrabold block leading-tight text-[11px]">
                Promociones
              </span>
              <span style={{ color: '#475569' }} className="text-[9px] block leading-none mt-0.5">
                Todos los días
              </span>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-orange-200/60 shrink-0" />

          {/* Beneficio 3: Pago Seguro */}
          <div className="flex items-center gap-2 flex-1 justify-center px-1">
            <div style={{ color: cp }} className="shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span style={{ color: '#0f172a' }} className="font-extrabold block leading-tight text-[11px]">
                Pago seguro
              </span>
              <span style={{ color: '#475569' }} className="text-[9px] block leading-none mt-0.5">
                100% protegido
              </span>
            </div>
          </div>
        </div>

        {/* ── 6.5. SECCIÓN PROMOCIONES Y OFERTAS (UBICADA ANTES DE RECOMENDADOS PARA TI) ── */}
        <div className="space-y-3 pt-2 pb-1">
          <div className="flex items-center justify-between">
            <h3 style={{ color: '#0f172a' }} className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Flame style={{ color: cp }} className="w-5 h-5" />
              Promociones Especiales
            </h3>
            <span style={{ backgroundColor: `${cp}15`, color: cp, borderColor: `${cp}30` }} className="text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider">
              Ofertas Activas
            </span>
          </div>

          {/* Banner de Promociones de Envío / Descuento */}
          <div
            style={{ backgroundColor: cs || '#1e293b' }}
            className="rounded-2xl p-3.5 text-white shadow-md flex items-center justify-between relative overflow-hidden border border-slate-800"
          >
            <div className="flex items-center gap-3 relative z-10">
              <div
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white font-black text-center shadow-lg rotate-[-4deg] shrink-0"
              >
                <span className="text-[8px] leading-tight">OFERTA</span>
                <Percent className="w-4 h-4 mt-0.5 text-white" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase leading-tight text-white">
                  ¡ENVÍO GRATIS Y HASTA 30% OFF!
                </h4>
                <p style={{ color: cp }} className="text-[11px] font-bold mt-0.5">
                  Aplica automático en combos y pedidos sobre $15
                </p>
              </div>
            </div>

            <div className="relative z-10 shrink-0">
              <span
                style={{ backgroundColor: `${cp}20`, color: cp, borderColor: `${cp}40` }}
                className="px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                <span>Automático</span>
              </span>
            </div>
          </div>

          {/* Carrusel Horizontal de Tarjetas Promocionales */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {displayPromotions.map((promo) => (
              <div
                key={promo.id}
                style={{ backgroundColor: '#ffffff' }}
                className="rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3 min-w-[260px] max-w-[290px] shrink-0 hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  <img src={promo.image} alt={promo.title || 'Promoción'} className="w-full h-full object-cover" />
                  <div style={{ backgroundColor: cp }} className="absolute top-1 left-1 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md shadow-xs">
                    {promo.badge || 'PROMO'}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <h5 style={{ color: '#0f172a' }} className="text-xs font-black truncate">
                    {promo.title}
                  </h5>
                  <p style={{ color: '#64748b' }} className="text-[10px] font-medium line-clamp-1">
                    {promo.description}
                  </p>

                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5">
                      {promo.price && (
                        <span style={{ color: cp }} className="text-xs font-black">
                          ${promo.price.toFixed(2)}
                        </span>
                      )}
                      {promo.originalPrice && (
                        <span style={{ color: '#94a3b8' }} className="text-[10px] font-bold line-through">
                          ${promo.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart({
                        id: promo.id,
                        nombre: promo.title || 'Promoción',
                        precio: promo.price || 9.99,
                        imagenUrl: promo.image
                      })}
                      style={{ backgroundColor: cp, color: '#ffffff' }}
                      className="px-2 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-xs hover:opacity-90 active:scale-95 transition-all text-white cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-white" />
                      <span>Pedir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. SECCIÓN RECOMENDADOS PARA TI ── */}
        <div id="seccion-menu-productos" className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 style={{ color: '#0f172a' }} className="text-base sm:text-lg font-black tracking-tight">
              Recomendados para ti
            </h3>
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              style={{ color: cp }}
              className="text-xs font-extrabold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>Ver todo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff' }} className="text-center py-8 rounded-2xl border border-slate-100 p-6 space-y-2">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 style={{ color: '#334155' }} className="font-bold text-xs">No encontramos platillos disponibles</h4>
              <p style={{ color: '#64748b' }} className="text-[11px]">Intenta buscar otro término o seleccionar otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const qtyInCart = getItemQuantity(prod.id);
                const isFav = !!favorites[prod.id];

                return (
                  <div
                    key={prod.id}
                    style={{ backgroundColor: '#ffffff' }}
                    className="rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    {/* Imagen del Producto + Corazón Favorito */}
                    <div className="relative w-full h-32 sm:h-36 bg-slate-100 overflow-hidden">
                      {prod.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍲</div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(prod.id, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/40 backdrop-blur-xs text-white hover:bg-slate-900/60 transition-all cursor-pointer"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-colors ${
                            isFav ? 'fill-red-500 text-red-500' : 'text-white'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Detalle del Producto */}
                    <div className="p-3 flex flex-col flex-1 justify-between space-y-2">
                      <div>
                        <h4 style={{ color: '#0f172a' }} className="font-extrabold text-xs line-clamp-1">
                          {prod.nombre}
                        </h4>
                        {prod.descripcion && (
                          <p style={{ color: '#64748b' }} className="text-[10px] font-medium line-clamp-2 mt-0.5">
                            {prod.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Precio y Botón Agregar al Carrito */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span style={{ color: cp }} className="font-black text-xs sm:text-sm">
                          ${prod.precio.toFixed(2)}
                        </span>

                        {qtyInCart > 0 ? (
                          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => decrementQuantity(prod.id)}
                              className="w-5 h-5 bg-white text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center shadow-xs hover:bg-slate-200 cursor-pointer"
                            >
                              -
                            </button>
                            <span style={{ color: '#0f172a' }} className="text-[11px] font-black px-1">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart({
                                id: prod.id,
                                nombre: prod.nombre,
                                precio: prod.precio,
                                imagenUrl: prod.imagenUrl
                              })}
                              style={{ backgroundColor: cp, color: '#ffffff' }}
                              className="w-5 h-5 rounded-lg font-bold text-xs flex items-center justify-center shadow-xs text-white cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart({
                              id: prod.id,
                              nombre: prod.nombre,
                              precio: prod.precio,
                              imagenUrl: prod.imagenUrl
                            })}
                            style={{ backgroundColor: cp, color: '#ffffff' }}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-extrabold shadow-md hover:opacity-90 active:scale-95 transition-all text-white cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── BARRA FLOTANTE DEL CARRITO SI HAY PRODUCTOS AGREGADOS ── */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 w-full max-w-4xl mx-auto pointer-events-none">
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            style={{ backgroundColor: cp, color: '#ffffff' }}
            className="pointer-events-auto w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-2xl hover:opacity-95 active:scale-95 transition-all text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Ver mi pedido ({totalItemsCount})</span>
            </div>
            <span className="text-xs font-black">${total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── NAVEGACIÓN INFERIOR FIJA DE 5 OPCIONES (APLICANDO COLOR DE BOTTOM NAV DEL ADMIN) ── */}
      <nav 
        style={{ 
          backgroundColor: navBg,
          borderColor: navLuma < 0.5 ? 'rgba(255,255,255,0.1)' : '#e2e8f0' 
        }} 
        className="fixed bottom-0 left-0 right-0 border-t py-2 px-3 flex justify-around items-center z-50 shadow-lg w-full max-w-4xl mx-auto transition-colors duration-200"
      >
        <button
          type="button"
          onClick={() => setActiveNavTab('inicio')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'inicio' ? cp : navUnselectedText }}
        >
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('categorias')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'categorias' ? cp : navUnselectedText }}
        >
          <Grid className="w-4 h-4" />
          <span>Categorías</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('ofertas')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'ofertas' ? cp : navUnselectedText }}
        >
          <Tag className="w-4 h-4" />
          <span>Ofertas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('pedidos')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer"
          style={{ color: activeNavTab === 'pedidos' ? cp : navUnselectedText }}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Mis pedidos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('cuenta')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer"
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
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
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
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  deliveryType === 'DOMICILIO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                <Truck className="w-4 h-4" style={{ color: deliveryType === 'DOMICILIO' ? cp : undefined }} />
                <span>A Domicilio</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('RETIRO')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                  className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>📍 Seleccionar o mover ubicación en mapa GPS</span>
                </button>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Calle / Dirección Exacta *</label>
                  <input
                    type="text"
                    placeholder="Ej: Av. Principal #123 y Calle 4"
                    value={customerData?.direccion || ''}
                    onChange={(e) => setCustomerData({ direccion: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Referencia de Ubicación</label>
                  <input
                    type="text"
                    placeholder="Ej: Casa blanca de 2 pisos junto a la farmacia"
                    value={customerData?.referencia || ''}
                    onChange={(e) => setCustomerData({ referencia: e.target.value })}
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
                className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all text-white cursor-pointer"
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
    </div>
  );
}
