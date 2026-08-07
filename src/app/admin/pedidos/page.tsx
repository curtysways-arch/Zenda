'use client';
// src/app/admin/pedidos/page.tsx
// Módulo de Pedidos en Caja (POS Citiox Enterprise)
// Selección de empaque no activa por defecto por producto + Corrección de scroll y margen móvil.

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
            dP.slice(0, 3).forEach((p: any) => {
              // Empaque NUNCA activo por defecto (takeawayQty = 0)
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
  // NOTA: takeawayQty NUNCA se activa solo. Permanece en 0 a menos que el usuario lo cambie expresamente.
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

  // Selector específico de cantidad de empaque para llevar por producto
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
            nombreProducto: i.takeawayQty > 0 ? `${i.nombreProducto} (${i.takeawayQty} con empaque)` : i.nombreProducto,
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
    <div className="-m-5 md:-m-8 mb-0 md:-mb-10 bg-[#faf8f5] text-slate-900 flex flex-col font-sans p-3 sm:p-4 pb-28 md:pb-6 min-h-screen overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─── MAIN POS CONTENT GRID (Izquierda: Catálogo | Derecha: Orden Actual) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch">

        {/* ─── CATÁLOGO DE PRODUCTOS (65% - 70% Width) ────────────────────────── */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Header del Catálogo & Buscador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              
              {/* Título & Pestañas de Categorías */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-sm font-black text-slate-900 flex items-center gap-1.5 mr-2 shrink-0">
                  <Utensils className="w-4 h-4 text-[#ea580c]" /> Menú de Productos
                </span>

                <button
                  onClick={() => setSelectedCatId('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                      selectedCatId === cat.id
                        ? 'bg-[#ea580c] text-white shadow-md shadow-[#ea580c]/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}

                <button className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                  + EXTRAS
                </button>
              </div>

              {/* Buscador & Vistas */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-44 sm:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id="pos-search-input"
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-10 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-[#ea580c]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 px-1 bg-slate-200 rounded">
                    Ctrl+K
                  </span>
                </div>

                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value)}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer"
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

            {/* Grid de Productos (4 Columnas con Scroll Interno) */}
            <div className="max-h-[calc(100vh-170px)] overflow-y-auto pr-1">
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
                <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3" : "space-y-2.5"}>
                  {filteredProducts.map((product) => {
                    const cartEntry = cart[product.id] || { qty: 0, takeawayQty: 0 };
                    const qty = cartEntry.qty;

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-2 transition-all duration-200 hover:shadow-md flex flex-col justify-between group relative"
                      >
                        {/* Imagen & Badge Popular */}
                        <div className="relative w-full h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-100 mb-1.5">
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
                        <div className="flex items-center justify-between p-0.5 rounded-xl bg-[#fff7ed] border border-[#ffedd5]">
                          <button
                            onClick={() => updateQty(product.id, -1)}
                            disabled={qty === 0}
                            className="w-6 h-5 rounded-lg font-black text-xs bg-white text-[#ea580c] hover:bg-[#ffedd5] flex items-center justify-center transition-all disabled:opacity-30 shadow-sm cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-xs px-1 text-[#ea580c]">{qty}</span>
                          <button
                            onClick={() => updateQty(product.id, 1)}
                            className="w-6 h-5 rounded-lg font-black text-xs bg-white text-[#ea580c] hover:bg-[#ffedd5] flex items-center justify-center transition-all shadow-sm cursor-pointer"
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

          {/* Expander Bottom */}
          <div className="text-center pt-2 pb-1 border-t border-slate-100 mt-2">
            <button className="px-4 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 shadow-sm">
              Ver más productos <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ─── ORDEN ACTUAL & CHECKOUT (Compacto & 100% Completo en Pantalla) ────────────────── */}
        <div className="w-full lg:w-[360px] xl:w-[420px] bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 space-y-2.5 shrink-0 flex flex-col justify-between">
          <div className="space-y-2.5">
            
            {/* Header Orden Actual */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#ea580c]" />
                <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Orden Actual</h2>
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
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Tipo de Entrega</label>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTipoEntrega('TABLE_ORDER')}
                  className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    tipoEntrega === 'TABLE_ORDER'
                      ? 'bg-[#ea580c] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Utensils className="w-3 h-3" /> En Mesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('PICKUP_ORDER')}
                  className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    tipoEntrega === 'PICKUP_ORDER'
                      ? 'bg-[#ea580c] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3" /> Para Llevar
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('DELIVERY_ORDER')}
                  className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    tipoEntrega === 'DELIVERY_ORDER'
                      ? 'bg-[#ea580c] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bike className="w-3 h-3" /> A Domicilio
                </button>
              </div>
            </div>

            {/* Dirección de Entrega Card */}
            {tipoEntrega === 'DELIVERY_ORDER' && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Dirección de Entrega</span>
                  <button
                    onClick={() => setShowMapModal(true)}
                    className="text-[11px] font-bold text-[#ea580c] hover:underline cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-[#ea580c]" />
                    <p className="font-extrabold text-[11px] text-slate-900 line-clamp-1">{direccionCliente}</p>
                  </div>
                  <p className="text-[9px] text-slate-400 pl-5">{referenciaCliente}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                  <span className="text-slate-500 flex items-center gap-1 text-[9px]">
                    📍 {distanceKm} km de distancia
                  </span>
                  <span className="font-black px-1.5 py-0.5 rounded bg-[#ea580c]/10 text-[#ea580c] text-[9px]">
                    Tarifa: ${computedDeliveryCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Mesa Input */}
            {tipoEntrega === 'TABLE_ORDER' && (
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Mesa / Ubicación</label>
                <input
                  type="text"
                  value={mesaCode}
                  onChange={e => setMesaCode(e.target.value)}
                  className="w-full px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  placeholder="Ej. Mesa 01"
                />
              </div>
            )}

            {/* Cliente Inputs */}
            <div className="space-y-1">
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Cliente</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  className="w-full px-2 py-1 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  placeholder="Nombre Cliente"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">🇪🇨</span>
                  <input
                    type="text"
                    value={telefonoCliente}
                    onChange={e => setTelefonoCliente(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                    placeholder="099 123 4567"
                  />
                </div>
              </div>
            </div>

            {/* Tabla de Productos en Carrito + Selección de Empaque por Ítem */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">
                <span>Producto</span>
                <span className="mr-5">Cant.</span>
                <span>Precio</span>
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Selecciona productos del menú para armar la orden.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 xl:max-h-44 overflow-y-auto pr-1">
                  {selectedItems.map(item => (
                    <div
                      key={item.productoId}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                    >
                      {/* Fila Principal: Foto, Nombre, Cantidad, Precio y Eliminar */}
                      <div className="flex items-center justify-between gap-1.5">
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

                        {/* Stepper Cantidad General */}
                        <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg border border-slate-200 bg-white">
                          <button
                            onClick={() => updateQty(item.productoId, -1)}
                            className="w-3.5 h-3.5 flex items-center justify-center font-black text-xs text-slate-600 hover:text-rose-500"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-[11px] w-3 text-center text-slate-900">{item.cantidad}</span>
                          <button
                            onClick={() => updateQty(item.productoId, 1)}
                            className="w-3.5 h-3.5 flex items-center justify-center font-black text-xs text-slate-600 hover:text-emerald-600"
                          >
                            +
                          </button>
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

                      {/* Fila Secundaria: Selección manual de Empaque para este Producto */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[9px]">
                        <span className="text-slate-500 font-semibold">¿Empaque para Llevar?</span>
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-md text-amber-900">
                          <ShoppingBag className="w-2.5 h-2.5 text-amber-600" />
                          <span className="font-extrabold uppercase text-[8px]">Empaque:</span>
                          <button
                            type="button"
                            onClick={() => updateTakeawayQty(item.productoId, -1)}
                            disabled={item.takeawayQty === 0}
                            className="w-3.5 h-3.5 flex items-center justify-center font-black bg-amber-200 hover:bg-amber-300 disabled:opacity-30 rounded text-amber-950 text-[9px] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-2.5 text-center font-black text-[9px] text-amber-950">{item.takeawayQty}</span>
                          <button
                            type="button"
                            onClick={() => updateTakeawayQty(item.productoId, 1)}
                            disabled={item.takeawayQty >= item.cantidad}
                            className="w-3.5 h-3.5 flex items-center justify-center font-black bg-amber-200 hover:bg-amber-300 disabled:opacity-30 rounded text-amber-950 text-[9px] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {/* Totales & Subtotales */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                <span>Subtotal productos</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                <span>Empaque ({totalTakeawayUnits} productos) ℹ️</span>
                <span className="font-bold text-slate-900">${packagingCost.toFixed(2)}</span>
              </div>
              {tipoEntrega === 'DELIVERY_ORDER' && (
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Entrega ({distanceKm} km)</span>
                  <span className="font-bold text-slate-900">${computedDeliveryCost.toFixed(2)}</span>
                </div>
              )}
              
              <div className="pt-1 border-t border-slate-200 flex justify-between items-center">
                <span className="font-black text-xs text-slate-900 uppercase tracking-wider">TOTAL A COBRAR</span>
                <span className="font-black text-lg text-emerald-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Método de Pago Selector */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Método de Pago</label>
              <div className="grid grid-cols-3 gap-1">
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
                    className={`py-1 px-1 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
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
              className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ChefHat className="w-3.5 h-3.5" />
                  CONFIRMAR ORDEN Y ENVIAR A COCINA
                </>
              )}
            </button>
            <p className="text-[8px] text-center text-slate-400 font-semibold">
              Se enviará a cocina después de confirmar la orden
            </p>
          </div>
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
