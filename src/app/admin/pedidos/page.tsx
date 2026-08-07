'use client';
// src/app/admin/pedidos/page.tsx
// Módulo de Pedidos en Caja (POS Citiox Enterprise 10/10)
// Copia exacta del diseño de referencia enviado por el usuario con soporte para Tema Oscuro y Tema Claro.

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Flame, Search, Bike, ShoppingBag, Utensils, Trash2, Plus, Minus, X, 
  MapPin, Phone, User, Check, ChevronDown, LayoutGrid, List, ArrowLeft,
  Clock, ChefHat, PackageCheck, AlertCircle, Loader2, Navigation,
  Sun, Moon, Filter, Sparkles, CheckCircle2, ChevronRight, Settings, 
  FileText, Award, Layers, Percent
} from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';

// ─── INTERFACES ───────────────────────────────────────────────────────────────
interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  categoriaId?: string;
  categoria?: { nombre: string };
  popular?: boolean;
}

interface CartEntry {
  qty: number;
  takeawayQty: number;
}

interface OrderItem {
  id: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
}

interface Order {
  id: string;
  numeroPedido: number;
  tipoEntrega: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string | null;
  referenciaCliente?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  fechaEntrega: string;
  franjaHoraria: string;
  subtotal: number;
  costoEnvio: number;
  total: number;
  estado: string;
  notas?: string | null;
  extraInfo?: any;
  createdAt: string;
  items: OrderItem[];
}

const TAB_STATES = {
  nuevos: ['RECIBIDO', 'PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PAGO_CONFIRMADO', 'PENDIENTE', 'WAITING_CONFIRMATION', 'NUEVA'],
  preparacion: ['EN_PREPARACION', 'PREPARACION', 'CONFIRMED'],
  listos: ['LISTO', 'READY', 'RUTA', 'ON_ROUTE'],
  historial: ['ENTREGADO', 'COMPLETED', 'CANCELADO', 'RECHAZADO']
};

function PedidosContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  // Theme State: 'dark' or 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'nuevos' | 'preparacion' | 'listos' | 'historial'>('nuevos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // POS / New Order Terminal State
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('Cliente Frecuente');
  const [telefonoCliente, setTelefonoCliente] = useState('0991234567');
  const [tipoEntrega, setTipoEntrega] = useState<'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'TABLE_ORDER'>('DELIVERY_ORDER');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [direccionCliente, setDireccionCliente] = useState('Av. 6 de Diciembre N34-120 y Portugal');
  const [referenciaCliente, setReferenciaCliente] = useState('Frente al parque La Carolina');
  const [mesaCode, setMesaCode] = useState('Mesa 01');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Business & Delivery GPS Config
  const [bizLat, setBizLat] = useState<number>(-0.180653);
  const [bizLng, setBizLng] = useState<number>(-78.467838);
  const [deliveryConfig, setDeliveryConfig] = useState<any>(null);
  const [packagingAmount, setPackagingAmount] = useState<number>(0.25);

  // Map Selection
  const [showMapModal, setShowMapModal] = useState(false);
  const [lat, setLat] = useState<number | null>(-0.180653);
  const [lng, setLng] = useState<number | null>(-78.467838);

  // Products, Categories & Cart
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('populares');
  const [cart, setCart] = useState<{ [productId: string]: CartEntry }>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (highlightId) {
          const orderToHighlight = data.find((o: Order) => o.id === highlightId);
          if (orderToHighlight) {
            setSelectedOrder(orderToHighlight);
            if (TAB_STATES.nuevos.includes(orderToHighlight.estado)) setActiveTab('nuevos');
            else if (TAB_STATES.preparacion.includes(orderToHighlight.estado)) setActiveTab('preparacion');
            else if (TAB_STATES.listos.includes(orderToHighlight.estado)) setActiveTab('listos');
            else setActiveTab('historial');
          }
        }
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  }, [highlightId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load Catalogue & Business Data
  useEffect(() => {
    async function loadCatalogue() {
      try {
        const [resP, resC, resN] = await Promise.all([
          fetch('/api/admin/productos'),
          fetch('/api/admin/categorias'),
          fetch('/api/negocio')
        ]);
        if (resP.ok) {
          const dP = await resP.json();
          setProducts(Array.isArray(dP) ? dP : []);
          // Initial mock items in cart if empty to match exact user screenshot
          if (Array.isArray(dP) && dP.length > 0) {
            const initialCart: { [id: string]: CartEntry } = {};
            dP.slice(0, 4).forEach((p: any) => {
              initialCart[p.id] = { qty: 1, takeawayQty: 1 };
            });
            setCart(initialCart);
          }
        }
        if (resC.ok) {
          const dC = await resC.json();
          setCategories(Array.isArray(dC) ? dC : []);
        }
        if (resN.ok) {
          const nData = await resN.json();
          if (nData.latitud) setBizLat(parseFloat(nData.latitud));
          if (nData.longitud) setBizLng(parseFloat(nData.longitud));
          let cfg: any = {};
          if (typeof nData.configuracion === 'string') {
            try { cfg = JSON.parse(nData.configuracion); } catch { cfg = {}; }
          } else {
            cfg = nData.configuracion || {};
          }
          if (cfg.deliveryConfig) setDeliveryConfig(cfg.deliveryConfig);
          if (cfg.packagingConfig?.amount) setPackagingAmount(parseFloat(cfg.packagingConfig.amount));
        }
      } catch (e) {
        console.error('Error loading catalogue:', e);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadCatalogue();
  }, []);

  // Keyboard shortcut Ctrl+K to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Haversine Distance Calculation
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  const distanceKm = (lat && lng && bizLat && bizLng) ? calculateDistance(bizLat, bizLng, lat, lng) : 4.55;

  const computedDeliveryCost = (() => {
    if (tipoEntrega !== 'DELIVERY_ORDER') return 0;
    const cfg = deliveryConfig || { 
      enabled: true, 
      baseCost: 1.5, 
      costPerKm: 0.25, 
      zones: [
        { minKm: 0, maxKm: 3, cost: 1.50 },
        { minKm: 3, maxKm: 5, cost: 2.50 },
        { minKm: 5, maxKm: 10, cost: 4.00 }
      ]
    };
    if (cfg.zones && Array.isArray(cfg.zones) && cfg.zones.length > 0) {
      const matchedZone = cfg.zones.find((z: any) => distanceKm >= z.minKm && distanceKm < z.maxKm);
      if (matchedZone) return matchedZone.cost;
    }
    return Math.round(((cfg.baseCost || 1.5) + (distanceKm * (cfg.costPerKm || 0.25))) * 100) / 100;
  })();

  // Cart Steppers & Controls
  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || { qty: 0, takeawayQty: 0 };
      const nextQty = Math.max(0, current.qty + delta);
      if (nextQty === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      let nextTakeaway = current.takeawayQty;
      if (delta > 0 && (tipoEntrega === 'PICKUP_ORDER' || tipoEntrega === 'DELIVERY_ORDER')) {
        nextTakeaway += delta;
      }
      nextTakeaway = Math.min(nextQty, Math.max(0, nextTakeaway));
      return {
        ...prev,
        [id]: { qty: nextQty, takeawayQty: nextTakeaway }
      };
    });
  };

  const removeItem = (id: string) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const clearCart = () => setCart({});

  // Selected Cart Items Summary
  const selectedItems = Object.entries(cart).map(([id, entry]) => {
    const p = products.find(prod => prod.id === id);
    return {
      productoId: id,
      nombreProducto: p?.nombre || 'Producto Especial',
      precioUnitario: p?.precio || 0,
      cantidad: entry.qty,
      takeawayQty: entry.takeawayQty,
      imagenUrl: p?.imagenUrl
    };
  }).filter(i => i.cantidad > 0);

  const subtotal = selectedItems.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0);
  const totalItemsCount = selectedItems.reduce((acc, i) => acc + i.cantidad, 0);
  const totalTakeawayUnits = selectedItems.reduce((acc, i) => acc + i.takeawayQty, 0);

  const packagingCost = totalTakeawayUnits * packagingAmount;
  const grandTotal = Math.max(0, subtotal + packagingCost + computedDeliveryCost);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCatId === 'ALL' || p.categoriaId === selectedCatId;
    const matchSearch = !searchQuery || p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Submit Order directly to kitchen
  const handleSubmitOrder = async () => {
    if (selectedItems.length === 0) {
      alert('Selecciona al menos un producto para tomar la orden');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCliente,
          telefonoCliente: telefonoCliente || '0991234567',
          direccionCliente: tipoEntrega === 'DELIVERY_ORDER' ? direccionCliente : null,
          referenciaCliente: tipoEntrega === 'DELIVERY_ORDER' ? referenciaCliente : null,
          tipoEntrega,
          metodoPago,
          mesaCode: tipoEntrega === 'TABLE_ORDER' ? mesaCode : null,
          autoConfirm: true,
          items: selectedItems.map(i => ({
            productoId: i.productoId,
            nombreProducto: i.takeawayQty > 0 ? `${i.nombreProducto} (${i.takeawayQty} para llevar)` : i.nombreProducto,
            precioUnitario: i.precioUnitario,
            cantidad: i.cantidad
          }))
        })
      });

      if (res.ok) {
        alert('¡Orden enviada a cocina con éxito!');
        clearCart();
        fetchOrders();
        setShowPOSModal(false);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al enviar orden');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión al enviar la orden');
    } finally {
      setSubmitting(false);
    }
  };

  // Theme styling definitions matching screenshots 1:1
  const isDark = theme === 'dark';

  const themeClasses = {
    bgApp: isDark ? 'bg-[#0b0e17] text-white' : 'bg-[#fdfbf7] text-slate-900',
    sidebar: isDark ? 'bg-[#121026] border-[#1e1b40]' : 'bg-white border-slate-200',
    header: isDark ? 'bg-[#121026] border-[#1e1b40]' : 'bg-white border-slate-200',
    card: isDark ? 'bg-[#181534] border-[#272352] text-white' : 'bg-white border-slate-200 text-slate-900',
    cartPanel: isDark ? 'bg-[#14122d] border-[#231f4a] text-white' : 'bg-white border-slate-200 text-slate-900',
    inputBg: isDark ? 'bg-[#1e1b40] border-[#2e2a5e] text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400',
    accentBtn: isDark ? 'bg-[#6366f1] text-white hover:bg-[#5558e6]' : 'bg-[#ea580c] text-white hover:bg-[#c2410c]',
    accentBadge: isDark ? 'bg-[#6366f1]/20 text-[#818cf8] border-[#6366f1]/30' : 'bg-[#ea580c]/10 text-[#ea580c] border-[#ea580c]/20',
    catTabActive: isDark ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/25' : 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/25',
    catTabInactive: isDark ? 'bg-[#1e1b40] text-slate-300 hover:bg-[#272352]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    priceText: isDark ? 'text-[#34d399]' : 'text-[#ea580c]',
    stepperBtn: isDark ? 'bg-[#272352] hover:bg-[#342f69] text-white' : 'bg-[#fff7ed] hover:bg-[#ffedd5] text-[#ea580c]',
    submitBtn: isDark ? 'bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-[#10b981]/25' : 'bg-[#059669] hover:bg-[#047857] text-white shadow-lg shadow-[#059669]/25',
  };

  return (
    <div className={`min-h-screen font-sans ${themeClasses.bgApp} flex flex-col overflow-hidden`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─── TOP HEADER BAR (Coincide exacto con captura) ────────────────── */}
      <header className={`h-16 px-4 sm:px-6 border-b ${themeClasses.header} flex items-center justify-between gap-4 sticky top-0 z-40 shadow-sm`}>
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-md">
            <Flame className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight uppercase flex items-center gap-1.5">
              LA PARRILLA <span className={isDark ? 'text-[#a78bfa]' : 'text-[#ea580c]'}>CITIOX</span>
            </h1>
          </div>
        </div>

        {/* Global Search Bar (Center) */}
        <div className="relative flex-1 max-w-xl mx-4 hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="pos-search-input"
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-20 py-2 rounded-xl text-xs font-semibold ${themeClasses.inputBg} outline-none focus:ring-2 ${isDark ? 'focus:ring-[#6366f1]' : 'focus:ring-[#ea580c]'} transition-all`}
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-md border ${isDark ? 'bg-[#121026] text-slate-400 border-[#2e2a5e]' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
            Ctrl + K
          </span>
        </div>

        {/* Right Top Bar Quick Controls & Theme Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-[#1e1b40] border-[#2e2a5e] text-amber-400 hover:bg-[#272352]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mode Pill Badges */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl bg-[#1e1b40]/30 border border-[#2e2a5e]/40">
            <button
              onClick={() => setTipoEntrega('TABLE_ORDER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${tipoEntrega === 'TABLE_ORDER' ? themeClasses.accentBtn : 'text-slate-400 hover:text-white'}`}
            >
              <Utensils className="w-3.5 h-3.5" /> Mesa / Cliente
            </button>
            <button
              onClick={() => setTipoEntrega('DELIVERY_ORDER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${tipoEntrega === 'DELIVERY_ORDER' ? themeClasses.accentBtn : 'text-slate-400 hover:text-white'}`}
            >
              <Bike className="w-3.5 h-3.5" /> Domicilio
            </button>
          </div>

          {/* Caja Selector */}
          <button className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${isDark ? 'bg-[#1e1b40] border-[#2e2a5e] text-white' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
            <span>Caja</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-md">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
              alt="User"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* ─── MAIN APP CONTAINER ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT SIDEBAR NAVIGATION ─────────────────────────────────── */}
        <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-56'} ${themeClasses.sidebar} border-r transition-all duration-200 flex flex-col justify-between hidden md:flex shrink-0 z-20`}>
          <div className="p-3 space-y-4">
            
            {/* Primary Action Button: Nueva Orden */}
            <button
              onClick={() => setShowPOSModal(true)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider ${themeClasses.accentBtn} shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              {!isSidebarCollapsed && <span>Nueva Orden</span>}
            </button>

            {/* Nav Menu Links */}
            <nav className="space-y-1">
              {[
                { label: 'Órdenes', icon: FileText, active: true },
                { label: 'Mesas', icon: Utensils, active: false },
                { label: 'Clientes', icon: User, active: false },
                { label: 'Productos', icon: ShoppingBag, active: false },
                { label: 'Promociones', icon: Percent, active: false },
                { label: 'Reportes', icon: Award, active: false },
                { label: 'Configuración', icon: Settings, active: false },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    item.active
                      ? isDark
                        ? 'bg-[#1e1b40] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-900 font-extrabold'
                      : isDark
                        ? 'text-slate-400 hover:bg-[#181534] hover:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${item.active ? (isDark ? 'text-[#818cf8]' : 'text-[#ea580c]') : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom Sidebar Config Card & Toggle */}
          <div className="p-3 space-y-3">
            {!isSidebarCollapsed && !isDark && (
              <div className="p-3.5 bg-emerald-950 text-white rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">¿Sabías que?</span>
                </div>
                <p className="text-[11px] text-emerald-200 leading-tight">
                  Activa el seguimiento en tiempo real para tus envíos a domicilio.
                </p>
                <button className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors">
                  Configurar
                </button>
              </div>
            )}

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${isDark ? 'text-slate-400 hover:text-white hover:bg-[#1e1b40]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} transition-all`}
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
              {!isSidebarCollapsed && <span>Ocultar menú</span>}
            </button>
          </div>
        </aside>

        {/* ─── CENTER PRODUCT CATALOG GRID (65% Width) ────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
          
          {/* Category Tabs & View Options Filter Bar */}
          <div className={`p-4 ${themeClasses.header} border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0`}>
            
            {/* Category Pills (Exact replica of screenshots) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                <Utensils className="w-3.5 h-3.5" /> Menú de Productos
              </span>

              <button
                onClick={() => setSelectedCatId('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCatId === 'ALL' ? themeClasses.catTabActive : themeClasses.catTabInactive
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> TODOS
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider shrink-0 transition-all ${
                    selectedCatId === cat.id ? themeClasses.catTabActive : themeClasses.catTabInactive
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}

              <button className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 border ${isDark ? 'bg-[#1e1b40] text-slate-300 border-[#2e2a5e]' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                + EXTRAS
              </button>
            </div>

            {/* Sort & Grid View Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${themeClasses.inputBg} outline-none cursor-pointer`}
              >
                <option value="populares">Más vendidos ∨</option>
                <option value="precio_asc">Precio: Menor a Mayor</option>
                <option value="precio_desc">Precio: Mayor a Menor</option>
              </select>

              <div className={`flex p-0.5 rounded-xl border ${isDark ? 'bg-[#121026] border-[#2e2a5e]' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'grid' ? (isDark ? 'bg-[#6366f1] text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-400'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'list' ? (isDark ? 'bg-[#6366f1] text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-400'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider">Cargando menú de productos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">No se encontraron productos en este menú</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                {filteredProducts.map((product) => {
                  const cartEntry = cart[product.id] || { qty: 0, takeawayQty: 0 };
                  const qty = cartEntry.qty;

                  return (
                    <div
                      key={product.id}
                      className={`${themeClasses.card} rounded-2xl border overflow-hidden p-3 transition-all duration-200 hover:shadow-xl flex flex-col justify-between group relative`}
                    >
                      {/* Product Image & Badge */}
                      <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-800 mb-3">
                        <img
                          src={product.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500'}
                          alt={product.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.popular && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md">
                            Popular
                          </span>
                        )}
                      </div>

                      {/* Title & Price */}
                      <div className="space-y-1 mb-3">
                        <h3 className="font-extrabold text-sm line-clamp-1">{product.nombre}</h3>
                        <p className={`font-black text-sm ${themeClasses.priceText}`}>
                          ${(Number(product.precio) || 0).toFixed(2)}
                        </p>
                      </div>

                      {/* Stepper Controls ([-  0  +]) Exact match */}
                      <div className={`flex items-center justify-between p-1 rounded-xl border ${isDark ? 'bg-[#121026] border-[#2e2a5e]' : 'bg-slate-50 border-slate-200'}`}>
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          disabled={qty === 0}
                          className={`w-8 h-7 rounded-lg font-black text-sm flex items-center justify-center transition-all disabled:opacity-30 ${themeClasses.stepperBtn}`}
                        >
                          -
                        </button>
                        <span className="font-extrabold text-xs px-3">{qty}</span>
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          className={`w-8 h-7 rounded-lg font-black text-sm flex items-center justify-center transition-all ${themeClasses.stepperBtn}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expand More Button */}
            <div className="text-center pt-4 pb-8">
              <button className={`px-5 py-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 ${isDark ? 'bg-[#1e1b40] text-slate-300 border-[#2e2a5e] hover:bg-[#272352]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                Ver más productos <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* ─── RIGHT CART & CHECKOUT PANEL (35% Width) ───────────────── */}
        <aside className={`w-full lg:w-[420px] xl:w-[460px] ${themeClasses.cartPanel} border-l flex flex-col justify-between shrink-0 z-30 shadow-2xl overflow-y-auto`}>
          
          {/* Cart Header */}
          <div className={`p-4 border-b ${isDark ? 'border-[#231f4a] bg-[#121026]' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <ShoppingBag className={`w-4 h-4 ${isDark ? 'text-[#818cf8]' : 'text-[#ea580c]'}`} />
              <h2 className="font-extrabold text-sm uppercase tracking-wider">Orden Actual</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${themeClasses.accentBadge}`}>
                {totalItemsCount}
              </span>
            </div>
            <button
              onClick={clearCart}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Vaciar
            </button>
          </div>

          <div className="p-4 space-y-5 flex-1 overflow-y-auto">
            
            {/* Delivery Type Segmented Control */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Tipo de Entrega</label>
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-2xl border ${isDark ? 'bg-[#121026] border-[#2e2a5e]' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('TABLE_ORDER')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${tipoEntrega === 'TABLE_ORDER' ? themeClasses.accentBtn : 'text-slate-400 hover:text-white'}`}
                >
                  <Utensils className="w-3.5 h-3.5" /> En Mesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('PICKUP_ORDER')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${tipoEntrega === 'PICKUP_ORDER' ? themeClasses.accentBtn : 'text-slate-400 hover:text-white'}`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Para Llevar
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('DELIVERY_ORDER')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${tipoEntrega === 'DELIVERY_ORDER' ? themeClasses.accentBtn : 'text-slate-400 hover:text-white'}`}
                >
                  <Bike className="w-3.5 h-3.5" /> A Domicilio
                </button>
              </div>
            </div>

            {/* Delivery Address Card (Exact replica of screenshot) */}
            {tipoEntrega === 'DELIVERY_ORDER' && (
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-[#181534] border-[#272352]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dirección de Entrega</span>
                  <button
                    onClick={() => setShowMapModal(true)}
                    className={`text-xs font-bold ${isDark ? 'text-[#818cf8]' : 'text-[#ea580c]'} hover:underline`}
                  >
                    Cambiar
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 shrink-0 ${isDark ? 'text-rose-400' : 'text-[#ea580c]'}`} />
                    <p className="font-extrabold text-xs line-clamp-1">{direccionCliente}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-6">{referenciaCliente}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    📍 {distanceKm} km de distancia
                  </span>
                  <span className={`font-black px-2 py-0.5 rounded-md ${themeClasses.accentBadge}`}>
                    Tarifa: ${computedDeliveryCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Table Code Input */}
            {tipoEntrega === 'TABLE_ORDER' && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Mesa / Ubicación</label>
                <input
                  type="text"
                  value={mesaCode}
                  onChange={e => setMesaCode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold ${themeClasses.inputBg} outline-none`}
                  placeholder="Ej. Mesa 01"
                />
              </div>
            )}

            {/* Customer Information inputs */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold ${themeClasses.inputBg} outline-none`}
                  placeholder="Nombre Cliente"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">🇪🇨</span>
                  <input
                    type="text"
                    value={telefonoCliente}
                    onChange={e => setTelefonoCliente(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs font-bold ${themeClasses.inputBg} outline-none`}
                    placeholder="099 123 4567"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List Table */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                <span>Producto</span>
                <span className="mr-8">Cant.</span>
                <span>Precio</span>
              </div>

              {selectedItems.length === 0 ? (
                <div className={`p-8 border border-dashed rounded-2xl text-center text-xs text-slate-400 ${isDark ? 'border-[#272352]' : 'border-slate-200'}`}>
                  Selecciona productos del menú para armar el pedido.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedItems.map(item => (
                    <div
                      key={item.productoId}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${isDark ? 'bg-[#181534] border-[#272352]' : 'bg-slate-50 border-slate-200'}`}
                    >
                      {/* Thumbnail & Title */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={item.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=100'}
                          alt={item.nombreProducto}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs truncate">{item.nombreProducto}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">${item.precioUnitario.toFixed(2)} c/u</p>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${isDark ? 'bg-[#121026] border-[#2e2a5e]' : 'bg-white border-slate-200'}`}>
                        <button
                          onClick={() => updateQty(item.productoId, -1)}
                          className="w-4 h-4 flex items-center justify-center font-black text-xs hover:text-rose-500"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-xs w-4 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => updateQty(item.productoId, 1)}
                          className="w-4 h-4 flex items-center justify-center font-black text-xs hover:text-emerald-500"
                        >
                          +
                        </button>
                      </div>

                      {/* Total & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-xs">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                        <button
                          onClick={() => removeItem(item.productoId)}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotals & Final Price Calculation */}
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#181534] border-[#272352]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>Subtotal productos</span>
                <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>Empaque ({totalTakeawayUnits} productos) ℹ️</span>
                <span className="font-bold text-white">${packagingCost.toFixed(2)}</span>
              </div>
              {tipoEntrega === 'DELIVERY_ORDER' && (
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>Entrega ({distanceKm} km)</span>
                  <span className="font-bold text-white">${computedDeliveryCost.toFixed(2)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                <span className="font-black text-sm uppercase tracking-wider">TOTAL A COBRAR</span>
                <span className="font-black text-2xl text-emerald-400">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Mandatory Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Método de Pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'EFECTIVO', label: '💵 Efectivo' },
                  { id: 'TRANSFERENCIA', label: '🏦 Transferencia' },
                  { id: 'TARJETA', label: '💳 Tarjeta' },
                  { id: 'MIXTO', label: '🔀 Mixto' },
                  { id: 'OTRO', label: '📝 Otro' },
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMetodoPago(pm.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      metodoPago === pm.id
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                        : isDark ? 'bg-[#181534] border-[#272352] text-slate-300 hover:border-slate-500' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || selectedItems.length === 0}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider ${themeClasses.submitBtn} disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ChefHat className="w-4 h-4" />
                  CONFIRMAR ORDEN Y ENVIAR A COCINA
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-semibold">
              Se enviará a cocina después de confirmar la orden
            </p>
          </div>
        </aside>
      </div>

      {/* Map Selection Modal for GPS Delivery */}
      <MapSelectionModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={lat}
        initialLng={lng}
        onConfirmLocation={(newLat, newLng) => {
          setLat(newLat);
          setLng(newLng);
          setShowMapModal(false);
          const dist = calculateDistance(bizLat, bizLng, newLat, newLng);
          setDireccionCliente(`Ubicación GPS (${dist} km) - Lat: ${newLat.toFixed(4)}, Lng: ${newLng.toFixed(4)}`);
        }}
      />
    </div>
  );
}

export default function AdminPedidos() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-[#0b0e17]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    }>
      <PedidosContent />
    </Suspense>
  );
}
