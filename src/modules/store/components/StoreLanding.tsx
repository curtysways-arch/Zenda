'use client';

/**
 * @file StoreLanding.tsx
 * @module modules/store/components
 * @description Landing pública dedicada a la vertical TIENDA / E-COMMERCE en Citiox.
 * @responsibility Proveer la experiencia de e-commerce moderna, rápida y responsive para tiendas de retail, ropa, tecnología y comercio general.
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag, Search, Tag, Filter, MapPin, Truck, Store as StoreIcon,
  Phone, MessageSquare, ChevronRight, Check, X, Flame, Sparkles, ShieldCheck, Clock,
  Bell, Heart, Star, SlidersHorizontal, CheckCircle2, Home, Box, Gift, User, RefreshCw
} from 'lucide-react';
import { CartProvider, useCart, CartProduct } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import UniversalHeroCarousel from '@/components/public/UniversalHeroCarousel';
import ProductVariantModal, { DetailedProduct } from '@/components/public/ProductVariantModal';

interface Category {
  id: string;
  nombre: string;
  activo?: boolean;
}

export default function StoreLanding({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
}: {
  negocio: any;
  initialProducts?: DetailedProduct[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: any[]; highlights: any[] };
}) {
  const defaultDeliveryCost = Number((negocio?.configuracion as any)?.costoEnvio) || 2.50;

  return (
    <CartProvider businessId={negocio?.id || 'demo'} defaultDeliveryCost={defaultDeliveryCost}>
      <StoreLandingContent
        negocio={negocio}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialHeroContent={initialHeroContent}
      />
    </CartProvider>
  );
}

function StoreLandingContent({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
}: {
  negocio: any;
  initialProducts?: DetailedProduct[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: any[]; highlights: any[] };
}) {
  const primaryColor = negocio?.colorPrimario || '#06b6d4';
  const secondaryColor = negocio?.colorSecundario || '#0f172a';

  const { totalItemsCount, customerData, deliveryType, setDeliveryType, isCartOpen, setIsCartOpen } = useCart();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<DetailedProduct | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  // Navegación por Pestañas (Inicio, Ofertas, Mis Pedidos, Mi Cuenta)
  const [activeTab, setActiveTab] = useState<'inicio' | 'ofertas' | 'pedidos' | 'cuenta'>('inicio');
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  React.useEffect(() => {
    try {
      const phone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || '';
      const name = localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name') || '';
      const addr = localStorage.getItem('pinchos_client_address') || '';
      const ref = localStorage.getItem('pinchos_client_reference') || '';
      if (phone) setClientPhone(phone);
      if (name) setClientName(name);
      if (addr) setClientAddress(addr);
      if (ref) setClientReference(ref);
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    const updateTab = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');

      if (hash === 'ofertas' || tabParam === 'ofertas') setActiveTab('ofertas');
      else if (hash === 'pedidos' || tabParam === 'pedidos') setActiveTab('pedidos');
      else if (hash === 'cuenta' || hash === 'perfil' || tabParam === 'cuenta' || tabParam === 'perfil') setActiveTab('cuenta');
      else setActiveTab('inicio');
    };

    updateTab();

    const handleCustomTab = (e: any) => {
      if (e.detail) {
        if (e.detail === 'ofertas') setActiveTab('ofertas');
        else if (e.detail === 'pedidos') setActiveTab('pedidos');
        else if (e.detail === 'cuenta' || e.detail === 'perfil') setActiveTab('cuenta');
        else if (e.detail === 'inicio') setActiveTab('inicio');
      }
    };

    window.addEventListener('hashchange', updateTab);
    window.addEventListener('citiox_change_tab', handleCustomTab);
    return () => {
      window.removeEventListener('hashchange', updateTab);
      window.removeEventListener('citiox_change_tab', handleCustomTab);
    };
  }, []);

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      if (!product.activo) return false;

      // Filtro por categoría
      if (selectedCategoryId && product.categoriaId !== selectedCategoryId) {
        return false;
      }

      // Filtro por búsqueda (Nombre, descripción o SKU)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = product.nombre.toLowerCase().includes(q);
        const matchDesc = product.descripcion?.toLowerCase().includes(q);
        const matchSku = product.sku?.toLowerCase().includes(q);
        return matchName || matchDesc || matchSku;
      }

      return true;
    });
  }, [initialProducts, selectedCategoryId, searchQuery]);

  // Promociones y Combos de Alto Impacto
  const displayPromos = useMemo(() => {
    const highlights = initialHeroContent?.highlights || [];
    
    // Si hay promociones creadas en la base de datos
    if (highlights.length > 0) {
      return highlights.map((h: any, idx: number) => ({
        id: h.id || `promo-hl-${idx}`,
        titulo: h.titulo || h.nombre || 'Combo Especial',
        descripcion: h.descripcion || 'Aprovecha esta súper oferta exclusiva por tiempo limitado.',
        badge: h.badge || (idx % 2 === 0 ? '🎁 2x1 COMBO' : '⚡ 30% OFF'),
        precioPromo: Number(h.precioPromo || h.precio) || 29.99,
        precioAnterior: Number(h.precioAnterior || (Number(h.precioPromo || 29.99) * 1.35).toFixed(2)),
        imagenUrl: h.imagenUrl || initialProducts[idx % initialProducts.length]?.imagenUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        productToOpen: initialProducts.find((p) => p.id === h.productoId) || initialProducts[idx % initialProducts.length]
      }));
    }

    // Fallback dinámico de combos llamativos con productos de la tienda
    if (initialProducts.length === 0) return [];

    return initialProducts.slice(0, 4).map((p, idx) => {
      const badges = ['🔥 2x1 COMBO', '⚡ 35% OFF', '🎁 PACK ESPECIAL', '⭐ MÁS VENDIDO'];
      const titles = [`Combo ${p.nombre}`, `Super Pack ${p.nombre}`, `Oferta Especial ${p.nombre}`, `Duo Pack Premium`];
      const discountPrice = (Number(p.precio) * 0.8).toFixed(2);
      return {
        id: `dynamic-promo-${p.id}`,
        titulo: titles[idx % titles.length],
        descripcion: p.descripcion || `Pack exclusivo con descuento de temporada. ¡Aprovecha antes de que se agote!`,
        badge: badges[idx % badges.length],
        precioPromo: Number(discountPrice),
        precioAnterior: Number(p.precio),
        imagenUrl: p.imagenUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        productToOpen: p
      };
    });
  }, [initialHeroContent, initialProducts]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans pb-28 sm:pb-12">
      {/* ── 1. TOP HEADER & NAVIGATION (Pixel Perfect con Captura) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo y Nombre con Insignia Verificada */}
          <div className="flex items-center gap-3 min-w-0">
            {negocio?.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombre}
                className="w-11 h-11 rounded-full object-cover border border-slate-200/80 shadow-2xs shrink-0 p-0.5 bg-white"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full text-white font-black flex items-center justify-center text-lg shrink-0 shadow-xs border-2 border-white"
                style={{ backgroundColor: primaryColor }}
              >
                C
              </div>
            )}
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight line-clamp-1">
                  {negocio?.nombre || 'Citiox Urban Store'}
                </h1>
                <CheckCircle2 className="w-4 h-4 text-cyan-500 fill-cyan-500 text-white shrink-0" />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 line-clamp-1">
                E-Commerce Oficial
              </p>
            </div>
          </div>

          {/* Acciones Header: Notificaciones & Carrito */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Notificaciones Bell */}
            <button
              type="button"
              onClick={() => alert("No tienes notificaciones pendientes.")}
              className="relative p-2.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-cyan-500"></span>
            </button>

            {/* Botón Carrito con Badge Cyan */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 sm:px-4 sm:py-2 rounded-2xl font-black text-xs text-slate-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-cyan-600" />
              <span className="hidden sm:inline font-extrabold text-cyan-900">Carrito</span>
              {totalItemsCount > 0 && (
                <span className="size-5 rounded-full bg-cyan-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── VISTA 1: OFERTAS ── */}
      {activeTab === 'ofertas' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-100 backdrop-blur-md">
                🔥 Promociones & Descuentos
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-2">Ofertas Especiales</h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium">Aprovecha los mejores precios y promociones exclusivas</p>
            </div>
            <button
              onClick={() => { window.location.hash = ''; setActiveTab('inicio'); }}
              className="px-4 py-2.5 bg-white text-slate-900 font-extrabold text-xs rounded-xl shadow-lg hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
            >
              Ver Todo el Catálogo →
            </button>
          </div>

          <div className="mt-8 bg-white border-2 border-dashed border-amber-200 p-8 rounded-3xl text-center space-y-3">
            <div className="size-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <Flame className="w-7 h-7 animate-bounce" />
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase">Ofertas Exclusivas de la Tienda</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              ¡Disfruta de nuestros mejores precios directos en todo el catálogo de productos!
            </p>
            <button
              onClick={() => { window.location.hash = ''; setActiveTab('inicio'); }}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              Ver Productos Destacados
            </button>
          </div>
        </section>
      )}

      {/* ── VISTA 2: MIS PEDIDOS ── */}
      {activeTab === 'pedidos' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 animate-fadeIn space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                📦 Mis Pedidos & Rastreo
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-2">Seguimiento de Compras</h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">Consulta el estado de tus pedidos recientes y entregas</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Tus Datos de Cliente</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ingresa tu número de WhatsApp o Teléfono"
                className="w-full sm:flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
              />
              <button
                onClick={() => {
                  if (clientPhone) {
                    localStorage.setItem('pinchos_client_phone', clientPhone);
                    alert(`Buscando pedidos registrados para el número ${clientPhone}...`);
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md cursor-pointer transition-all shrink-0"
              >
                Buscar Mis Pedidos
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center space-y-3">
            <div className="size-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase">Sin Pedidos Pendientes</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Al realizar una compra en la tienda podrás hacerle seguimiento en tiempo real desde este panel.
            </p>
            <button
              onClick={() => { window.location.hash = ''; setActiveTab('inicio'); }}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              Realizar una Compra
            </button>
          </div>
        </section>
      )}

      {/* ── VISTA 3: MI CUENTA ── */}
      {activeTab === 'cuenta' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 animate-fadeIn space-y-6">
          <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/30">
                👤 Mi Cuenta & Perfil
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-2">Datos de Envío y Cliente</h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">Guarda tu información para compras 1-clic rápidas</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Información Personal Guardada</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ej. Carlos Caicedo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="ej. 0998877665"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Dirección Habitual de Entrega</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="ej. Av. 10 de Agosto N24-12"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Referencia de Domicilio (opcional)</label>
                <input
                  type="text"
                  value={clientReference}
                  onChange={(e) => setClientReference(e.target.value)}
                  placeholder="ej. Frente a la farmacia o conjunto residencial"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (clientName) localStorage.setItem('pinchos_client_name', clientName);
                  if (clientPhone) localStorage.setItem('pinchos_client_phone', clientPhone);
                  if (clientAddress) localStorage.setItem('pinchos_client_address', clientAddress);
                  if (clientReference) localStorage.setItem('pinchos_client_reference', clientReference);
                  alert("¡Tus datos de cuenta han sido guardados con éxito!");
                }}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                💾 Guardar Mis Datos
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── VISTA 0: INICIO ── */}
      {activeTab === 'inicio' && (
        <>
      {/* ── 2. HERO CAROUSEL UNIVERSAL ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4">
        <UniversalHeroCarousel
          heroItems={initialHeroContent?.hero || []}
          negocio={negocio}
          isOpenNow={true}
        />
      </section>

      {/* ── 3. SECCIÓN DE PROMOCIONES & COMBOS (DISEÑO ÚNICO, LLAMATIVO Y DE ALTO IMPACTO) ── */}
      {displayPromos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-200 animate-pulse" /> OFERTAS IMPERDIBLES
              </span>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                Promociones & Combos 🔥
              </h3>
            </div>
            <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" /> Tiempo Limitado
            </span>
          </div>

          {/* Carrusel Horizontal de Promociones */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {displayPromos.map((promo: any) => (
              <div
                key={promo.id}
                onClick={() => promo.productToOpen && setSelectedProductForModal(promo.productToOpen)}
                className="min-w-[260px] max-w-[280px] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-amber-400/40 rounded-3xl p-3 shadow-md space-y-2.5 shrink-0 flex flex-col justify-between group hover:border-amber-400 hover:shadow-amber-500/20 transition-all cursor-pointer relative overflow-hidden text-left"
              >
                {/* Ambient Glow sutil dentro de la card */}
                <div className="absolute top-0 right-0 size-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="space-y-2">
                  {/* Foto de la Promo con Badge Flotante */}
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-slate-900">
                    <img
                      src={promo.imagenUrl}
                      alt={promo.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2 left-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-[9px] uppercase tracking-wider shadow-md border border-white/20">
                      {promo.badge}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/80 text-amber-300 font-extrabold text-[9px] backdrop-blur-md">
                      ⏱️ 12h restantes
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-white text-xs sm:text-sm leading-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {promo.titulo}
                    </h4>
                    <p className="text-slate-300 text-[10px] font-medium leading-snug line-clamp-2 mt-0.5">
                      {promo.descripcion}
                    </p>
                  </div>
                </div>

                {/* Micro Barra de Stock / Urgencia */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-extrabold">
                    <span className="text-amber-400 uppercase">⚡ ¡Quedan pocas unidades!</span>
                    <span className="text-slate-400">85% vendido</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 w-[85%] rounded-full"></div>
                  </div>
                </div>

                {/* Precios & Acción */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-sm sm:text-base font-black text-emerald-400 block leading-tight">
                      ${Number(promo.precioPromo).toFixed(2)}
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
                      if (promo.productToOpen) setSelectedProductForModal(promo.productToOpen);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-[10px] uppercase rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3 h-3 text-slate-950" />
                    <span>Pedir Promo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. BUSCADOR & BOTÓN FILTRAR & CATEGORÍAS (COMPACTO) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-2.5 space-y-2">
        {/* Buscador + Botón Filtrar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por producto, descripción o SKU..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100/80 border border-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-300 shadow-2xs transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
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
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3.5 py-2 rounded-2xl font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
              selectedCategoryId === null
                ? 'bg-cyan-500 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Todos ({initialProducts.length})</span>
          </button>

          {initialCategories.map((cat, idx) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = initialProducts.filter((p) => p.categoriaId === cat.id && p.activo).length;

            const icons = [Tag, ShoppingBag, Gift, Sparkles];
            const CatIcon = icons[idx % icons.length];

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className={`px-3.5 py-2 rounded-2xl font-extrabold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
                  isSelected
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'
                }`}
              >
                <CatIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{cat.nombre} ({count})</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 5. SECCIÓN PRODUCTOS DESTACADOS ── */}
      <section id="productos" className="max-w-7xl mx-auto px-4 sm:px-6 mt-3">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 tracking-tight">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>
              {selectedCategoryId
                ? initialCategories.find((c) => c.id === selectedCategoryId)?.nombre
                : 'Productos destacados'}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className="text-[11px] font-extrabold text-cyan-600 hover:text-cyan-700 cursor-pointer"
          >
            Ver todo
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs max-w-md mx-auto my-8">
            <span className="text-5xl block mb-3">🔎</span>
            <h3 className="font-extrabold text-slate-900 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Intenta con otra palabra clave o limpia el filtro de categorías.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId(null);
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200 cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCardItem
                key={product.id}
                product={product}
                primaryColor={primaryColor}
                onSelectOptions={() => setSelectedProductForModal(product)}
                isFavorite={!!favorites[product.id]}
                onToggleFavorite={(e) => toggleFavorite(product.id, e)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 6. PIE DE PÁGINA E INFORMACIÓN DEL NEGOCIO ── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Comprando en línea seguro con Citiox E-Commerce</span>
        </div>
        {negocio?.whatsapp && (
          <a
            href={`https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
          >
            <MessageSquare className="w-4 h-4" /> Contactar por WhatsApp
          </a>
        )}
      </footer>
      </>
      )}

      {/* ── 7. BARRA NAVEGACIÓN INFERIOR FLOTANTE (SE OCULTA CUANDO EL MODAL DE PRODUCTO ESTÁ ABIERTO) ── */}
      {!selectedProductForModal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-150 py-2 px-3 flex items-center justify-around shadow-2xl animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'inicio' ? 'text-cyan-600 font-black' : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pedidos')}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'pedidos' ? 'text-cyan-600 font-black' : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <Box className="w-5 h-5" />
            <span className="text-[10px]">Mis pedidos</span>
          </button>

          {/* Botón Central Destacado Catálogo */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('inicio');
              const el = document.getElementById('productos');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="size-13 rounded-full bg-cyan-950 text-cyan-400 border-4 border-white shadow-xl flex items-center justify-center -mt-6 active:scale-95 transition-transform cursor-pointer"
            title="Ver Catálogo"
          >
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ofertas')}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'ofertas' ? 'text-cyan-600 font-black' : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <Gift className="w-5 h-5" />
            <span className="text-[10px]">Premios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cuenta')}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'cuenta' ? 'text-cyan-600 font-black' : 'text-slate-400 hover:text-slate-600 font-semibold'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Perfil</span>
          </button>
        </div>
      )}

      {/* ── 7. MODALES (VARIANTES, CARRITO & MAPA) ── */}
      <ProductVariantModal
        product={selectedProductForModal}
        isOpen={!!selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        primaryColor={primaryColor}
      />

      <CustomerCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        primaryColor={primaryColor}
        slug={negocio?.slug || ''}
        businessName={negocio?.nombre || 'Tienda'}
      />

      <MapSelectionModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={(lat, lng, address) => {
          setIsMapModalOpen(false);
        }}
      />
    </div>
  );
}

/**
 * Tarjeta individual de producto para StoreLanding (Pixel Perfect con Captura)
 */
function ProductCardItem({
  product,
  primaryColor,
  onSelectOptions,
  isFavorite,
  onToggleFavorite,
}: {
  product: DetailedProduct;
  primaryColor: string;
  onSelectOptions: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const { getItemQuantity } = useCart();

  const activeVariants = (product.variantes || []).filter((v) => v.activo);
  const hasVariants = product.tieneVariantes || activeVariants.length > 0;
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;

  const currentInCart = getItemQuantity(product.id);
  const fakeRating = (4.7 + (product.nombre.length % 3) * 0.1).toFixed(1);

  return (
    <div
      onClick={onSelectOptions}
      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer text-left shadow-2xs"
    >
      {/* Imagen del Producto (Sin Margen en Recuadro Completo) */}
      <div className="relative w-full aspect-[4/5] bg-slate-100 overflow-hidden flex items-center justify-center p-0">
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-4xl">🛍️</span>
        )}

        {/* Badges superiores izquierda (NUEVO / DESCUENTO / AGOTADO) */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-rose-600 text-white shadow-xs uppercase tracking-wider">
              Agotado
            </span>
          ) : hasVariants ? (
            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-cyan-500 text-white shadow-xs uppercase tracking-wider">
              -20%
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-slate-950 text-white shadow-xs uppercase tracking-wider">
              NUEVO
            </span>
          )}
        </div>

        {/* Botón Favorito (Corazón superior derecha) */}
        <button
          type="button"
          onClick={onToggleFavorite}
          className="absolute top-3 right-3 z-20 size-8 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
        >
          <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>

        {currentInCart > 0 && (
          <span
            className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-md animate-pulse"
            style={{ backgroundColor: primaryColor }}
          >
            {currentInCart} en carrito
          </span>
        )}
      </div>

      {/* Info del Producto (Título, Precio y Rating) */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-1 leading-snug group-hover:text-cyan-600 transition-colors">
            {product.nombre}
          </h3>
        </div>

        {/* Precio & Rating (Idéntico a la Captura) */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-slate-900">
              ${(Number(product.precio) || 0).toFixed(2)}
            </span>
            {hasVariants && (
              <span className="text-[10px] font-bold text-slate-400 line-through">
                ${((Number(product.precio) || 0) * 1.25).toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-black text-slate-500 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{fakeRating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
