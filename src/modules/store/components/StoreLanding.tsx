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
  Bell, Heart, Star, SlidersHorizontal, CheckCircle2, Home, Box, Gift, User, RefreshCw,
  Compass, Smartphone, LogOut, ArrowRight, PackageCheck, CreditCard, Award, ExternalLink
} from 'lucide-react';
import { CartProvider, useCart, CartProduct } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import UniversalHeroCarousel from '@/components/public/UniversalHeroCarousel';
import ProductVariantModal, { DetailedProduct, PromoInfo, ComboProductItem } from '@/components/public/ProductVariantModal';

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
  initialPromotions = [],
  initialSelectedProduct = null,
}: {
  negocio: any;
  initialProducts?: DetailedProduct[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: any[]; highlights: any[] };
  initialPromotions?: any[];
  initialSelectedProduct?: DetailedProduct | null;
}) {
  const defaultDeliveryCost = Number((negocio?.configuracion as any)?.costoEnvio) || 2.50;

  return (
    <CartProvider businessId={negocio?.id || 'demo'} defaultDeliveryCost={defaultDeliveryCost}>
      <StoreLandingContent
        negocio={negocio}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialHeroContent={initialHeroContent}
        initialPromotions={initialPromotions}
        initialSelectedProduct={initialSelectedProduct}
      />
    </CartProvider>
  );
}

function StoreLandingContent({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
  initialPromotions = [],
  initialSelectedProduct = null,
}: {
  negocio: any;
  initialProducts?: DetailedProduct[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: any[]; highlights: any[] };
  initialPromotions?: any[];
  initialSelectedProduct?: DetailedProduct | null;
}) {
  const primaryColor = negocio?.colorPrimario || '#06b6d4';
  const secondaryColor = negocio?.colorSecundario || '#0f172a';

  const { addToCart, totalItemsCount, customerData, deliveryType, setDeliveryType, isCartOpen, setIsCartOpen } = useCart();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<DetailedProduct | null>(initialSelectedProduct || null);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  // Deep linking: sincronizar y abrir automáticamente el modal del producto si viene ?producto=ID o ?p=ID
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('producto') || urlParams.get('p');
      if (!targetId) return;

      if (selectedProductForModal && selectedProductForModal.id === targetId) return;

      const found = initialProducts.find(p => p.id === targetId);
      if (found) {
        setSelectedProductForModal(found);
      } else {
        const slug = negocio?.slug || 'tienda';
        fetch(`/api/public/${slug}/products/${targetId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            const prod = data?.product || data?.producto;
            if (prod && prod.id) {
              setSelectedProductForModal(prod);
            }
          })
          .catch(() => {});
      }
    } catch (e) {}
  }, [initialProducts, negocio?.slug, selectedProductForModal]);

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

  const [savedDataToast, setSavedDataToast] = useState(false);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [clientOrdersList, setClientOrdersList] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [cuponesCount, setCuponesCount] = useState<number>(0);

  React.useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const slug = negocio?.slug;
        if (!slug) return;
        const res = await fetch(`/api/public/${slug}/loyalty/my-rewards`);
        if (res.ok) {
          const data = await res.json();
          const count = Array.isArray(data?.cupones)
            ? data.cupones.length
            : (Array.isArray(data?.availableCoupons) ? data.availableCoupons.length : 0);
          setCuponesCount(count);
        } else {
          setCuponesCount(0);
        }
      } catch (_) {
        setCuponesCount(0);
      }
    };
    fetchCoupons();
  }, [negocio?.slug]);

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

  // Consultar pedidos reales del cliente cuando haya teléfono disponible
  React.useEffect(() => {
    if (!clientPhone || clientPhone.replace(/\D/g, '').length < 7) return;
    const fetchOrdersSummary = async () => {
      try {
        setLoadingOrders(true);
        const res = await fetch(`/api/public/${negocio?.slug || 'tienda'}/orders?phone=${encodeURIComponent(clientPhone)}`);
        if (res.ok) {
          const data = await res.json();
          const list = data.orders || data.pedidos || [];
          setClientOrdersList(list);
          setOrdersCount(list.length);
        }
      } catch (e) {
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrdersSummary();
  }, [clientPhone, negocio?.slug]);

  const handleSaveCustomerData = () => {
    if (clientName) localStorage.setItem('pinchos_client_name', clientName);
    if (clientPhone) localStorage.setItem('pinchos_client_phone', clientPhone);
    if (clientAddress) localStorage.setItem('pinchos_client_address', clientAddress);
    if (clientReference) localStorage.setItem('pinchos_client_reference', clientReference);
    setSavedDataToast(true);
    setTimeout(() => setSavedDataToast(false), 3000);
  };

  const handleLogoutCustomer = () => {
    if (!confirm('¿Deseas cerrar sesión en este dispositivo? Se limpiarán tus datos guardados.')) return;
    try {
      localStorage.removeItem('pinchos_client_name');
      localStorage.removeItem('pinchos_client_phone');
      localStorage.removeItem('pinchos_client_address');
      localStorage.removeItem('pinchos_client_reference');
      localStorage.removeItem('user_phone');
      localStorage.removeItem('user_name');
    } catch (e) {}
    setClientName('');
    setClientPhone('');
    setClientAddress('');
    setClientReference('');
    setOrdersCount(0);
    setClientOrdersList([]);
  };

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

  // Escuchar botón atrás del navegador/móvil a nivel StoreLanding para garantizar que los modales se cierren
  React.useEffect(() => {
    const handlePopState = () => {
      if (selectedProductForModal) {
        setSelectedProductForModal(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedProductForModal]);

  // Mapa de promociones activas por ID de producto requerido
  const activePromoByProductId = useMemo(() => {
    const map: Record<string, any> = {};
    if (initialPromotions && initialPromotions.length > 0) {
      initialPromotions.forEach((p: any) => {
        let meta: any = {};
        if (p.descripcion && p.descripcion.includes('<!-- CITIOX_META:')) {
          try {
            const parts = p.descripcion.split('<!-- CITIOX_META:');
            const jsonStr = parts[1].split('-->')[0].trim();
            meta = JSON.parse(jsonStr);
          } catch (_) {}
        }
        const prodId = meta.productoRequeridoId || (p.PromotionToService && p.PromotionToService[0]?.B) || null;
        if (prodId && (p.estado === 'ACTIVA' || !p.estado)) {
          map[prodId] = p;
        }
      });
    }
    return map;
  }, [initialPromotions]);

  // Promociones Reales Creadas en el Módulo de Promociones (/admin/promociones)
  const displayPromos = useMemo(() => {
    // 1. Promociones reales de la base de datos creadas por el admin
    if (initialPromotions && initialPromotions.length > 0) {
      return initialPromotions.map((p: any) => {
        let cleanDesc = p.descripcion || '';
        let meta: any = {};
        if (cleanDesc.includes('<!-- CITIOX_META:')) {
          try {
            const parts = cleanDesc.split('<!-- CITIOX_META:');
            cleanDesc = parts[0].trim();
            const jsonStr = parts[1].split('-->')[0].trim();
            meta = JSON.parse(jsonStr);
          } catch (_) {}
        }

        const linkedProdId = meta.productoRequeridoId || (p.PromotionToService && p.PromotionToService[0]?.B) || null;
        const linkedProduct = linkedProdId ? initialProducts.find((prod) => prod.id === linkedProdId) : null;
        const imagenUrl = p.imagenUrl && p.imagenUrl.trim() !== '' ? p.imagenUrl : (linkedProduct?.imagenUrl || '');
        const promoPrice = Number(p.precioPromo || p.precio || linkedProduct?.precio || 0);
        const originalPrice = p.precioAnterior ? Number(p.precioAnterior) : (linkedProduct?.precio ? Number(linkedProduct.precio) : null);

        const isCombo = p.tipoPromo === 'COMBO' || meta.alcance === 'COMBO' || (p.titulo && p.titulo.toLowerCase().includes('combo'));

        // Extraer los productos que componen el combo
        const comboProducts: ComboProductItem[] = [];
        if (isCombo) {
          const comboIds: string[] = [];
          if (Array.isArray(meta.productosRelacionados)) {
            meta.productosRelacionados.forEach((id: string) => {
              if (id && !comboIds.includes(id)) comboIds.push(id);
            });
          }
          if (meta.productoRequeridoId && !comboIds.includes(meta.productoRequeridoId)) {
            comboIds.unshift(meta.productoRequeridoId);
          }

          comboIds.forEach((id) => {
            const prod = initialProducts.find((ip) => ip.id === id);
            if (prod) {
              comboProducts.push({
                id: prod.id,
                nombre: prod.nombre,
                descripcion: prod.descripcion,
                precio: Number(prod.precio) || 0,
                precioAnterior: prod.precioAnterior ? Number(prod.precioAnterior) : null,
                imagenUrl: prod.imagenUrl,
                sku: prod.sku,
                tieneVariantes: Boolean(prod.tieneVariantes && prod.variantes && prod.variantes.length > 0),
                variantes: prod.variantes,
              });
            }
          });
        }

        const promoBadge = p.tipoPromo ? `🔥 ${p.tipoPromo}` : (p.descuentoValor ? `⚡ ${p.descuentoValor}% OFF` : (isCombo ? '🔥 COMBO' : '🎁 OFERTA'));
        const sumComboPrecios = comboProducts.reduce((acc, cp) => acc + cp.precio, 0);
        const resolvedOriginalPrice = comboProducts.length > 1
          ? (originalPrice && originalPrice >= sumComboPrecios ? originalPrice : sumComboPrecios)
          : (originalPrice || linkedProduct?.precio || null);

        const promoInfoObj: PromoInfo = {
          id: p.id,
          titulo: p.titulo,
          descripcion: cleanDesc || 'Promoción especial por tiempo limitado.',
          badge: promoBadge,
          precioPromo: promoPrice,
          precioAnterior: resolvedOriginalPrice,
          tipoPromo: p.tipoPromo,
          descuentoValor: p.descuentoValor,
          esCombo: isCombo,
          comboProducts: comboProducts.length > 0 ? comboProducts : undefined,
        };

        // Si es combo con múltiples productos, el modal representa al paquete entero
        const productForModal: DetailedProduct = isCombo && comboProducts.length > 0 ? {
          id: p.id,
          negocioId: negocio?.id || '',
          categoriaId: '',
          nombre: p.titulo,
          descripcion: cleanDesc || 'Promoción especial por tiempo limitado.',
          precio: promoPrice,
          precioAnterior: resolvedOriginalPrice,
          imagenUrl: imagenUrl || comboProducts[0]?.imagenUrl || '',
          stock: 99,
          activo: true,
          tieneVariantes: false,
          promoInfo: promoInfoObj,
        } : linkedProduct ? {
          ...linkedProduct,
          nombre: p.titulo || linkedProduct.nombre,
          descripcion: cleanDesc || linkedProduct.descripcion,
          precio: promoPrice,
          precioAnterior: originalPrice || linkedProduct.precio,
          imagenUrl: imagenUrl || linkedProduct.imagenUrl,
          promoInfo: promoInfoObj,
          variantes: linkedProduct.variantes ? linkedProduct.variantes.map((v: any) => ({
            ...v,
            precio: promoPrice,
            precioAnterior: v.precio ?? (originalPrice || linkedProduct.precio)
          })) : undefined
        } : {
          id: p.id,
          negocioId: negocio?.id || '',
          categoriaId: '',
          nombre: p.titulo,
          descripcion: cleanDesc || 'Promoción especial por tiempo limitado.',
          precio: promoPrice,
          precioAnterior: originalPrice,
          imagenUrl: imagenUrl || '',
          stock: 99,
          activo: true,
          tieneVariantes: false,
          promoInfo: promoInfoObj,
        };

        return {
          id: p.id,
          titulo: p.titulo,
          descripcion: cleanDesc || 'Promoción especial por tiempo limitado.',
          badge: promoBadge,
          precioPromo: promoPrice,
          precioAnterior: resolvedOriginalPrice,
          imagenUrl: imagenUrl || linkedProduct?.imagenUrl || '',
          productToOpen: productForModal
        };
      });
    }

    // 2. Highlights configurados en la tienda si los hay
    const highlights = initialHeroContent?.highlights || [];
    if (highlights.length > 0) {
      return highlights.map((h: any, idx: number) => {
        const hlProduct = initialProducts.find((p) => p.id === h.productoId);
        const hlPromoPrice = Number(h.precioPromo || h.precio) || 29.99;
        const hlOriginalPrice = Number(h.precioAnterior || (hlPromoPrice * 1.35).toFixed(2));
        const isHlCombo = (h.titulo && h.titulo.toLowerCase().includes('combo')) || (h.badge && h.badge.toLowerCase().includes('combo'));
        
        const hlPromoInfo: PromoInfo = {
          id: h.id || `promo-hl-${idx}`,
          titulo: h.titulo || h.nombre || 'Promoción Especial',
          descripcion: h.descripcion || 'Aprovecha esta oferta exclusiva por tiempo limitado.',
          badge: h.badge || (idx % 2 === 0 ? '🎁 2x1 COMBO' : '⚡ 30% OFF'),
          precioPromo: hlPromoPrice,
          precioAnterior: hlOriginalPrice,
          tipoPromo: isHlCombo ? 'COMBO' : 'OFERTA',
          esCombo: isHlCombo,
        };

        const hlProductForModal: DetailedProduct = hlProduct ? {
          ...hlProduct,
          nombre: h.titulo || hlProduct.nombre,
          descripcion: h.descripcion || hlProduct.descripcion,
          precio: hlPromoPrice,
          precioAnterior: hlOriginalPrice || hlProduct.precio,
          imagenUrl: h.imagenUrl || hlProduct.imagenUrl,
          promoInfo: hlPromoInfo,
          variantes: hlProduct.variantes ? hlProduct.variantes.map((v: any) => ({
            ...v,
            precio: hlPromoPrice,
            precioAnterior: v.precio ?? (hlOriginalPrice || hlProduct.precio)
          })) : undefined
        } : {
          id: h.id || `promo-hl-${idx}`,
          negocioId: negocio?.id || '',
          categoriaId: '',
          nombre: h.titulo || h.nombre || 'Promoción Especial',
          descripcion: h.descripcion || 'Aprovecha esta oferta exclusiva por tiempo limitado.',
          precio: hlPromoPrice,
          precioAnterior: hlOriginalPrice,
          imagenUrl: h.imagenUrl || '',
          stock: 99,
          activo: true,
          tieneVariantes: false,
          promoInfo: hlPromoInfo,
        };

        return {
          id: h.id || `promo-hl-${idx}`,
          titulo: h.titulo || h.nombre || 'Promoción Especial',
          descripcion: h.descripcion || 'Aprovecha esta oferta exclusiva por tiempo limitado.',
          badge: h.badge || (idx % 2 === 0 ? '🎁 2x1 COMBO' : '⚡ 30% OFF'),
          precioPromo: hlPromoPrice,
          precioAnterior: hlOriginalPrice,
          imagenUrl: h.imagenUrl || '',
          productToOpen: hlProductForModal
        };
      });
    }

    // 3. Si NO hay promociones creadas en el admin, no inventar promociones falsas
    return [];
  }, [initialPromotions, initialHeroContent, initialProducts, negocio?.id]);

  // Deep linking: Abrir automáticamente el producto o promo si la URL contiene ?producto=<id> o #producto-<id>
  React.useEffect(() => {
    if (typeof window === 'undefined' || !initialProducts || initialProducts.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      let targetId = params.get('producto') || params.get('p');
      if (!targetId && window.location.hash.startsWith('#producto-')) {
        targetId = window.location.hash.replace('#producto-', '');
      }

      if (targetId) {
        // 1. Buscar si es una promoción o combo directo
        const foundPromo = displayPromos.find((p: any) => p.id === targetId);
        if (foundPromo?.productToOpen) {
          setSelectedProductForModal(foundPromo.productToOpen);
          return;
        }

        // 2. Buscar en productos
        const found = initialProducts.find((p) => p.id === targetId);
        if (found) {
          // Si el producto tiene una promoción activa asociada, abrirlo enriquecido con la promo
          const activePromo = activePromoByProductId[found.id];
          if (activePromo) {
            const promoInList = displayPromos.find((dp: any) => dp.id === activePromo.id);
            if (promoInList?.productToOpen) {
              setSelectedProductForModal(promoInList.productToOpen);
              return;
            }
          }
          setSelectedProductForModal(found);
        }
      }
    } catch (e) {
      console.error('Error al procesar deep link de producto:', e);
    }
  }, [initialProducts, displayPromos, activePromoByProductId]);

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
    }).map((product) => {
      const activePromo = activePromoByProductId[product.id];
      if (activePromo) {
        const pPrice = Number(activePromo.precioPromo || activePromo.precio || product.precio);
        const pOriginal = activePromo.precioAnterior ? Number(activePromo.precioAnterior) : (product.precio ? Number(product.precio) : null);
        return {
          ...product,
          precio: pPrice,
          precioAnterior: pOriginal || product.precio,
          variantes: product.variantes ? product.variantes.map((v: any) => ({
            ...v,
            precio: pPrice,
            precioAnterior: v.precio ?? (pOriginal || product.precio)
          })) : undefined
        };
      }
      return product;
    });
  }, [initialProducts, selectedCategoryId, searchQuery, activePromoByProductId]);

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

          {clientOrdersList.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Tus Compras Recientes ({clientOrdersList.length})
              </h3>
              {clientOrdersList.map((order: any) => (
                <div key={order.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                        Pedido #{order.numeroPedido || (order.id ? order.id.substring(0, 8) : 'N/A')}
                      </span>
                      <span className="text-base font-black text-slate-900">
                        ${Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
                      {order.estado || 'CONFIRMADO'}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs text-slate-600">
                    {(order.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">
                          <strong className="text-slate-900">{it.cantidad}x</strong> {it.nombreProducto || it.nombre}
                          {it.varianteNombre && <span className="text-[10px] text-slate-400 block">({it.varianteNombre})</span>}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          ${Number((it.precioUnitario || it.precio || 0) * (it.cantidad || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Reciente'}</span>
                    <span className="font-bold text-slate-700">{order.tipoEntrega || 'DOMICILIO'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center space-y-3">
              <div className="size-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase">Sin Pedidos Pendientes</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                Al realizar una compra en la tienda podrás hacerle seguimiento en tiempo real desde este panel.
              </p>
              <button
                type="button"
                onClick={() => { window.location.hash = ''; setActiveTab('inicio'); }}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                Realizar una Compra
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── VISTA 3: MI CUENTA (DISEÑO PREMIUM TIPO RESTAURANTE / PERFIL COMPLETO) ── */}
      {activeTab === 'cuenta' && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 animate-fadeIn space-y-5 pb-16">
          
          {/* 1. TARJETA PRINCIPAL DEL CLIENTE */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar circular con degradado e inicial */}
                <div className="size-16 rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0 border-2 border-white">
                  {clientName ? clientName.trim().substring(0, 2).toUpperCase() : <User className="size-8" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {clientName || 'Cliente Citiox'}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="size-3 text-emerald-600" />
                      <span>{clientPhone ? 'Cliente Verificado' : 'Cuenta Local'}</span>
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-500 font-mono">
                    {clientPhone || 'Registra tu número para seguimiento de pedidos'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {negocio?.nombre || 'CITIOX Urban Store'} • Miembro Club
                  </p>
                </div>
              </div>

              {/* Botón Cerrar Sesión */}
              {(clientPhone || clientName) && (
                <button
                  type="button"
                  onClick={handleLogoutCustomer}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/70 transition-colors cursor-pointer shrink-0"
                  title="Cerrar sesión en este dispositivo"
                >
                  <LogOut className="size-4" />
                </button>
              )}
            </div>

            {/* 2. RESUMEN EN 3 BLOQUES ESTADÍSTICOS */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 sm:gap-3 text-left">
              {/* Bloque Pedidos */}
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#pedidos';
                  setActiveTab('pedidos');
                }}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-cyan-50/60 border border-slate-100 hover:border-cyan-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="p-1.5 bg-cyan-100/70 text-cyan-700 rounded-xl group-hover:scale-105 transition-transform">
                    <ShoppingBag className="size-4" />
                  </span>
                  <ChevronRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                  {loadingOrders ? '...' : ordersCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mis Pedidos
                </span>
              </button>

              {/* Bloque Puntos Fidelidad */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="p-1.5 bg-amber-100/80 text-amber-700 rounded-xl">
                    <Star className="size-4 fill-amber-400 text-amber-500" />
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    VIP
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                  {(ordersCount * 50) + (clientPhone ? 100 : 25)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Puntos Club
                </span>
              </div>

              {/* Bloque Cupones */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span 
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    className="p-1.5 rounded-xl"
                  >
                    <Tag className="size-4" />
                  </span>
                  {cuponesCount > 0 ? (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      0 Disp.
                    </span>
                  )}
                </div>
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                  {cuponesCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cupones
                </span>
              </div>
            </div>

            {/* 3. DIRECCIÓN REGISTRADA Y BOTÓN MAPA GPS */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span 
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}
                    className="p-2.5 rounded-2xl shrink-0 mt-0.5 border"
                  >
                    <MapPin className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Dirección habitual de entrega
                    </span>
                    <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                      {clientAddress || 'No has configurado una dirección de entrega aún.'}
                    </p>
                    {clientReference && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        Ref: {clientReference}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="w-full py-3 px-4 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-cyan-200/80 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-98"
              >
                <Compass className="size-4 text-cyan-600" />
                <span>ACTUALIZAR UBICACIÓN EN EL MAPA</span>
              </button>
            </div>
          </div>

          {/* 4. BANNER INSTALAR APP OFICIAL (PWA) */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 rounded-3xl p-5 text-white shadow-xl space-y-3 relative overflow-hidden border border-cyan-900/40">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                📱
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 block">
                  Aplicación Oficial
                </span>
                <h4 className="text-sm sm:text-base font-black text-white leading-tight">
                  Instala la App de {negocio?.nombre || 'CITIOX'}
                </h4>
                <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">
                  Compra en 1-clic desde tu pantalla de inicio, recibe avisos de entrega y cupones exclusivos.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                alert(`Para instalar la App de ${negocio?.nombre || 'CITIOX'} en tu celular:\n\n📱 En Android: Abre el menú de tu navegador (⋮) y presiona "Instalar aplicación" o "Agregar a pantalla principal".\n\n📱 En iPhone (Safari): Presiona el botón Compartir y elige "Agregar al inicio".`);
              }}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Smartphone className="size-4" />
              <span>Instalar App en mi Celular</span>
            </button>
          </div>

          {/* 5. FORMULARIO DE EDICIÓN DE INFORMACIÓN PERSONAL */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="size-4 text-cyan-600" />
                  <span>Información Personal Guardada</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Tus datos se autocompletarán automáticamente en cada pedido
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ej. Carlos Caicedo"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="ej. 0998877665"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-2xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Dirección Habitual de Entrega
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="ej. Av. 10 de Agosto N24-12 y Naciones Unidas"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Referencia de Domicilio (opcional)
                </label>
                <div className="relative">
                  <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={clientReference}
                    onChange={(e) => setClientReference(e.target.value)}
                    placeholder="ej. Casa blanca de 2 pisos, frente a la farmacia"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCustomerData}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 ${
                  savedDataToast
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                }`}
              >
                {savedDataToast ? (
                  <>
                    <CheckCircle2 className="size-4 text-white animate-in zoom-in" />
                    <span>¡DATOS GUARDADOS CON ÉXITO!</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    <span>GUARDAR MIS DATOS</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 6. ACCIONES RÁPIDAS & SOPORTE WHATSAPP */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-2.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Accesos Rápidos y Ayuda
            </h4>

            <button
              type="button"
              onClick={() => {
                window.location.hash = '#pedidos';
                setActiveTab('pedidos');
              }}
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">
                  <PackageCheck className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">Mis Pedidos e Historial</span>
                  <span className="text-[11px] text-slate-500 font-medium">Revisa tus compras realizadas y el rastreo de envíos</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.hash = '';
                setActiveTab('inicio');
              }}
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
                  <ShoppingBag className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">Explorar Catálogo y Ofertas</span>
                  <span className="text-[11px] text-slate-500 font-medium">Ver nuevos lanzamientos y promociones activas</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href={`https://wa.me/${negocio?.telefono?.replace(/\D/g, '') || '593959997521'}?text=Hola,%20necesito%20asistencia%20con%20mi%20cuenta%20en%20la%20tienda%20online.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100/70 rounded-2xl border border-emerald-200/70 flex items-center justify-between text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-950 block">Atención al Cliente por WhatsApp</span>
                  <span className="text-[11px] text-emerald-700 font-medium">¿Tienes dudas con un pedido o producto? Escríbenos</span>
                </div>
              </div>
              <ExternalLink className="size-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </a>
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
          defaultImages={[
            negocio?.configuracion?.bannerUrl,
            negocio?.bannerUrl,
            ...(Array.isArray(negocio?.configuracion?.bannerUrls) ? negocio.configuracion.bannerUrls : [])
          ].filter(Boolean) as string[]}
        />
      </section>

      {/* ── 3. SECCIÓN DE PROMOCIONES & COMBOS (DISEÑO MODERNO, ELEGANTE Y DE ALTA CONVERSIÓN) ── */}
      {displayPromos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
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

          {/* Carrusel Horizontal de Promociones */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {displayPromos.map((promo: any) => (
              <div
                key={promo.id}
                onClick={() => promo.productToOpen && setSelectedProductForModal(promo.productToOpen)}
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
                      {promo.badge}
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

                {/* Micro Barra de Disponibilidad */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="text-cyan-600">⚡ Quedan pocas unidades</span>
                    <span className="text-slate-400">85% reservado</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[85%] rounded-full"></div>
                  </div>
                </div>

                {/* Precios & Botón */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-sm sm:text-base font-black text-slate-900 block leading-tight">
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
                      if (promo.productToOpen) {
                        const activeVariants = (promo.productToOpen.variantes || []).filter((v: any) => v.activo);
                        const hasVariants = Boolean(promo.productToOpen.tieneVariantes && activeVariants.length > 0);
                        if (hasVariants) {
                          setSelectedProductForModal(promo.productToOpen);
                        } else {
                          addToCart({
                            ...promo.productToOpen,
                            precio: promo.precioPromo,
                            precioAnterior: promo.precioAnterior,
                            imagenUrl: promo.imagenUrl || promo.productToOpen.imagenUrl,
                          }, 1);
                          setIsCartOpen(true);
                        }
                      }
                    }}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <ShoppingBag className="w-3 h-3 text-cyan-400" />
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

      {/* ── 7. BARRA NAVEGACIÓN INFERIOR FLOTANTE (SE OCULTA TOTALMENTE AL ABRIR UN PRODUCTO O CARRITO) ── */}
      {!selectedProductForModal && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-150 py-2 px-3 flex items-center justify-around shadow-2xl animate-in fade-in duration-200">
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
      {selectedProductForModal && (
        <ProductVariantModal
          product={selectedProductForModal}
          isOpen={!!selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          primaryColor={primaryColor}
        />
      )}

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
          if (address) {
            setClientAddress(address);
            try {
              localStorage.setItem('pinchos_client_address', address);
              localStorage.setItem('customer_lat', String(lat));
              localStorage.setItem('customer_lng', String(lng));
            } catch (e) {}
          }
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
