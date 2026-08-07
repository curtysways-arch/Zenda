'use client';
// src/app/admin/pedidos/page.tsx
// Módulo de Pedidos en Caja (POS Citiox Enterprise)
// Ajustado a la parte interna y tema claro limpio (Exacto a la imagen del usuario).

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Flame, Search, Bike, ShoppingBag, Utensils, Trash2, Plus, Minus, X, 
  MapPin, Phone, User, Check, ChevronDown, LayoutGrid, List,
  ChefHat, Loader2, Navigation, Percent, Award
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

function PedidosContent() {
  const searchParams = useSearchParams();

  // State
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
    <div className="min-h-[calc(100vh-80px)] bg-[#faf8f5] text-slate-900 flex flex-col font-sans p-4 sm:p-6 space-y-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─── MAIN POS CONTENT GRID (Izquierda: Catálogo | Derecha: Orden Actual) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">

        {/* ─── CATÁLOGO DE PRODUCTOS (65% Width) ────────────────────────── */}
        <div className="flex-1 w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
          
          {/* Header del Catálogo & Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            
            {/* Título & Pestañas de Categorías */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5 mr-2 shrink-0">
                <Utensils className="w-4 h-4 text-[#ea580c]" /> Menú de Productos
              </span>

              <button
                onClick={() => setSelectedCatId('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  selectedCatId === 'ALL'
                    ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> TODOS
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    selectedCatId === cat.id
                      ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}

              <button className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                + EXTRAS
              </button>
            </div>

            {/* Buscador & Vistas */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  id="pos-search-input"
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-12 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-[#ea580c]"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 px-1 bg-slate-200 rounded">
                  Ctrl+K
                </span>
              </div>

              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer"
              >
                <option value="populares">Más vendidos ∨</option>
                <option value="precio_asc">Menor precio</option>
                <option value="precio_desc">Mayor precio</option>
              </select>

              <div className="flex p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Productos (4 Columnas) */}
          <div className="space-y-6">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#ea580c] mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider">Cargando menú de productos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">No se encontraron productos en esta categoría</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                {filteredProducts.map((product) => {
                  const cartEntry = cart[product.id] || { qty: 0, takeawayQty: 0 };
                  const qty = cartEntry.qty;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-3 transition-all duration-200 hover:shadow-lg flex flex-col justify-between group relative"
                    >
                      {/* Imagen & Badge Popular */}
                      <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <img
                          src={product.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500'}
                          alt={product.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.popular && (
                          <span className="absolute top-2 right-2 bg-emerald-600 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-sm">
                            Popular
                          </span>
                        )}
                      </div>

                      {/* Título y Precio */}
                      <div className="space-y-1 mb-3">
                        <h3 className="font-extrabold text-xs text-slate-900 line-clamp-1">{product.nombre}</h3>
                        <p className="font-black text-sm text-[#ea580c]">
                          ${(Number(product.precio) || 0).toFixed(2)}
                        </p>
                      </div>

                      {/* Stepper Controls ([-  0  +]) */}
                      <div className="flex items-center justify-between p-1 rounded-xl bg-[#fff7ed] border border-[#ffedd5]">
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          disabled={qty === 0}
                          className="w-8 h-7 rounded-lg font-black text-sm bg-white text-[#ea580c] hover:bg-[#ffedd5] flex items-center justify-center transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-xs px-3 text-[#ea580c]">{qty}</span>
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          className="w-8 h-7 rounded-lg font-black text-sm bg-white text-[#ea580c] hover:bg-[#ffedd5] flex items-center justify-center transition-all shadow-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expander Bottom */}
            <div className="text-center pt-2 pb-4">
              <button className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-2 bg-white hover:bg-slate-50 shadow-sm">
                Ver más productos <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── ORDEN ACTUAL & CHECKOUT (35% Width) ────────────────────── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5 shrink-0">
          
          {/* Header Orden Actual */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#ea580c]" />
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Orden Actual</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#ea580c]/10 text-[#ea580c]">
                {totalItemsCount}
              </span>
            </div>
            <button
              onClick={clearCart}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Vaciar
            </button>
          </div>

          {/* Tipo de Entrega Switcher */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Tipo de Entrega</label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setTipoEntrega('TABLE_ORDER')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoEntrega === 'TABLE_ORDER'
                    ? 'bg-[#ea580c] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" /> En Mesa
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrega('PICKUP_ORDER')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoEntrega === 'PICKUP_ORDER'
                    ? 'bg-[#ea580c] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Para Llevar
              </button>
              <button
                type="button"
                onClick={() => setTipoEntrega('DELIVERY_ORDER')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipoEntrega === 'DELIVERY_ORDER'
                    ? 'bg-[#ea580c] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" /> A Domicilio
              </button>
            </div>
          </div>

          {/* Dirección de Entrega Card */}
          {tipoEntrega === 'DELIVERY_ORDER' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dirección de Entrega</span>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="text-xs font-bold text-[#ea580c] hover:underline cursor-pointer"
                >
                  Cambiar
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-[#ea580c]" />
                  <p className="font-extrabold text-xs text-slate-900 line-clamp-1">{direccionCliente}</p>
                </div>
                <p className="text-[11px] text-slate-400 pl-6">{referenciaCliente}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                  📍 {distanceKm} km de distancia
                </span>
                <span className="font-black px-2 py-0.5 rounded-md bg-[#ea580c]/10 text-[#ea580c]">
                  Tarifa: ${computedDeliveryCost.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Mesa Input */}
          {tipoEntrega === 'TABLE_ORDER' && (
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Mesa / Ubicación</label>
              <input
                type="text"
                value={mesaCode}
                onChange={e => setMesaCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                placeholder="Ej. Mesa 01"
              />
            </div>
          )}

          {/* Cliente Inputs */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={nombreCliente}
                onChange={e => setNombreCliente(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                placeholder="Nombre Cliente"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">🇪🇨</span>
                <input
                  type="text"
                  value={telefonoCliente}
                  onChange={e => setTelefonoCliente(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  placeholder="099 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Productos en Carrito */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
              <span>Producto</span>
              <span className="mr-8">Cant.</span>
              <span>Precio</span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                Selecciona productos del menú para armar la orden.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedItems.map(item => (
                  <div
                    key={item.productoId}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                  >
                    {/* Thumbnail & Nombre */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={item.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=100'}
                        alt={item.nombreProducto}
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-slate-900 truncate">{item.nombreProducto}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">${item.precioUnitario.toFixed(2)} c/u</p>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-200 bg-white">
                      <button
                        onClick={() => updateQty(item.productoId, -1)}
                        className="w-4 h-4 flex items-center justify-center font-black text-xs text-slate-600 hover:text-rose-500"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-xs w-4 text-center text-slate-900">{item.cantidad}</span>
                      <button
                        onClick={() => updateQty(item.productoId, 1)}
                        className="w-4 h-4 flex items-center justify-center font-black text-xs text-slate-600 hover:text-emerald-600"
                      >
                        +
                      </button>
                    </div>

                    {/* Total & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-xs text-slate-900">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(item.productoId)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totales & Subtotales */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Subtotal productos</span>
              <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Empaque ({totalTakeawayUnits} productos) ℹ️</span>
              <span className="font-bold text-slate-900">${packagingCost.toFixed(2)}</span>
            </div>
            {tipoEntrega === 'DELIVERY_ORDER' && (
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Entrega ({distanceKm} km)</span>
                <span className="font-bold text-slate-900">${computedDeliveryCost.toFixed(2)}</span>
              </div>
            )}
            
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-black text-sm text-slate-900 uppercase tracking-wider">TOTAL A COBRAR</span>
              <span className="font-black text-2xl text-emerald-600">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Método de Pago Selector */}
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
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    metodoPago === pm.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2"
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
      <div className="flex justify-center items-center h-screen bg-[#faf8f5]">
        <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
      </div>
    }>
      <PedidosContent />
    </Suspense>
  );
}
