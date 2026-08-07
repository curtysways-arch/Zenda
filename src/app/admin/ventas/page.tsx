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
  ChefHat, Loader2, Navigation, Percent, Award, Store
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
  const [tipoEntrega, setTipoEntrega] = useState<'DELIVERY_ORDER' | 'PICKUP_ORDER' | 'TABLE_ORDER'>('PICKUP_ORDER');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO' | 'OTRO'>('EFECTIVO');
  const [direccionCliente, setDireccionCliente] = useState('Venta Directa Mostrador');
  const [referenciaCliente, setReferenciaCliente] = useState('');
  const [mesaCode, setMesaCode] = useState('POS-Virtual');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pagarInmediato, setPagarInmediato] = useState(false);

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
          if (Array.isArray(dP) && dP.length > 0) {
            const initialCart: { [id: string]: CartEntry } = {};
            dP.slice(0, 2).forEach((p: any) => {
              initialCart[p.id] = { qty: 1, takeawayQty: 0 };
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
  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || { qty: 0, takeawayQty: 0 };
      const nextQty = Math.max(0, current.qty + delta);
      if (nextQty === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      const nextTakeaway = Math.min(current.takeawayQty, nextQty);
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

  const clearCart = () => setCart({});

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
          mesaCode: tipoEntrega === 'TABLE_ORDER' ? mesaCode : 'POS',
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
        alert(pagarInmediato ? '¡Venta POS Cobrada y enviada a cocina!' : '¡Orden POS enviada a cocina! Pendiente de cobro en Caja.');
        clearCart();
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

  return (
    <div className="-m-5 md:-m-8 -mb-40 md:-mb-10 bg-[#faf8f5] text-slate-900 flex flex-col font-sans p-2.5 sm:p-3 h-[calc(100vh-42px)] overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─── MAIN POS CONTENT GRID ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 items-stretch h-full overflow-hidden">

        {/* ─── CATÁLOGO DE PRODUCTOS ─── */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col justify-between h-full overflow-hidden">
          
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
                          src={product.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500'}
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
        <div className="w-full lg:w-[360px] xl:w-[410px] bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col justify-between h-full overflow-hidden shrink-0">
          
          {/* Top Controls */}
          <div className="shrink-0 space-y-2">
            
            {/* Header Venta POS */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#ea580c]" />
                <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Orden POS Activa</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ea580c]/10 text-[#ea580c]">
                  {totalItemsCount}
                </span>
              </div>
              <button
                onClick={clearCart}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Vaciar
              </button>
            </div>

            {/* Tipo de Entrega Switcher */}
            <div>
              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Tipo de Entrega</label>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTipoEntrega('PICKUP_ORDER')}
                  className={`py-1 px-0.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    tipoEntrega === 'PICKUP_ORDER'
                      ? 'bg-[#ea580c] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3" /> Mostrador
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('TABLE_ORDER')}
                  className={`py-1 px-0.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    tipoEntrega === 'TABLE_ORDER'
                      ? 'bg-[#ea580c] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Utensils className="w-3 h-3" /> En Mesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('DELIVERY_ORDER')}
                  className={`py-1 px-0.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    tipoEntrega === 'DELIVERY_ORDER'
                      ? 'bg-[#ea580c] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bike className="w-3 h-3" /> Domicilio
                </button>
              </div>
            </div>

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
          </div>

          {/* Tabla de Productos en Carrito (Flex-1 Amplio con Scroll Interno) */}
          <div className="flex-1 my-1 overflow-hidden flex flex-col min-h-[140px]">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1 shrink-0">
              <span>Producto</span>
              <span className="mr-4">Empaque / Cant.</span>
              <span>Precio</span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-3 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Selecciona productos del menú POS.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar max-h-[220px] xl:max-h-[280px]">
                {selectedItems.map(item => (
                  <div
                    key={item.productoId}
                    className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-1.5 hover:bg-slate-100/80 transition-colors"
                  >
                    {/* Thumbnail & Nombre */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <img
                        src={item.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=100'}
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

          {/* Bottom Totals & Submit Action */}
          <div className="shrink-0 space-y-1.5 pt-1 border-t border-slate-100">
            {/* Totales */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                <span>Subtotal productos</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                <span>Empaque ({totalTakeawayUnits} uds)</span>
                <span className="font-bold text-slate-900">${packagingCost.toFixed(2)}</span>
              </div>
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

            {/* Submit Action Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || selectedItems.length === 0}
              className="w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ChefHat className="w-3.5 h-3.5" />
                  {pagarInmediato ? 'COBRAR Y ENVIAR A COCINA' : 'ENVIAR A COCINA (COBRO EN CAJA)'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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
