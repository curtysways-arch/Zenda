'use client';
// src/app/admin/ventas/page.tsx
// Módulo de Ventas Rápida (POS Citiox Enterprise)
// Administra únicamente ventas en mostrador/caja. Las órdenes POS permanecen abiertas
// con estadoOperativo = EN_PREPARACION y estadoFinanciero = PENDIENTE (o PAGADO si cobra en POS).

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Flame, Search, Bike, ShoppingBag, Utensils, Trash2, Plus, Minus, X, 
  MapPin, Phone, User, Check, ChevronDown, LayoutGrid, List,
  ChefHat, Loader2, Navigation, Percent, Award, Store, Sparkles, Clock, ArrowRight, CheckCircle2
} from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  categoriaId?: string;
  categoria?: { nombre: string };
  popular?: boolean;
  llevaEmpaque?: boolean;
  precioEmpaque?: number;
}

interface CartEntry {
  qty: number;
  takeawayQty: number;
}

function VentasContent() {
  const searchParams = useSearchParams();

  // State
  const [nombreCliente, setNombreCliente] = useState('Cliente POS');
  const [telefonoCliente, setTelefonoCliente] = useState('0991234567');
  const [tipoEntrega, setTipoEntrega] = useState<'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'TABLE_ORDER'>('TABLE_ORDER');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [direccionCliente, setDireccionCliente] = useState('Venta Directa Mostrador');
  const [referenciaCliente, setReferenciaCliente] = useState('');
  const [mesaCode, setMesaCode] = useState('POS-Virtual');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'order'>('catalog');
  const [pagarInmediato, setPagarInmediato] = useState(false);
  const [montoRecibido, setMontoRecibido] = useState<string>('');

  // Business & Delivery GPS Config
  const [bizLat, setBizLat] = useState<number>(-0.180653);
  const [bizLng, setBizLng] = useState<number>(-78.467838);
  const [deliveryConfig, setDeliveryConfig] = useState<any>(null);
  const [packagingAmount, setPackagingAmount] = useState<number>(0.25);

  // Map Selection
  const [showMapModal, setShowMapModal] = useState(false);
  const [lat, setLat] = useState<number | null>(-0.180653);
  const [lng, setLng] = useState<number | null>(-78.467838);

  // Products, Categories, Tables & Cart
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('populares');
  const [cart, setCart] = useState<{ [productId: string]: CartEntry }>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Active Orders Modal, Toast & Addition Mode
  const [showActiveOrdersModal, setShowActiveOrdersModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(false);
  const [selectedOrderForAddition, setSelectedOrderForAddition] = useState<any | null>(null);
  const [pendingConfirmOrder, setPendingConfirmOrder] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [negocioInfo, setNegocioInfo] = useState<any>(null);

  const tipoUpper = (negocioInfo?.tipoNegocio || '').toUpperCase();
  const blueprintId = typeof negocioInfo?.configuracion === 'string'
    ? (() => { try { return JSON.parse(negocioInfo.configuracion).blueprintId; } catch { return undefined; } })()
    : negocioInfo?.configuracion?.blueprintId;
  const isStore = tipoUpper === 'TIENDA' || tipoUpper === 'STORE' || blueprintId === 'STORE';

  const defaultProductImage = isStore
    ? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
    : 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500';

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchActiveOrders = async () => {
    try {
      setLoadingActiveOrders(true);
      const res = await fetch('/api/admin/pedidos');
      if (res.ok) {
        const data = await res.json();
        const activeTableOrders = (Array.isArray(data) ? data : []).filter((p: any) => {
          let extra: any = {};
          if (typeof p.extraInfo === 'string') {
            try { extra = JSON.parse(p.extraInfo); } catch { extra = {}; }
          } else if (p.extraInfo && typeof p.extraInfo === 'object') {
            extra = p.extraInfo;
          }

          const isTableOrder = p.tipoEntrega === 'TABLE_ORDER' || 
                               (p.referenciaCliente && p.referenciaCliente.toLowerCase().includes('mesa') && !p.referenciaCliente.includes('POS-Virtual')) ||
                               (extra.mesaCode && extra.mesaCode !== 'POS' && extra.mesaCode !== 'POS-Virtual');
          
          const isActiveStatus = p.estado === 'RECIBIDO' || p.estado === 'EN_PREPARACION' || p.estado === 'PENDIENTE' || p.estado === 'WAITING_CONFIRMATION';
          return isTableOrder && isActiveStatus;
        });
        setActiveOrders(activeTableOrders);
      }
    } catch (e) {
      console.error('Error cargando pedidos activos de mesa:', e);
    } finally {
      setLoadingActiveOrders(false);
    }
  };

  // Escuchar parámetros de URL (addOrderId, tableName) al venir del centro de mesas
  useEffect(() => {
    const addOrderId = searchParams.get('addOrderId');
    const tableNameParam = searchParams.get('tableName');

    if (tableNameParam) {
      setTipoEntrega('TABLE_ORDER');
      setMesaCode(tableNameParam);
      setPagarInmediato(false);
    }

    if (addOrderId) {
      async function loadTargetOrder() {
        try {
          const res = await fetch('/api/admin/pedidos');
          if (res.ok) {
            const data = await res.json();
            const found = (Array.isArray(data) ? data : []).find((p: any) => p.id === addOrderId);
            if (found) {
              setSelectedOrderForAddition(found);
              showToast(`Modo Adición activado para ${found.referenciaCliente || `Orden #${found.numeroPedido}`}`);
            }
          }
        } catch (e) {
          console.error('Error cargando orden seleccionada:', e);
        }
      }
      loadTargetOrder();
    }
  }, [searchParams]);

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
          setCart({});
        }
        if (resC.ok) {
          const dC = await resC.json();
          setCategories(Array.isArray(dC) ? dC : []);
        }
        if (resN.ok) {
          const nData = await resN.json();
          setNegocioInfo(nData);
          const tUpper = (nData.tipoNegocio || '').toUpperCase();
          const bId = (typeof nData.configuracion === 'string' ? (() => { try { return JSON.parse(nData.configuracion).blueprintId; } catch { return undefined; } })() : nData.configuracion?.blueprintId);
          if (tUpper === 'TIENDA' || tUpper === 'STORE' || bId === 'STORE') {
            setTipoEntrega('PICKUP_ORDER');
          }

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

          // Load tables for current business from admin API
          try {
            const resT = await fetch('/api/admin/mesas');
            if (resT.ok) {
              const dT = await resT.json();
              const realTables = dT.mesas || [];
              setTables(realTables);
              const urlTable = searchParams.get('tableName');
              if (urlTable) {
                setTipoEntrega('TABLE_ORDER');
                setMesaCode(urlTable);
              } else if (realTables.length > 0 && (mesaCode === 'POS-Virtual' || !mesaCode)) {
                setMesaCode(realTables[0].nombre || realTables[0].name);
              }
            }
          } catch (errT) {
            console.error('Error loading tables:', errT);
          }
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

  const distanceKm = (lat && lng && bizLat && bizLng) ? calculateDistance(bizLat, bizLng, lat, lng) : 1.2;

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
  const handleSelectTipoEntrega = (newType: 'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'TABLE_ORDER') => {
    setTipoEntrega(newType);
    if (newType === 'TABLE_ORDER') {
      setPagarInmediato(false);
      if (tables.length > 0 && (!mesaCode || mesaCode === 'POS-Virtual')) {
        setMesaCode(tables[0].name);
      }
    }

    // Auto-asignar empaque si se selecciona Para Llevar o Domicilio para productos que requieren empaque
    if (newType === 'PICKUP_ORDER' || newType === 'DELIVERY_ORDER') {
      setCart(prev => {
        const nextCart = { ...prev };
        let modified = false;
        Object.keys(nextCart).forEach(id => {
          const item = nextCart[id];
          const p = products.find(prod => prod.id === id);
          if (p?.llevaEmpaque !== false && item.takeawayQty < item.qty) {
            nextCart[id] = { ...item, takeawayQty: item.qty };
            modified = true;
          }
        });
        return modified ? nextCart : prev;
      });
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || { qty: 0, takeawayQty: 0 };
      const nextQty = Math.max(0, current.qty + delta);
      if (nextQty === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      
      const p = products.find(prod => prod.id === id);
      const productLlevaEmpaque = p?.llevaEmpaque !== false;
      const isTakeawayOrDelivery = tipoEntrega === 'PICKUP_ORDER' || tipoEntrega === 'DELIVERY_ORDER';

      let nextTakeaway = current.takeawayQty;

      if (delta > 0 && isTakeawayOrDelivery && productLlevaEmpaque) {
        // Al añadir o incrementar en Para Llevar o Domicilio, asignar empaque automáticamente por cada unidad
        nextTakeaway = Math.min(nextQty, current.takeawayQty + delta);
      } else if (delta < 0) {
        // Al reducir unidades del producto, ajustar el empaque para que no supere la cantidad de producto
        nextTakeaway = Math.min(current.takeawayQty, nextQty);
      }

      return {
        ...prev,
        [id]: { qty: nextQty, takeawayQty: nextTakeaway }
      };
    });
  };

  const updateTakeawayQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id];
      if (!current) return prev;
      const nextTakeaway = Math.min(current.qty, Math.max(0, current.takeawayQty + delta));
      return {
        ...prev,
        [id]: { ...current, takeawayQty: nextTakeaway }
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

  const clearCart = () => {
    setCart({});
    setKitchenNotes('');
    setMontoRecibido('');
  };

  // Selected Cart Items Summary (incorporando llevaEmpaque y precioEmpaque por producto)
  const selectedItems = Object.entries(cart).map(([id, entry]) => {
    const p = products.find(prod => prod.id === id);
    return {
      productoId: id,
      nombreProducto: p?.nombre || 'Producto Especial',
      precioUnitario: p?.precio || 0,
      cantidad: entry.qty,
      takeawayQty: p?.llevaEmpaque === false ? 0 : entry.takeawayQty,
      llevaEmpaque: p?.llevaEmpaque !== false,
      precioEmpaque: p?.precioEmpaque ?? 0.25,
      imagenUrl: p?.imagenUrl
    };
  }).filter(i => i.cantidad > 0);

  const subtotal = selectedItems.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0);
  const totalItemsCount = selectedItems.reduce((acc, i) => acc + i.cantidad, 0);
  const totalTakeawayUnits = selectedItems.reduce((acc, i) => acc + i.takeawayQty, 0);

  // Cálculo de empaque sumando el precio individual configurado por producto
  const packagingCost = selectedItems.reduce((acc, i) => acc + (i.takeawayQty * i.precioEmpaque), 0);
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
      showToast('Selecciona al menos un producto para tomar la orden', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const numRecibido = parseFloat(montoRecibido) || 0;
      const numVuelto = Math.max(0, numRecibido - grandTotal);

      if (selectedOrderForAddition) {
        // MODO ADICIÓN A PEDIDO EXISTENTE
        const res = await fetch('/api/admin/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedOrderForAddition.id,
            action: 'ADD_ITEMS_TO_ORDER',
            kitchenNotes: kitchenNotes.trim() || null,
            newItems: selectedItems.map(i => ({
              productoId: i.productoId,
              nombreProducto: i.takeawayQty > 0 ? `${i.nombreProducto} (${i.takeawayQty} con empaque)` : i.nombreProducto,
              precioUnitario: i.precioUnitario,
              cantidad: i.cantidad
            }))
          })
        });

        if (res.ok) {
          showToast(`¡Productos adicionados con éxito a la Orden #${selectedOrderForAddition.numeroPedido}!`);
          clearCart();
          setSelectedOrderForAddition(null);
        } else {
          const errData = await res.json();
          showToast(errData.error || 'Error al adicionar productos al pedido', 'error');
        }
      } else {
        // NUEVA ORDEN POS
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
            montoRecibido: numRecibido > 0 ? numRecibido : grandTotal,
            vuelto: numRecibido > 0 ? numVuelto : 0,
            mesaCode: tipoEntrega === 'TABLE_ORDER' ? mesaCode : 'POS',
            kitchenNotes: kitchenNotes.trim() || null,
            autoConfirm: true,
            paymentStatus: pagarInmediato ? 'PAGADO' : 'PENDIENTE',
            items: selectedItems.map(i => ({
              productoId: i.productoId,
              nombreProducto: i.takeawayQty > 0 ? `${i.nombreProducto} (${i.takeawayQty} con empaque)` : i.nombreProducto,
              precioUnitario: i.precioUnitario,
              cantidad: i.cantidad
            }))
          })
        });

        if (res.ok) {
          showToast(pagarInmediato ? `¡Venta POS Cobrada! (Cambio: $${numVuelto.toFixed(2)})` : '¡Orden POS enviada a cocina! Pendiente de cobro en Caja.');
          clearCart();
          setMobileTab('catalog');
        } else {
          const errData = await res.json();
          showToast(errData.error || 'Error al enviar orden', 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al enviar la orden', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="-m-5 md:-m-8 pb-20 md:pb-0 bg-[#faf8f5] text-slate-900 flex flex-col font-sans p-2 sm:p-3 h-[calc(100dvh-135px)] md:h-[calc(100vh-42px)] overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─── PESTAÑAS MÓVIL (CATÁLOGO vs COMANDA) ─── */}
      <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-2xl gap-1 shrink-0 mb-2 shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === 'catalog'
              ? 'bg-white text-slate-900 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-[#ea580c]" /> Catálogo Menú
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('order')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
            mobileTab === 'order'
              ? 'bg-white text-slate-900 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#ea580c]" /> Comanda
          {totalItemsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#ea580c] text-white shadow-sm ml-1">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── MAIN POS CONTENT GRID ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch h-full overflow-hidden relative">

        {/* ─── CATÁLOGO DE PRODUCTOS ─── */}
        <div className={`flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col justify-between h-full overflow-hidden ${
          mobileTab !== 'catalog' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Header & Categories */}
          <div className="shrink-0 space-y-2.5 border-b border-slate-100 pb-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              
              {/* Título & Pestañas de Categorías */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1 mr-1 shrink-0">
                  <Store className="w-4 h-4 text-[#ea580c]" /> Ventas POS
                </span>

                <button
                  onClick={() => setSelectedCatId('ALL')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                    selectedCatId === 'ALL'
                      ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Flame className="w-3 h-3" /> TODOS
                </button>

                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                      selectedCatId === cat.id
                        ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>

              {/* Buscador & Vistas */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative w-40 sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    id="pos-search-input"
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-9 py-1 rounded-xl text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-[#ea580c]"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 px-1 bg-slate-200 rounded">
                    Ctrl+K
                  </span>
                </div>

                <div className="flex p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded-lg text-xs transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded-lg text-xs transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Productos (Flex-1 con Scroll Interno) */}
          <div className="flex-1 overflow-y-auto pr-1 py-1 custom-scrollbar">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-[#ea580c] mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Cargando menú de productos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">No se encontraron productos</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5" : "space-y-2"}>
                {filteredProducts.map((product) => {
                  const cartEntry = cart[product.id] || { qty: 0, takeawayQty: 0 };
                  const qty = cartEntry.qty;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden p-2 transition-all duration-200 hover:shadow-md flex flex-col justify-between group relative"
                    >
                      {/* Imagen & Badge Popular */}
                      <div className="relative w-full h-20 sm:h-24 rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                        <img
                          src={product.imagenUrl || defaultProductImage}
                          alt={product.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.popular && (
                          <span className="absolute top-1 right-1 bg-emerald-600 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm">
                            Popular
                          </span>
                        )}
                      </div>

                      {/* Título y Precio */}
                      <div className="space-y-0.5 mb-1.5">
                        <h3 className="font-extrabold text-[11px] text-slate-900 line-clamp-1">{product.nombre}</h3>
                        <p className="font-black text-[11px] text-[#ea580c]">
                          ${(Number(product.precio) || 0).toFixed(2)}
                        </p>
                      </div>

                      {/* Stepper Controls ([-  0  +]) */}
                      <div className="flex items-center justify-between p-0.5 rounded-lg bg-[#fff7ed] border border-[#ffedd5]">
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          disabled={qty === 0}
                          className="w-6 h-5 rounded font-black text-xs bg-white text-[#ea580c] hover:bg-[#ffedd5] flex items-center justify-center transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-xs px-1 text-[#ea580c]">{qty}</span>
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          className="w-6 h-5 rounded font-black text-xs bg-white text-[#ea580c] hover:bg-[#ffedd5] flex items-center justify-center transition-all shadow-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── VENTA POS ACTUAL & CHECKOUT ─── */}
        <div className={`w-full lg:w-[360px] xl:w-[410px] bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col justify-between h-full overflow-hidden shrink-0 ${
          mobileTab !== 'order' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Header Venta POS (Shrink-0) */}
          <div className="shrink-0 pb-1.5 border-b border-slate-100 flex flex-col gap-1.5">
            {/* Botón Volver a Catálogo en móvil */}
            <div className="lg:hidden flex items-center justify-between pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="text-[11px] font-black text-[#ea580c] hover:underline flex items-center gap-1 cursor-pointer py-0.5"
              >
                <span>←</span> Volver a elegir productos
              </button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {totalItemsCount} productos
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#ea580c]" />
                <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Orden POS Activa</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ea580c]/10 text-[#ea580c]">
                  {totalItemsCount}
                </span>
              </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchActiveOrders();
                  setShowActiveOrdersModal(true);
                }}
                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 text-[10px] font-black tracking-tight transition-all flex items-center gap-1 cursor-pointer border border-amber-300"
              >
                <span>📋</span> Adicionar a Pedido
              </button>
              <button
                onClick={clearCart}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Vaciar
              </button>
            </div>
          </div>
        </div>

          {/* Cuerpo Desplazable (Formulario + Productos en Carrito) */}
          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scrollbar">
            
            {/* Banner de Modo Adición si hay un pedido seleccionado */}
            {selectedOrderForAddition && (
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between gap-2 text-[11px] font-extrabold animate-in fade-in">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="shrink-0 text-amber-600">📌</span>
                  <span className="truncate">Adicionando a Orden #{selectedOrderForAddition.numeroPedido} ({selectedOrderForAddition.nombreCliente})</span>
                </div>
                <button
                  onClick={() => setSelectedOrderForAddition(null)}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] rounded-md cursor-pointer shrink-0 font-bold"
                >
                  ✕ Cancelar
                </button>
              </div>
            )}

            {/* Tipo de Entrega Switcher */}
            <div>
              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Tipo de Entrega</label>
              {isStore ? (
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSelectTipoEntrega('PICKUP_ORDER')}
                    className={`py-1 px-0.5 rounded-md text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      tipoEntrega === 'PICKUP_ORDER'
                        ? 'bg-[#ea580c] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Store className="w-3 h-3" /> En Tienda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTipoEntrega('DELIVERY_ORDER')}
                    className={`py-1 px-0.5 rounded-md text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      tipoEntrega === 'DELIVERY_ORDER'
                        ? 'bg-[#ea580c] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bike className="w-3 h-3" /> Domicilio
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSelectTipoEntrega('PICKUP_ORDER')}
                    className={`py-1 px-0.5 rounded-md text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      tipoEntrega === 'PICKUP_ORDER'
                        ? 'bg-[#ea580c] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" /> Para Llevar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTipoEntrega('TABLE_ORDER')}
                    className={`py-1 px-0.5 rounded-md text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      tipoEntrega === 'TABLE_ORDER'
                        ? 'bg-[#ea580c] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Utensils className="w-3 h-3" /> Mesa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTipoEntrega('DELIVERY_ORDER')}
                    className={`py-1 px-0.5 rounded-md text-[10px] font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      tipoEntrega === 'DELIVERY_ORDER'
                        ? 'bg-[#ea580c] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bike className="w-3 h-3" /> Domicilio
                  </button>
                </div>
              )}
            </div>

            {/* Dirección de Entrega & Mapa GPS (Si es a Domicilio) */}
            {tipoEntrega === 'DELIVERY_ORDER' && (
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-start justify-between">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Dirección de Entrega GPS</span>
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="text-[10px] font-bold text-[#ea580c] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <MapPin className="w-3 h-3" /> Ubicar en Mapa
                  </button>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0 text-[#ea580c]" />
                    <p className="font-extrabold text-[10px] text-slate-900 line-clamp-1">{direccionCliente}</p>
                  </div>
                  {referenciaCliente && (
                    <p className="text-[8px] text-slate-400 pl-4">{referenciaCliente}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
                  <span className="text-slate-500 flex items-center gap-1 text-[8px]">
                    📍 {distanceKm} km de distancia
                  </span>
                  <span className="font-black px-1.5 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] text-[8px]">
                    Tarifa: ${computedDeliveryCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Selector Dropdown de Mesas (Si es Mesa y no es Tienda) */}
            {tipoEntrega === 'TABLE_ORDER' && !isStore && (
              <div>
                <label className="block text-[8px] font-black uppercase text-amber-900 tracking-wider mb-0.5 flex items-center gap-1">
                  <Utensils className="w-3 h-3 text-amber-600" /> Seleccionar Mesa
                </label>
                <select
                  value={mesaCode}
                  onChange={e => setMesaCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-amber-50/80 border border-amber-300 text-amber-950 outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {tables.length > 0 ? (
                    tables.map((tbl: any) => {
                      const tName = tbl.nombre || tbl.name;
                      const capStr = tbl.capacidad ? ` (${tbl.capacidad} puestos)` : '';
                      const statusStr = tbl.estado === 'OCUPADA' ? ' (Ocupada)' : ' (Disponible)';
                      return (
                        <option key={tbl.id} value={tName}>
                          {tName}{capStr}{statusStr}
                        </option>
                      );
                    })
                  ) : (
                    <option value="">Sin mesas creadas (Agrega mesas en el módulo Mesas)</option>
                  )}
                </select>
              </div>
            )}

            {/* Cliente Input */}
            <div className="space-y-0.5">
              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Cliente & Referencia</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  placeholder="Nombre Cliente"
                />
                <input
                  type="text"
                  value={telefonoCliente}
                  onChange={e => setTelefonoCliente(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  placeholder="099 123 4567"
                />
              </div>
            </div>

            {/* Recomendación / Observación Input */}
            <div className="space-y-0.5">
              <label className="block text-[8px] font-black uppercase tracking-wider flex items-center gap-1 text-slate-700">
                {isStore ? <ShoppingBag className="w-2.5 h-2.5 text-cyan-600" /> : <ChefHat className="w-2.5 h-2.5 text-amber-600" />}
                <span>{isStore ? 'Observación / Nota de Venta' : 'Recomendación / Nota para Cocina'}</span>
              </label>
              <input
                type="text"
                value={kitchenNotes}
                onChange={e => setKitchenNotes(e.target.value)}
                className="w-full px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-cyan-500 placeholder:text-slate-400"
                placeholder={isStore ? "Ej: Empaque especial de regalo, talla confirmada, factura..." : "Ej: Sin cebolla, término medio, salsa aparte..."}
              />
            </div>


            {/* Tabla de Productos en Carrito */}
            <div className="pt-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1">
                <span>Producto</span>
                <span className="mr-4">{isStore ? 'Cant.' : 'Empaque / Cant.'}</span>
                <span>Precio</span>
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  {isStore ? 'Selecciona productos del catálogo POS.' : 'Selecciona productos del menú POS.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedItems.map(item => (
                    <div
                      key={item.productoId}
                      className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-1.5 hover:bg-slate-100/80 transition-colors"
                    >
                      {/* Thumbnail & Nombre */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img
                          src={item.imagenUrl || defaultProductImage}
                          alt={item.nombreProducto}
                          className="w-7 h-7 rounded-md object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-[11px] text-slate-900 truncate">{item.nombreProducto}</p>
                          <p className="text-[8px] text-slate-400 font-semibold">${item.precioUnitario.toFixed(2)} c/u</p>
                        </div>
                      </div>

                      {/* Controles de Empaque & Cantidad Inline */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.llevaEmpaque ? (
                          <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-md text-amber-900" title={`Precio empaque: $${item.precioEmpaque.toFixed(2)}`}>
                            <ShoppingBag className="w-2.5 h-2.5 text-amber-600" />
                            <button
                              type="button"
                              onClick={() => updateTakeawayQty(item.productoId, -1)}
                              disabled={item.takeawayQty === 0}
                              className="w-3 h-3 flex items-center justify-center font-black bg-amber-200 hover:bg-amber-300 disabled:opacity-30 rounded text-amber-950 text-[9px] cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-2 text-center font-black text-[9px] text-amber-950">{item.takeawayQty}</span>
                            <button
                              type="button"
                              onClick={() => updateTakeawayQty(item.productoId, 1)}
                              disabled={item.takeawayQty >= item.cantidad}
                              className="w-3 h-3 flex items-center justify-center font-black bg-amber-200 hover:bg-amber-300 disabled:opacity-30 rounded text-amber-950 text-[9px] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-[8px] font-extrabold text-slate-400 px-1">Sin Empaque</span>
                        )}

                        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md border border-slate-200 bg-white">
                          <button
                            onClick={() => updateQty(item.productoId, -1)}
                            className="w-3.5 h-3.5 flex items-center justify-center font-black text-[10px] text-slate-600 hover:text-rose-500"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-[10px] w-2.5 text-center text-slate-900">{item.cantidad}</span>
                          <button
                            onClick={() => updateQty(item.productoId, 1)}
                            className="w-3.5 h-3.5 flex items-center justify-center font-black text-[10px] text-slate-600 hover:text-emerald-600"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Total & Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-black text-[11px] text-slate-900">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                        <button
                          onClick={() => removeItem(item.productoId)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Bottom Totals & Submit Action (Fijo Abajo Siempre Visible) */}
          <div className="shrink-0 space-y-1.5 pt-2 border-t border-slate-100 bg-white">
            {/* Totales */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                <span>Subtotal productos</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              {!isStore && (
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>Empaque ({totalTakeawayUnits} uds)</span>
                  <span className="font-bold text-slate-900">${packagingCost.toFixed(2)}</span>
                </div>
              )}
              {tipoEntrega === 'DELIVERY_ORDER' && (
                <div className="flex justify-between text-[10px] text-[#ea580c] font-semibold">
                  <span>Envío a domicilio ({distanceKm} km)</span>
                  <span className="font-bold">${computedDeliveryCost.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-0.5 border-t border-slate-200 flex justify-between items-center">
                <span className="font-black text-[11px] text-slate-900 uppercase tracking-wider">TOTAL A COBRAR</span>
                <span className="font-black text-base text-emerald-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Toggle de Cobro Inmediato vs Cobro en Caja */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0]">
              <span className="text-[10px] font-extrabold text-emerald-900">¿Cobrar de inmediato en POS?</span>
              <button
                type="button"
                onClick={() => setPagarInmediato(!pagarInmediato)}
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                  pagarInmediato ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pagarInmediato ? 'SÍ (Pagado)' : 'NO (Ir a Caja)'}
              </button>
            </div>

            {/* Panel de Método de Pago y Vuelto / Cambio */}
            {pagarInmediato && (
              <div className="p-2 rounded-xl bg-slate-900 text-white space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-300 uppercase">Forma de Pago:</span>
                  <div className="flex gap-1">
                    {(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodoPago(m)}
                        className={`px-2 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${
                          metodoPago === m ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {m === 'EFECTIVO' ? '💵 Efectivo' : m === 'TRANSFERENCIA' ? '🏦 Transf.' : '💳 Tarjeta'}
                      </button>
                    ))}
                  </div>
                </div>

                {metodoPago === 'EFECTIVO' && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-300">Paga con ($):</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'}
                        value={montoRecibido}
                        onChange={e => setMontoRecibido(e.target.value)}
                        className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-black text-right text-amber-300 outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className="font-extrabold text-slate-400 uppercase">Vuelto / Cambio:</span>
                      <span className="font-black text-xs text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        ${(Math.max(0, (parseFloat(montoRecibido) || grandTotal) - grandTotal)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Action Button (PINNED 100% VISIBLE) */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || selectedItems.length === 0}
              className="w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  {isStore ? <ShoppingBag className="w-3.5 h-3.5" /> : <ChefHat className="w-3.5 h-3.5" />}
                  {isStore
                    ? (pagarInmediato ? 'COBRAR Y REGISTRAR VENTA' : 'REGISTRAR VENTA EN MOSTRADOR')
                    : (pagarInmediato ? 'COBRAR Y ENVIAR A COCINA' : 'ENVIAR A COCINA (COBRO EN CAJA)')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── BOTÓN FLOTANTE MÓVIL: VER COMANDA / COBRAR ─── */}
      {mobileTab === 'catalog' && totalItemsCount > 0 && (
        <div className="lg:hidden fixed bottom-24 left-3 right-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setMobileTab('order')}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-2xl shadow-xl shadow-[#ea580c]/40 flex items-center justify-between font-black text-xs active:scale-95 transition-all cursor-pointer border border-white/20"
          >
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-black">
                {totalItemsCount}
              </span>
              <span className="uppercase tracking-wider">Ver Comanda Activa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black">${grandTotal.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Map Selection Modal */}
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
      {/* Toast Floating Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[200] px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-in slide-in-from-top-4 ${
          toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Modal de Pedidos Activos para Adición */}
      {showActiveOrdersModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <span>🍽️</span> {pendingConfirmOrder ? 'Confirmar Adición a Cuenta' : 'Seleccionar Mesa Activa para Adición'}
              </h3>
              <button 
                onClick={() => {
                  setShowActiveOrdersModal(false);
                  setPendingConfirmOrder(null);
                }} 
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {pendingConfirmOrder ? (
              /* PASO DE CONFIRMACIÓN PREVIO A ADICIONAR */
              <div className="space-y-4 animate-in fade-in">
                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-black text-xs uppercase tracking-wider">
                      {pendingConfirmOrder.referenciaCliente || `Mesa Orden #${pendingConfirmOrder.numeroPedido}`}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full">
                      {pendingConfirmOrder.estado}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex justify-between pt-1 border-t border-slate-800">
                    <span>Cliente: <strong>{pendingConfirmOrder.nombreCliente}</strong></span>
                    <span>Productos actuales: <strong>{pendingConfirmOrder.items?.length || 0} ítems</strong></span>
                  </div>
                </div>

                {/* Resumen de totales */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-xs font-bold text-amber-950">
                  <div className="flex justify-between text-slate-600">
                    <span>Total actual de la cuenta:</span>
                    <span>${Number(pendingConfirmOrder.total || 0).toFixed(2)}</span>
                  </div>
                  {selectedItems.length > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Nuevos productos a agregar ({totalItemsCount} uds):</span>
                      <span>+${grandTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-amber-200/60">
                    <span>Nuevo Total Estimado:</span>
                    <span className="text-emerald-600">${(Number(pendingConfirmOrder.total || 0) + grandTotal).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setPendingConfirmOrder(null)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl hover:bg-slate-200"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrderForAddition(pendingConfirmOrder);
                      setPendingConfirmOrder(null);
                      setShowActiveOrdersModal(false);
                      showToast(`Modo Adición activado para Orden #${pendingConfirmOrder.numeroPedido}`);
                    }}
                    className="flex-1 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Adición
                  </button>
                </div>
              </div>
            ) : (
              /* PASO 1: LISTADO DE CUENTAS ABIERTAS */
              <>
                <p className="text-xs text-slate-500 font-medium">
                  Elige la comanda de mesa activa a la cual deseas agregar nuevos productos desde el catálogo POS.
                </p>

                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {loadingActiveOrders ? (
                    <div className="py-10 text-center text-xs font-bold text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                      Cargando comandas de mesa activas...
                    </div>
                  ) : activeOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                      No hay comandas de mesa activas actualmente en preparación.
                    </div>
                  ) : (
                    activeOrders.map((ord: any) => (
                      <div key={ord.id} className="p-4 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between gap-3 transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">Orden #{ord.numeroPedido}</span>
                            {ord.referenciaCliente && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full border border-amber-200">
                                {ord.referenciaCliente}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                              {ord.estado}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-semibold mt-1.5 flex items-center gap-3">
                            <span>Cliente: <strong>{ord.nombreCliente}</strong></span>
                            <span>Ítems: <strong>{ord.items?.length || 0}</strong></span>
                            <span>Total: <strong className="text-slate-900">${ord.total?.toFixed(2) || '0.00'}</strong></span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setPendingConfirmOrder(ord);
                          }}
                          className="px-3.5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <span>Seleccionar</span> <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminVentas() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-[#faf8f5]">
        <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
      </div>
    }>
      <VentasContent />
    </Suspense>
  );
}
