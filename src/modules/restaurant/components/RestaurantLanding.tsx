'use client';
/**
 * @file RestaurantLanding.tsx
 * @module modules/restaurant/components
 * @description Rediseño completo y fiel a la captura de pantalla de referencia para el Home de Restaurantes en Citiox.
 * Reconstruye minuciosamente cada sección: Header Oscuro, Selector de Dirección, Buscador Blanco, Banner Hero con
 * Imagen Grande y Badge Flotante Naranja, Categorías Horizontales, Bloque de Beneficios, Recomendados para ti
 * con tarjetas de productos, Banner Promocional de Envío Gratis y Navegación Inferior Fija de 5 pestañas.
 */

import React, { useState, useEffect } from 'react';
import {
  Menu, Search, SlidersHorizontal, MapPin, ChevronDown, Bell, ShoppingBag,
  Heart, Plus, Minus, Truck, Percent, ShieldCheck, Home, Grid, Tag,
  ClipboardList, User, ArrowRight, Utensils, ChevronRight, X
} from 'lucide-react';
import { CartProvider, useCart } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import Link from 'next/link';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
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

// Fallback de demostración con productos reales idénticos a la imagen de referencia
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    nombre: 'Hamburguesa Clásica',
    descripcion: 'Carne 150g, lechuga, tomate, queso cheddar y salsa especial.',
    precio: 6.99,
    imagenUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-burgers', nombre: 'Hamburguesas' }
  },
  {
    id: 'demo-2',
    nombre: 'Pizza Pepperoni',
    descripcion: 'Pepperoni, mozzarella y salsa de tomate.',
    precio: 8.50,
    imagenUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-pizzas', nombre: 'Pizzas' }
  },
  {
    id: 'demo-3',
    nombre: 'Ensalada César',
    descripcion: 'Pollo a la parrilla, lechuga, parmesano y aderezo césar.',
    precio: 5.75,
    imagenUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-salads', nombre: 'Ensaladas' }
  },
  {
    id: 'demo-4',
    nombre: 'Combo Familiar Burger',
    descripcion: '2 Hamburguesas dobles + 2 Papas grandes + 2 Gaseosas.',
    precio: 14.99,
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
    getItemQuantity,
    addToCart,
    decrementQuantity
  } = useCart();

  // Colores dinámicos del Admin
  const cp = negocio?.colorPrimario || '#ff5500'; // Color primario naranja intenso
  const cn = negocio?.colorNeutral || '#f8fafc'; // Color de fondo claro general

  const [products, setProducts] = useState<Product[]>(initialProducts.length > 0 ? initialProducts : FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(initialHeroContent?.hero || []);
  const [highlights, setHighlights] = useState<HighlightItem[]>(initialHeroContent?.highlights || []);

  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [showChannelModal, setShowChannelModal] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [activeNavTab, setActiveNavTab] = useState<'inicio' | 'categorias' | 'ofertas' | 'pedidos' | 'cuenta'>('inicio');

  // Carrusel automático para el Hero Banner
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Carga de datos si no vienen desde SSR
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

  // Filtrado de productos por categoría activa y caja de búsqueda
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
      const matchDesc = (p.descripcion || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Lógica oficial de construcción de diapositivas Hero
  const displayHeroSlides = (heroSlides.length > 0)
    ? heroSlides.map(slide => {
        const titleText = (slide.title && slide.title.trim())
          ? slide.title.trim()
          : (negocio?.heroTitulo || negocio?.nombre || 'BURGER Clásica');

        const descText = (slide.description && slide.description.trim())
          ? slide.description.trim()
          : (negocio?.heroSubtitulo || negocio?.descripcion || 'Carne jugosa, queso cheddar, lechuga, tomate y nuestra salsa especial.');

        const isButtonEnabled = slide.button?.enabled !== false && !!(slide.button?.text && slide.button.text.trim());
        const buttonText = slide.button?.text?.trim() || 'Pedir ahora →';
        const actionType = slide.button?.actionType || 'NONE';
        const actionValue = slide.button?.actionValue || '';

        return {
          id: slide.id,
          titleText,
          descText,
          price: Number(slide.price) || 6.99,
          image: slide.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200',
          badgeText: slide.type === 'PROMOTION' ? 'OFERTA EXCLUSIVA' : 'ESPECIAL DE LA CASA',
          isButtonEnabled,
          buttonText,
          actionType,
          actionValue,
          rawSlide: slide,
          rawProduct: null as Product | null
        };
      })
    : (products.length > 0
        ? products.slice(0, 3).map((prod, idx) => ({
            id: prod.id,
            titleText: prod.nombre,
            descText: prod.descripcion || 'Carne jugosa, queso cheddar, lechuga, tomate y nuestra salsa especial.',
            price: Number(prod.precio) || 6.99,
            image: prod.imagenUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200',
            badgeText: idx === 0 ? 'ESPECIAL DE LA CASA' : 'DESTACADO',
            isButtonEnabled: true,
            buttonText: 'Pedir ahora →',
            actionType: 'PRODUCT',
            actionValue: prod.id,
            rawProduct: prod
          }))
        : [{
            id: 'default-profile-hero',
            titleText: negocio?.heroTitulo || negocio?.nombre || 'BURGER Clásica',
            descText: negocio?.heroSubtitulo || negocio?.descripcion || 'Carne jugosa, queso cheddar, lechuga, tomate y nuestra salsa especial.',
            price: 6.99,
            image: negocio?.bannerUrl || negocio?.logoUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200',
            badgeText: 'ESPECIAL DE LA CASA',
            isButtonEnabled: true,
            buttonText: 'Pedir ahora →',
            actionType: 'NONE',
            actionValue: '',
            rawProduct: null as Product | null
          }]
      );

  const activeSlide = displayHeroSlides[currentSlideIndex % displayHeroSlides.length] || displayHeroSlides[0];

  const handleHeroButtonClick = (slide: typeof activeSlide) => {
    if (!slide.isButtonEnabled) return;

    if (slide.rawProduct) {
      addToCart(slide.rawProduct);
      return;
    }

    const { actionType, actionValue } = slide;

    if (actionType === 'URL' || actionType === 'LINK') {
      if (actionValue) {
        if (actionValue.startsWith('http://') || actionValue.startsWith('https://')) {
          window.open(actionValue, '_blank');
        } else {
          window.location.href = actionValue;
        }
      }
      return;
    }

    if (actionType === 'PRODUCT') {
      if (actionValue) {
        const prod = products.find(p => p.id === actionValue);
        if (prod) {
          addToCart(prod);
          return;
        }
      }
      setShowCartDrawer(true);
      return;
    }

    if (actionType === 'CATEGORY') {
      if (actionValue) {
        setSelectedCategory(actionValue);
      }
      return;
    }

    if (actionValue && (actionValue.startsWith('http://') || actionValue.startsWith('https://') || actionValue.startsWith('/'))) {
      window.location.href = actionValue;
      return;
    }

    setShowCartDrawer(true);
  };

  return (
    <div style={{ backgroundColor: cn }} className="min-h-screen font-sans pb-28 select-none text-slate-900">
      {/* ── 1. HEADER SUPERIOR OSCURO (ESTRUCTURA IDÉNTICA A REFERENCIA) ── */}
      <header
        style={{ backgroundColor: '#121214', color: '#ffffff' }}
        className="px-4 pt-4 pb-5 rounded-b-3xl shadow-2xl sticky top-0 z-30 transition-colors border-b border-zinc-800/80"
      >
        <div className="max-w-md mx-auto space-y-3.5">
          {/* Fila Izquierda: Menú Hamburguesa + Saludo | Fila Derecha: Notificaciones & Carrito */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-slate-200 hover:text-white p-1 transition-colors"
                aria-label="Menú"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1 text-white leading-none">
                  ¡Hola, {customerData.nombre || 'Diego'}! 👋
                </h1>
                <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                  ¿Qué se te antoja hoy?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Notificaciones con Badge Naranja */}
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-[#222226] border border-zinc-700/60 flex items-center justify-center relative text-slate-200 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span
                  style={{ backgroundColor: cp }}
                  className="absolute top-2 right-2 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center ring-2 ring-[#121214]"
                >
                  2
                </span>
              </button>

              {/* Carrito con Badge Naranja con cantidad */}
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                className="w-10 h-10 rounded-full bg-[#222226] border border-zinc-700/60 flex items-center justify-center relative text-slate-200 hover:text-white transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItemsCount > 0 && (
                  <span
                    style={{ backgroundColor: cp }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-lg"
                  >
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── 2. SELECTOR DE DIRECCIÓN OSCURO ── */}
          <button
            type="button"
            onClick={() => setShowChannelModal(true)}
            className="w-full bg-[#1c1c20] hover:bg-[#242429] border border-zinc-800/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-200 transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{ backgroundColor: cp }}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md"
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider leading-tight">
                  {deliveryType === 'DOMICILIO' ? 'Enviar a' : deliveryType === 'MESA' ? 'Consumo en' : 'Retiro en'}
                </span>
                <span className="font-bold text-white text-xs truncate block leading-tight">
                  {deliveryType === 'DOMICILIO'
                    ? (customerData.direccion || negocio?.direccion || 'Av. Amazonas N34-451 y Japón')
                    : deliveryType === 'MESA'
                    ? (customerData.tableName ? `Mesa ${customerData.tableName}` : 'Mesa Principal')
                    : (negocio?.nombre || 'Retiro en Local')}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* ── 3. BUSCADOR BLANCO CON FILTROS ── */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar platos, combos, bebidas..."
              className="w-full bg-white text-slate-900 pl-10 pr-10 py-3 rounded-xl text-xs font-semibold placeholder-slate-400 shadow-sm focus:outline-none"
            />
            <button
              type="button"
              className="absolute right-3.5 text-slate-400 hover:text-slate-700"
              onClick={() => setSearchQuery('')}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: searchQuery ? cp : undefined }} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-6">
        {/* ── 4. BANNER PRINCIPAL / HERO (IMAGEN GIGANTE Y CIENTO POR CIENTO FIEL AL MOCKUP) ── */}
        <div
          style={{ backgroundColor: '#121214' }}
          className="relative rounded-3xl overflow-hidden text-white shadow-2xl border border-zinc-800/80 min-h-[260px] sm:min-h-[290px] flex items-center transition-all duration-500"
        >
          {/* Imagen gigante ocupando el lado derecho de borde a borde */}
          <div className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[60%] h-full z-0 overflow-hidden">
            <img
              key={activeSlide.id}
              src={activeSlide.image}
              alt={activeSlide.titleText || 'Hero Banner'}
              className="w-full h-full object-cover object-center brightness-105 contrast-105 saturate-105 animate-in fade-in duration-500"
            />
            {/* Degradado transparente suave en el borde izquierdo para legibilidad del texto */}
            <div className="absolute inset-y-0 left-0 w-28 sm:w-40 bg-gradient-to-r from-[#121214] via-[#121214]/50 to-transparent" />
          </div>

          {/* Insignia Circular Flotante Naranja con el Precio DESDE $6.99 */}
          {activeSlide.price > 0 && (
            <div
              style={{ backgroundColor: cp }}
              className="absolute top-4 left-[48%] sm:left-[45%] z-20 w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shadow-2xl border-2 border-[#121214] text-center font-extrabold rotate-3"
            >
              <span className="text-[8px] tracking-wider leading-none uppercase text-amber-100 font-black">DESDE</span>
              <span className="text-xs font-black leading-tight">${activeSlide.price.toFixed(2)}</span>
            </div>
          )}

          {/* Contenido Izquierdo: ESPECIAL DE LA CASA, Nombre Grande, Descripción y Botón Pedir Ahora */}
          <div className="relative z-10 w-[60%] sm:w-[52%] p-5 sm:p-7 space-y-2">
            {activeSlide.badgeText && (
              <span
                style={{ color: cp }}
                className="text-[10px] font-black tracking-widest uppercase block mb-0.5"
              >
                {activeSlide.badgeText}
              </span>
            )}

            {activeSlide.titleText && (
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white uppercase pt-0.5 drop-shadow-md">
                {activeSlide.titleText.includes(' ') ? (
                  <>
                    {activeSlide.titleText.split(' ')[0]} <br />
                    <span style={{ color: cp }} className="font-serif italic font-normal normal-case text-2xl sm:text-3xl">
                      {activeSlide.titleText.split(' ').slice(1).join(' ')}
                    </span>
                  </>
                ) : (
                  activeSlide.titleText
                )}
              </h2>
            )}

            {activeSlide.descText && (
              <p className="text-[11px] text-slate-300 font-normal leading-relaxed line-clamp-3 max-w-[230px] pt-1">
                {activeSlide.descText}
              </p>
            )}

            {/* Botón Pedir ahora → */}
            {activeSlide.isButtonEnabled && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleHeroButtonClick(activeSlide)}
                  style={{ backgroundColor: cp }}
                  className="px-5 py-2.5 rounded-full text-xs font-black text-white shadow-xl flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                >
                  <span>{activeSlide.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Indicadores de Páginas (Carrusel Dots) */}
          {displayHeroSlides.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {displayHeroSlides.map((s, idx) => {
                const isActive = idx === currentSlideIndex % displayHeroSlides.length;
                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    style={{ backgroundColor: isActive ? cp : undefined }}
                    className={`transition-all duration-300 ${
                      isActive ? 'w-6 h-2 rounded-full shadow-sm' : 'w-2 h-2 rounded-full bg-white/40 hover:bg-white/70'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── 5. CATEGORÍAS HORIZONTALES (TARJETAS BLANCAS CON SCROLL HORIZONTAL) ── */}
        <div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              className={`px-4 py-3.5 rounded-2xl border flex flex-col items-center justify-center min-w-[90px] shrink-0 transition-all shadow-xs ${
                selectedCategory === 'TODOS'
                  ? 'bg-white shadow-md border-2'
                  : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
              style={{
                borderColor: selectedCategory === 'TODOS' ? cp : undefined,
                color: selectedCategory === 'TODOS' ? cp : undefined
              }}
            >
              <span className="text-2xl mb-1">🍔</span>
              <span className="text-xs font-extrabold whitespace-nowrap">Hamburguesas</span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id || selectedCategory === cat.nombre;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-3.5 rounded-2xl border flex flex-col items-center justify-center min-w-[90px] shrink-0 transition-all shadow-xs ${
                    isActive
                      ? 'bg-white shadow-md border-2'
                      : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                  }`}
                  style={{
                    borderColor: isActive ? cp : undefined,
                    color: isActive ? cp : undefined
                  }}
                >
                  <span className="text-2xl mb-1">{cat.icono || '🍲'}</span>
                  <span className="text-xs font-extrabold whitespace-nowrap">{cat.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 6. BLOQUE DE BENEFICIOS (TARJETA HORIZONTAL CON 3 COLUMNAS) ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 grid grid-cols-3 divide-x divide-slate-100 text-center text-xs">
          <div className="flex flex-col items-center justify-center px-1">
            <div style={{ color: cp }} className="p-1.5 rounded-full bg-orange-50 mb-1">
              <Truck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-slate-900 block leading-tight text-[11px]">Envío rápido</span>
            <span className="text-[9px] text-slate-400">30-45 min</span>
          </div>

          <div className="flex flex-col items-center justify-center px-1">
            <div style={{ color: cp }} className="p-1.5 rounded-full bg-orange-50 mb-1">
              <Percent className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-slate-900 block leading-tight text-[11px]">Promociones</span>
            <span className="text-[9px] text-slate-400">Todos los días</span>
          </div>

          <div className="flex flex-col items-center justify-center px-1">
            <div style={{ color: cp }} className="p-1.5 rounded-full bg-orange-50 mb-1">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-slate-900 block leading-tight text-[11px]">Pago seguro</span>
            <span className="text-[9px] text-slate-400">100% protegido</span>
          </div>
        </div>

        {/* ── 7. SECCIÓN "RECOMENDADOS PARA TI" CON TARJETAS DE PRODUCTOS ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Recomendados para ti
            </h3>
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              style={{ color: cp }}
              className="text-xs font-extrabold flex items-center gap-0.5 hover:underline"
            >
              <span>Ver todo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 p-6 space-y-2">
              <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No encontramos platillos disponibles</h4>
              <p className="text-xs text-slate-400">Intenta buscar otro término o seleccionar otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredProducts.map((prod) => {
                const qtyInCart = getItemQuantity(prod.id);
                const isFav = !!favorites[prod.id];

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    {/* Imagen del Producto (Proporción 4:3) + Icono Corazón Arriba a la Derecha */}
                    <div className="relative w-full h-36 bg-slate-100 overflow-hidden">
                      {prod.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                      )}

                      {/* Icono Corazón Favorito */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(prod.id, e)}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-950/40 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={isFav ? '#ef4444' : 'transparent'}
                          color={isFav ? '#ef4444' : '#ffffff'}
                        />
                      </button>
                    </div>

                    {/* Contenido del Producto: Nombre, Descripción, Precio Naranja y Botón + */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs leading-snug line-clamp-1">
                          {prod.nombre}
                        </h4>
                        {prod.descripcion && (
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 font-normal leading-normal">
                            {prod.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Pie de tarjeta: Precio Naranja & Botón + Naranja */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-1">
                        <span style={{ color: cp }} className="font-extrabold text-sm">
                          ${(Number(prod.precio) || 0).toFixed(2)}
                        </span>

                        {qtyInCart > 0 ? (
                          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => decrementQuantity(prod.id)}
                              className="w-5 h-5 rounded-lg bg-white text-slate-700 font-bold text-xs flex items-center justify-center shadow-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-extrabold text-slate-900 px-1">{qtyInCart}</span>
                            <button
                              type="button"
                              onClick={() => addToCart({
                                id: prod.id,
                                nombre: prod.nombre,
                                precio: prod.precio,
                                imagenUrl: prod.imagenUrl
                              })}
                              style={{ backgroundColor: cp }}
                              className="w-5 h-5 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
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
                            style={{ backgroundColor: cp }}
                            className="w-7 h-7 rounded-xl text-white flex items-center justify-center font-extrabold shadow-md hover:opacity-90 active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
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

        {/* ── 8. BANNER PROMOCIONAL OSCURO (¡ENVÍO GRATIS!) ── */}
        <div
          style={{ backgroundColor: '#121214' }}
          className="rounded-2xl p-4 text-white shadow-xl flex items-center justify-between relative overflow-hidden border border-zinc-800"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div
              style={{ backgroundColor: cp }}
              className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-black text-center shadow-lg rotate-[-4deg] shrink-0"
            >
              <span className="text-[8px] leading-tight">GRATIS</span>
              <Truck className="w-5 h-5 mt-0.5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm tracking-wide uppercase leading-tight text-white">
                ¡ENVÍO GRATIS!
              </h4>
              <p style={{ color: cp }} className="text-xs font-bold mt-0.5">
                Por compras desde $15
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <div
              style={{ backgroundColor: `${cp}20`, color: cp, borderColor: `${cp}40` }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-black border flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Aplica automático</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── BARRA FLOTANTE DEL CARRITO SI HAY PRODUCTOS AGREGADOS ── */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 max-w-md mx-auto pointer-events-none">
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            style={{ backgroundColor: cp }}
            className="pointer-events-auto w-full py-3.5 px-5 rounded-2xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-2xl hover:opacity-95 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Ver mi pedido ({totalItemsCount})</span>
            </div>
            <span className="text-sm font-black">${total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── 9. NAVEGACIÓN INFERIOR FIJA DE 5 OPCIONES (REEMPLAZO COMPLETO) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-4 flex justify-around items-center z-50 shadow-lg max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveNavTab('inicio')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'inicio' ? cp : '#64748b' }}
        >
          <Home className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('categorias')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'categorias' ? cp : '#64748b' }}
        >
          <Grid className="w-5 h-5" />
          <span>Categorías</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('ofertas')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'ofertas' ? cp : '#64748b' }}
        >
          <Tag className="w-5 h-5" />
          <span>Ofertas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveNavTab('pedidos');
            setShowCartDrawer(true);
          }}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'pedidos' ? cp : '#64748b' }}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Mis pedidos</span>
        </button>

        <Link
          href={`/${negocio?.slug || ''}/perfil`}
          onClick={() => setActiveNavTab('cuenta')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors no-underline"
          style={{ color: activeNavTab === 'cuenta' ? cp : '#64748b' }}
        >
          <User className="w-5 h-5" />
          <span>Mi cuenta</span>
        </Link>
      </nav>

      {/* ── MODAL CANAL DE ATENCIÓN DE PEDIDO (DOMICILIO / MESA / RETIRO) ── */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-base text-slate-900">¿Cómo deseas tu pedido?</h4>
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeliveryType('DOMICILIO');
                  setShowChannelModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  deliveryType === 'DOMICILIO'
                    ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div style={{ backgroundColor: cp }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-extrabold text-sm">Delivery a Domicilio</span>
                  <span className="text-[11px] text-slate-400 font-normal">Entregas rápidas a tu ubicación</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType('MESA');
                  setShowChannelModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  deliveryType === 'MESA'
                    ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div style={{ backgroundColor: cp }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-extrabold text-sm">Pedir a la Mesa</span>
                  <span className="text-[11px] text-slate-400 font-normal">Consumo directo en el local</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType('RETIRO');
                  setShowChannelModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  deliveryType === 'RETIRO'
                    ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div style={{ backgroundColor: cp }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-extrabold text-sm">Para Llevar / Retiro</span>
                  <span className="text-[11px] text-slate-400 font-normal">Pasa a retirar por el local</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER LATERAL DE CHECKOUT CITIOX ── */}
      <CustomerCartDrawer
        slug={negocio?.slug || ''}
        businessName={negocio?.nombre || 'Restaurante'}
        primaryColor={cp}
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
      />
    </div>
  );
}
