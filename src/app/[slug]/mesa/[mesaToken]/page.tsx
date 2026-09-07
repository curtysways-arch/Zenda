'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Utensils, ShoppingBag, MapPin, Bell, Loader2, CheckCircle2, AlertCircle,
  XCircle, ChevronRight, Compass, ShieldCheck, Flame, Search, ArrowRight,
  Plus, Minus, Heart, Eye, Check, X, CreditCard, Clock, Phone, User, Tag,
  Percent, Sparkles, AlertTriangle
} from 'lucide-react';
import { CartProvider, useCart } from '@/core/context/CartContext';
import ItemDetailModal, { DetailItem, cleanDescriptionText } from '@/components/public/ItemDetailModal';
import ProductVariantModal, { DetailedProduct } from '@/components/public/ProductVariantModal';

// Componente Exportado Principal envuelto con CartProvider
export default function PublicMesaPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'tienda';
  const mesaToken = (params?.mesaToken as string) || '';

  return (
    <CartProvider businessId={slug} defaultDeliveryCost={0}>
      <PublicMesaContent slug={slug} mesaToken={mesaToken} />
    </CartProvider>
  );
}

function PublicMesaContent({ slug, mesaToken }: { slug: string; mesaToken: string }) {
  const router = useRouter();

  const {
    cart,
    subtotal,
    total,
    totalItemsCount,
    getItemQuantity,
    addToCart,
    decrementQuantity,
    clearCart,
    setDeliveryType
  } = useCart();

  // Estados de Datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negocio, setNegocio] = useState<any>(null);
  const [mesa, setMesa] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [tableSessionId, setTableSessionId] = useState<string>('');

  // Productos, Categorías y Banners
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);

  // Filtros de Menú
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Carrusel Hero Banner
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Modales de Detalle
  const [selectedDetailItem, setSelectedDetailItem] = useState<DetailItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState<DetailedProduct | null>(null);
  const [showVariantModal, setShowVariantModal] = useState<boolean>(false);

  // Modal y Opciones de Llamar al Mesero
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [waiterToast, setWaiterToast] = useState<string | null>(null);

  // Modal y Drawer de Pedido en Mesa
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [requestingOrder, setRequestingOrder] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null); // null | 'REQUESTING_GPS' | 'VALIDATING' | 'SUCCESS' | 'ERROR'
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<number | null>(null);

  // Datos del Cliente en Mesa
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notasPedido, setNotasPedido] = useState('');

  // Configuración de Colores de Marca
  const cp = negocio?.colorPrimario || '#ff5500';
  const cs = negocio?.colorSecundario || '#0f172a';
  const cn = negocio?.colorFondo || '#ffffff';

  // Inicializar Sesión y Tipo de Entrega MESA
  useEffect(() => {
    let sessId = localStorage.getItem('citiox_table_session');
    if (!sessId) {
      sessId = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      localStorage.setItem('citiox_table_session', sessId);
    }
    setTableSessionId(sessId);
    localStorage.setItem('citiox_table_token', mesaToken);
    localStorage.setItem('citiox_table_slug', slug);

    // Cargar datos previos de cliente si existen
    const savedName = localStorage.getItem('citiox_customer_name');
    if (savedName) setClienteNombre(savedName);
    const savedPhone = localStorage.getItem('citiox_customer_phone');
    if (savedPhone) setClienteTelefono(savedPhone);

    setDeliveryType('MESA');
  }, [mesaToken, slug, setDeliveryType]);

  // Cargar Mesa, Negocio, Catálogo y Banners
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const resMesa = await fetch(`/api/public/${slug}/mesa/${mesaToken}`);
        const dataMesa = await resMesa.json();

        if (!resMesa.ok) {
          setError(dataMesa.error || 'La mesa solicitada no existe o no se encuentra disponible.');
          setLoading(false);
          return;
        }

        setNegocio(dataMesa.negocio);
        setMesa(dataMesa.mesa);
        setConfig(dataMesa.config || {});
        setCategories(dataMesa.categories || []);
        setProducts(dataMesa.products || []);

        const landingContent = dataMesa.landingContent || {};
        setHeroSlides(landingContent.hero || []);
        setHighlights(landingContent.highlights || []);
      } catch (err) {
        console.error('Error al cargar la mesa:', err);
        setError('Error de conexión al cargar el menú de la mesa.');
      } finally {
        setLoading(false);
      }
    }

    if (slug && mesaToken) loadData();
  }, [slug, mesaToken]);

  // Temporizador de Cooldown para Llamar al Mesero
  useEffect(() => {
    if (waiterCooldown <= 0) return;
    const t = setInterval(() => setWaiterCooldown(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [waiterCooldown]);

  // Rotación Automática de Banners cada 5 segundos
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Handler para Llamar Mesero o Pedir Cuenta
  const handleCallWaiter = async (tipo: 'MESERO' | 'CUENTA') => {
    if (waiterCooldown > 0 || callingWaiter) return;

    setCallingWaiter(true);
    setWaiterToast(null);
    setShowWaiterModal(false);

    const notaAlerta = tipo === 'CUENTA'
      ? 'Cliente solicita la cuenta en mesa'
      : 'Cliente solicita atención del mesero en mesa';

    try {
      const res = await fetch(`/api/public/${slug}/mesa/${mesaToken}/waiter-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableSessionId,
          notas: notaAlerta
        })
      });

      const data = await res.json();
      if (res.ok) {
        const msg = tipo === 'CUENTA'
          ? '💳 ¡Cuenta solicitada! El mesero se acerca con tu cuenta.'
          : '🔔 ¡Mesero notificado! En breve se acercarán a tu mesa.';
        setWaiterToast(msg);
        setWaiterCooldown(config.mesaCooldownLlamada || 120);
        setTimeout(() => setWaiterToast(null), 5000);
      } else {
        if (data.cooldownRemaining) setWaiterCooldown(data.cooldownRemaining);
        alert(data.error || 'No se pudo enviar la alerta al mesero.');
      }
    } catch (_) {
      alert('Error de conexión al llamar al mesero.');
    } finally {
      setCallingWaiter(false);
    }
  };

  // Handler para Procesar Pedido desde Mesa con Geolocalización GPS
  const handleSubmitTableOrder = async () => {
    if (cart.length === 0) return;

    setRequestingOrder(true);
    setGeoStatus('REQUESTING_GPS');
    setGeoErrorMessage(null);

    // Guardar datos del cliente
    if (clienteNombre) localStorage.setItem('citiox_customer_name', clienteNombre);
    if (clienteTelefono) localStorage.setItem('citiox_customer_phone', clienteTelefono);

    const sendOrderPayload = async (coords?: { latitude: number; longitude: number; accuracy?: number }) => {
      setGeoStatus('VALIDATING');
      try {
        const res = await fetch(`/api/public/${slug}/mesa/${mesaToken}/order-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableSessionId,
            nombreCliente: clienteNombre || undefined,
            telefonoCliente: clienteTelefono || undefined,
            items: cart.map(item => ({
              productoId: item.product.id,
              varianteId: (item.product as any).varianteId,
              varianteNombre: (item.product as any).varianteNombre,
              cantidad: item.quantity,
              precioUnitario: item.product.precio,
              nombre: item.product.nombre
            })),
            notas: notasPedido || undefined,
            clientLat: coords?.latitude || null,
            clientLng: coords?.longitude || null,
            accuracy: coords?.accuracy || null
          })
        });

        const data = await res.json();

        if (res.ok) {
          setGeoStatus('SUCCESS');
          setOrderSentSuccess(true);
          setConfirmedOrderNumber(data.orderRequest?.numero || null);
          clearCart();
          setShowOrderDrawer(false);
        } else {
          setGeoStatus('ERROR');
          setGeoErrorMessage(data.error || 'No se pudo enviar la solicitud de pedido.');
        }
      } catch (err) {
        setGeoStatus('ERROR');
        setGeoErrorMessage('Error de conexión al enviar la orden a la cocina.');
      } finally {
        setRequestingOrder(false);
      }
    };

    if (!navigator.geolocation) {
      // Fallback sin geolocalización
      await sendOrderPayload();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        await sendOrderPayload({ latitude, longitude, accuracy });
      },
      async (geoErr) => {
        console.warn('GPS no disponible o denegado, enviando con confirmación de mesa:', geoErr);
        await sendOrderPayload();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Apertura de modal de detalles
  const handleOpenProductDetail = (prod: any) => {
    if (prod.variantes && prod.variantes.length > 0) {
      setSelectedVariantProduct({
        id: prod.id,
        nombre: prod.nombre,
        precio: prod.precio,
        imagenUrl: prod.imagenUrl,
        tieneVariantes: true,
        variantes: prod.variantes
      });
      setShowVariantModal(true);
    } else {
      setSelectedDetailItem({
        id: prod.id,
        title: prod.nombre,
        description: cleanDescriptionText(prod.descripcion),
        price: prod.precio,
        originalPrice: prod.precioAnterior,
        image: prod.imagenUrl,
        category: prod.categoria?.nombre || 'General'
      });
      setShowDetailModal(true);
    }
  };

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  // Filtrado de Platillos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategoryId === 'TODOS' || p.categoriaId === selectedCategoryId;
      const matchesSearch = !searchQuery.trim() ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Slides de Hero disponibles
  const displayHeroSlides = useMemo(() => {
    if (heroSlides.length > 0) return heroSlides;
    // Fallback: usar productos destacados como banners si no hay hero configurado
    return products.slice(0, 3).map(p => ({
      id: p.id,
      title: p.nombre,
      description: cleanDescriptionText(p.descripcion),
      image: p.imagenUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
      price: p.precio,
      priceLabel: `$${p.precio.toFixed(2)}`,
      tagText: 'ESPECIALIDAD DE LA CASA'
    }));
  }, [heroSlides, products]);

  const activeSlide = displayHeroSlides[currentSlideIndex % Math.max(1, displayHeroSlides.length)];

  // Promociones destacadas
  const displayPromotions = useMemo(() => {
    if (highlights.length > 0) return highlights;
    return products
      .filter(p => p.precioAnterior && p.precioAnterior > p.precio)
      .slice(0, 4)
      .map(p => ({
        id: p.id,
        title: p.nombre,
        description: cleanDescriptionText(p.descripcion),
        image: p.imagenUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
        price: p.precio,
        originalPrice: p.precioAnterior,
        badge: 'OFERTA'
      }));
  }, [highlights, products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <Loader2 className="animate-spin text-amber-400" size={44} />
        <div className="text-center space-y-1">
          <span className="text-sm font-black uppercase tracking-widest text-white">Cargando Menú de Mesa</span>
          <p className="text-xs text-slate-400">Sincronizando con el restaurante...</p>
        </div>
      </div>
    );
  }

  if (error || !mesa) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4 text-white">
        <div className="size-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-3xl">
          <XCircle size={36} />
        </div>
        <h2 className="text-xl font-black text-white uppercase">Mesa No Disponible</h2>
        <p className="text-xs text-slate-400 max-w-sm font-medium leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}`)}
          style={{ backgroundColor: cp }}
          className="px-6 py-3 text-white font-black text-xs uppercase rounded-2xl shadow-lg cursor-pointer"
        >
          Ver Menú General
        </button>
      </div>
    );
  }

  const permitePedidos = mesa.permitePedidos !== false && config.mesaPedidosHabilitados !== false;

  return (
    <div style={{ backgroundColor: cn, color: '#0f172a' }} className="min-h-screen w-full font-sans antialiased pb-32 select-none text-left">

      {/* ── 1. HEADER SUPERIOR CON LOGO, MESA, BOTÓN MESERO Y CARRITO ── */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white px-3 sm:px-6 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Identificador de Mesa */}
          <div className="flex items-center gap-2.5 min-w-0">
            {negocio?.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio?.nombre || 'Restaurante'}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div
                style={{ backgroundColor: cp }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-xs"
              >
                🍽️
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">
                {negocio?.nombre || 'Restaurante'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                  {mesa.nombre}
                </h1>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas: Botón Llamar Mesero + Botón Carrito */}
          <div className="flex items-center gap-2 shrink-0">
            {config.mesaLlamarMeseroHabilitado && (
              <button
                type="button"
                onClick={() => setShowWaiterModal(true)}
                disabled={waiterCooldown > 0 || callingWaiter}
                className={`px-3 sm:px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 ${
                  waiterCooldown > 0
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title="Llamar al mesero"
              >
                <Bell className={`w-4 h-4 ${callingWaiter ? 'animate-spin' : ''}`} />
                <span className="text-[11px]">
                  {waiterCooldown > 0 ? `${waiterCooldown}s` : 'Mesero'}
                </span>
              </button>
            )}

            {permitePedidos && (
              <button
                type="button"
                onClick={() => setShowOrderDrawer(true)}
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="relative px-3 sm:px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all text-white"
                title="Ver comanda / carrito"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Comanda</span>
                {totalItemsCount > 0 && (
                  <span className="bg-slate-950 text-white px-1.5 py-0.5 rounded-full text-[10px] font-black ml-0.5">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── TOAST DE ALERTA DE MESERO ── */}
      {waiterToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-center text-xs font-black uppercase tracking-wider shadow-md animate-in slide-in-from-top duration-300 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{waiterToast}</span>
        </div>
      )}

      {/* ── BANNER INFORMATIVO SI PEDIDOS ESTÁN DESHABILITADOS ── */}
      {!permitePedidos && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-amber-900 text-xs font-bold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Menú digital en mesa: Para ordenar platillos, solicita la atención de tu mesero.</span>
        </div>
      )}

      {/* ── CONTENEDOR PRINCIPAL ── */}
      <main className="w-full max-w-4xl mx-auto px-3 sm:px-5 pt-3 space-y-5">

        {/* ── 2. BANNER HERO CARRUSEL (SIMILAR AL LANDING) ── */}
        {displayHeroSlides.length > 0 && activeSlide && (
          <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-800/80 min-h-[160px] sm:min-h-[195px] max-h-[220px] flex items-center bg-slate-950">
            <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
              <img
                src={activeSlide.image}
                alt={activeSlide.title || 'Especialidad'}
                className="w-full h-full object-cover object-center scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
            </div>

            {/* Etiqueta Flotante Circular con Precio */}
            {activeSlide.priceLabel && (
              <div
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-12 h-12 rounded-full flex flex-col items-center justify-center text-white font-black shadow-xl border-2 border-white/20 rotate-[6deg] scale-95"
              >
                <span className="text-[8px] uppercase tracking-tighter leading-tight opacity-90">DESDE</span>
                <span className="text-xs font-black leading-none">
                  {activeSlide.priceLabel.replace(/^Desde\s+/i, '')}
                </span>
              </div>
            )}

            <div className="relative z-10 w-3/4 sm:w-2/3 p-4 sm:p-6 space-y-1.5 flex flex-col justify-center">
              <span style={{ color: cp }} className="text-[9px] font-black uppercase tracking-widest block">
                {activeSlide.tagText || 'RECOMENDADO DEL CHEF'}
              </span>

              <h2 className="text-white text-lg sm:text-xl font-black tracking-tight leading-tight">
                {activeSlide.title}
              </h2>

              {activeSlide.description && (
                <p className="text-slate-300 text-[10px] sm:text-xs font-normal leading-relaxed line-clamp-2 max-w-[280px]">
                  {activeSlide.description}
                </p>
              )}

              {permitePedidos && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const found = products.find(p => p.id === activeSlide.id || p.nombre === activeSlide.title);
                      if (found) {
                        handleOpenProductDetail(found);
                      } else {
                        const menuEl = document.getElementById('seccion-menu-mesa');
                        if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ backgroundColor: cp, color: '#ffffff' }}
                    className="px-4 py-1.5 rounded-full text-[11px] font-black text-white shadow-lg flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Pedir a la Mesa</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Puntos Indicadores del Carrusel */}
            {displayHeroSlides.length > 1 && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                {displayHeroSlides.map((_, idx) => {
                  const isActive = idx === currentSlideIndex % displayHeroSlides.length;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      style={{ backgroundColor: isActive ? cp : undefined }}
                      className={`transition-all duration-300 cursor-pointer ${
                        isActive ? 'w-5 h-1.5 rounded-full shadow-xs' : 'w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 3. SECCIÓN PROMOCIONES Y OFERTAS ESPECIALES ── */}
        {displayPromotions.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 text-slate-900">
                <Flame style={{ color: cp }} className="w-5 h-5" />
                Promociones Especiales
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Exclusivas en salón
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {displayPromotions.map(promo => (
                <div
                  key={promo.id}
                  onClick={() => {
                    const found = products.find(p => p.id === promo.id || p.nombre === promo.title);
                    if (found) handleOpenProductDetail(found);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs p-3 flex items-center gap-3 min-w-[260px] max-w-[290px] shrink-0 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                    <img
                      src={promo.image}
                      alt={promo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div
                      style={{ backgroundColor: cp }}
                      className="absolute top-1 left-1 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md shadow-xs"
                    >
                      {promo.badge || 'PROMO'}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h5 className="text-xs font-black truncate text-slate-900 group-hover:text-amber-600 transition-colors">
                      {promo.title}
                    </h5>
                    <p className="text-[10px] font-medium line-clamp-1 text-slate-500">
                      {promo.description}
                    </p>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {promo.price && (
                          <span style={{ color: cp }} className="text-xs font-black">
                            ${Number(promo.price).toFixed(2)}
                          </span>
                        )}
                        {promo.originalPrice && (
                          <span className="text-[10px] font-bold line-through text-slate-400">
                            ${Number(promo.originalPrice).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {permitePedidos ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const found = products.find(p => p.id === promo.id || p.nombre === promo.title);
                            if (found) addToCart(found);
                          }}
                          style={{ backgroundColor: cp, color: '#ffffff' }}
                          className="px-2.5 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-xs hover:opacity-90 active:scale-95 transition-all text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-white" />
                          <span>Agregar</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-slate-500">Ver Menú</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. SELECTOR DE CATEGORÍAS & BUSCADOR ── */}
        <div id="seccion-menu-mesa" className="space-y-3 pt-2">
          
          {/* Buscador Integrado */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar platillos, bebidas o postres..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none shadow-2xs focus:border-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-700 absolute right-3 top-2.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chips de Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('TODOS')}
              style={{
                borderColor: selectedCategoryId === 'TODOS' ? cp : '#e2e8f0',
                color: selectedCategoryId === 'TODOS' ? cp : '#334155',
                backgroundColor: '#ffffff'
              }}
              className={`px-4 py-2 rounded-2xl border flex items-center gap-1.5 shrink-0 transition-all shadow-2xs cursor-pointer ${
                selectedCategoryId === 'TODOS' ? 'shadow-md border-2 font-black' : 'font-bold'
              }`}
            >
              <span>🍽️</span>
              <span className="text-xs">Todos ({products.length})</span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategoryId === cat.id;
              const countInCat = products.filter(p => p.categoriaId === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  style={{
                    borderColor: isActive ? cp : '#e2e8f0',
                    color: isActive ? cp : '#334155',
                    backgroundColor: '#ffffff'
                  }}
                  className={`px-4 py-2 rounded-2xl border flex items-center gap-1.5 shrink-0 transition-all shadow-2xs cursor-pointer ${
                    isActive ? 'shadow-md border-2 font-black' : 'font-bold'
                  }`}
                >
                  <span>{cat.icono || '🍲'}</span>
                  <span className="text-xs">{cat.nombre}</span>
                  {countInCat > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">({countInCat})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 5. GRID DE PRODUCTOS / PLATILLOS DEL RESTAURANTE ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              {selectedCategoryId === 'TODOS' ? 'Carta de Platillos' : 'Platillos en esta Categoría'}
            </h3>
            <span className="text-xs text-slate-500 font-bold font-mono">
              {filteredProducts.length} disponibles
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-black text-slate-800 uppercase">Sin platillos disponibles</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No se encontraron productos con la búsqueda o categoría seleccionada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map(prod => {
                const qtyInCart = getItemQuantity(prod.id);
                const isFav = !!favorites[prod.id];
                const cleanDesc = cleanDescriptionText(prod.descripcion);

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleOpenProductDetail(prod)}
                    className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="relative w-full h-32 sm:h-40 bg-slate-100 overflow-hidden">
                      {prod.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
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

                      {prod.precioAnterior && prod.precioAnterior > prod.precio && (
                        <div
                          style={{ backgroundColor: cp }}
                          className="absolute bottom-2 left-2 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md shadow-xs uppercase tracking-tight"
                        >
                          Oferta
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col flex-1 justify-between space-y-2">
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                          {prod.nombre}
                        </h4>
                        {cleanDesc && (
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-0.5">
                            {cleanDesc}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span style={{ color: cp }} className="font-black text-xs sm:text-sm font-mono">
                            ${Number(prod.precio || 0).toFixed(2)}
                          </span>
                          {prod.precioAnterior && (
                            <span className="text-[9px] text-slate-400 line-through font-mono">
                              ${Number(prod.precioAnterior).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {permitePedidos ? (
                          qtyInCart > 0 ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5"
                            >
                              <button
                                type="button"
                                onClick={() => decrementQuantity(prod.id)}
                                className="w-5 h-5 bg-white text-slate-700 rounded-lg font-black text-xs flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-[11px] font-black px-1 text-slate-900">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(prod)}
                                style={{ backgroundColor: cp, color: '#ffffff' }}
                                className="w-5 h-5 rounded-lg font-black text-xs flex items-center justify-center shadow-2xs text-white cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductDetail(prod);
                              }}
                              style={{ backgroundColor: cp, color: '#ffffff' }}
                              className="w-7 h-7 rounded-xl flex items-center justify-center font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition-all text-white cursor-pointer"
                              title="Añadir a la mesa"
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] font-extrabold text-slate-400">Ver</span>
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

      {/* ── 6. BARRA FLOTANTE INFERIOR DE PEDIDO (SI HAY PLATILLOS EN CARRITO) ── */}
      {permitePedidos && totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-auto sm:w-[450px] sm:left-1/2 sm:-translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-950 text-white p-3.5 rounded-3xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 pl-1">
              <div
                style={{ backgroundColor: cp }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-xs"
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">
                  {totalItemsCount} platillo{totalItemsCount !== 1 ? 's' : ''} en mesa
                </span>
                <span className="text-base font-black text-amber-400 font-mono leading-tight">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOrderDrawer(true)}
              style={{ backgroundColor: cp, color: '#ffffff' }}
              className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase flex items-center gap-1.5 shadow-lg active:scale-95 transition-all text-white cursor-pointer"
            >
              <span>Ver Pedido</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: ACCIONES DE LLAMAR MESERO ── */}
      {showWaiterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black uppercase text-slate-900">Atención en Mesa</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWaiterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Selecciona el tipo de asistencia que necesitas para <strong className="text-slate-900">{mesa.nombre}</strong>:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleCallWaiter('MESERO')}
                disabled={callingWaiter}
                className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 flex items-center gap-3 transition-all cursor-pointer text-left"
              >
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs block text-slate-900">Llamar al Mesero</span>
                  <span className="text-[10px] text-slate-500 font-medium">Asistencia, preguntas o pedir más servilletas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCallWaiter('CUENTA')}
                disabled={callingWaiter}
                className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 flex items-center gap-3 transition-all cursor-pointer text-left"
              >
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs block text-slate-900">Pedir la Cuenta</span>
                  <span className="text-[10px] text-slate-500 font-medium">Solicitar pre-cuenta para pagar en la mesa</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowWaiterModal(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 text-center cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL / DRAWER: CONFIRMAR PEDIDO EN MESA ── */}
      {showOrderDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col justify-between animate-in slide-in-from-bottom duration-300 text-slate-900">
            <div className="space-y-4 overflow-y-auto pr-1">
              
              {/* Encabezado */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-amber-500" />
                    Comanda para {mesa.nombre}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Revisa tus platillos antes de enviarlos a cocina
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Platillos en el Pedido */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                  Platillos Seleccionados ({totalItemsCount})
                </span>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/60 max-h-52 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.product.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-extrabold text-slate-900 block truncate">
                          {item.product.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ${item.product.precio.toFixed(2)} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-slate-900 font-mono">
                          ${(item.product.precio * item.quantity).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1">
                          <button
                            type="button"
                            onClick={() => decrementQuantity(item.product.id)}
                            className="px-1.5 py-0.5 font-black text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1 font-bold text-[11px]">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => addToCart(item.product)}
                            className="px-1.5 py-0.5 font-black text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Datos de Comensal & Notas para Cocina */}
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tu Nombre (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Carlos"
                      value={clienteNombre}
                      onChange={e => setClienteNombre(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Teléfono (opcional)</label>
                    <input
                      type="tel"
                      placeholder="Ej: 0991234567"
                      value={clienteTelefono}
                      onChange={e => setClienteTelefono(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700">Notas para la Cocina (opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Término medio, sin cebolla, aderezo aparte..."
                    value={notasPedido}
                    onChange={e => setNotasPedido(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium resize-none"
                  />
                </div>
              </div>

              {/* Mensajes de Estado GPS / Error */}
              {geoErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{geoErrorMessage}</span>
                </div>
              )}

              {/* Resumen Total */}
              <div className="p-4 bg-slate-950 rounded-2xl text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total a Comandar</span>
                  <span className="text-xl font-black text-amber-400 font-mono">${total.toFixed(2)}</span>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-medium">
                  <span>Pago se realiza en mesa</span>
                  <span className="block text-white font-bold">Mesa: {mesa.nombre}</span>
                </div>
              </div>
            </div>

            {/* Botón de Enviar a Cocina */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowOrderDrawer(false)}
                className="px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={requestingOrder || cart.length === 0}
                onClick={handleSubmitTableOrder}
                style={{ backgroundColor: cp, color: '#ffffff' }}
                className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 text-white"
              >
                {requestingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Enviando a Cocina...</span>
                  </>
                ) : (
                  <>
                    <Utensils className="w-4 h-4 text-white" />
                    <span>Confirmar y Enviar Pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE ÉXITO TRAS SOLICITAR PEDIDO ── */}
      {orderSentSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 border border-emerald-200 shadow-2xl text-center space-y-4 animate-in zoom-in-95 text-slate-900">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase">¡Pedido Enviado a Cocina!</h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Tu comanda para <strong className="text-slate-900">{mesa.nombre}</strong> fue recibida con éxito. Nuestro equipo de cocina ya está preparándola.
            </p>
            <div className="p-3 bg-emerald-50 rounded-2xl text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-2">
              <ShieldCheck size={16} /> Ubicación validada en restaurante
            </div>
            <button
              type="button"
              onClick={() => setOrderSentSuccess(false)}
              className="w-full py-3.5 bg-slate-900 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer"
            >
              Seguir Viendo el Menú
            </button>
          </div>
        </div>
      )}

      {/* ── MODALES COMPARTIDOS: DETALLE DE ITEM & VARIANTES ── */}
      <ItemDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        item={selectedDetailItem}
        primaryColor={cp}
        onAddToCart={(item, qty) => {
          if (permitePedidos) {
            addToCart({
              id: item.id,
              nombre: item.title,
              precio: item.price,
              imagenUrl: item.image
            });
            setShowDetailModal(false);
          }
        }}
      />

      <ProductVariantModal
        product={selectedVariantProduct}
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        primaryColor={cp}
      />

    </div>
  );
}
