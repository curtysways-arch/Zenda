'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Store, ShoppingCart, Search, Plus, Minus, Trash2, CreditCard,
  Banknote, ArrowRightLeft, CheckCircle2, AlertTriangle, Printer,
  RefreshCw, User, X, DollarSign, Lock, Unlock, ArrowLeft, Coffee
} from 'lucide-react';

interface ProductItem {
  id: string;
  nombre: string;
  precio: number;
  imagenUrl?: string | null;
  stock?: number | null;
  sku?: string | null;
  categoriaId?: string | null;
  categoria?: { id: string; nombre: string } | null;
  variantes?: Array<{ id: string; nombre: string; precio?: number | null; stock: number }>;
}

interface CartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
}

export default function CitioxPosPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sesión de caja
  const [cashSession, setCashSession] = useState<any>(null);
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
  const [openingFund, setOpeningFund] = useState('20.00');

  // Carrito
  const [cart, setCart] = useState<CartItem[]>([]);

  // Cliente
  const [customerType, setCustomerType] = useState<'CONSUMIDOR_FINAL' | 'CUSTOM'>('CONSUMIDOR_FINAL');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [clubPhone, setClubPhone] = useState('');
  const [clubResult, setClubResult] = useState<{ puntos: number; nivel?: string | null; saldo?: number; motivo?: string } | null>(null);
  const [issueInvoice, setIssueInvoice] = useState(false);

  // Cobro modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Venta exitosa
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [changeDue, setChangeDue] = useState<number>(0);

  // Carga inicial
  const loadPosData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${slug}/pos/init`);
      if (res.ok) {
        const d = await res.json();
        setBusiness(d.negocio);
        setCategories(d.categorias || []);
        setProducts(d.productos || []);
        setCashSession(d.cashSession);

        if (!d.cashSession) {
          setShowOpenRegisterModal(true);
        }
      }
    } catch (e) {
      console.error('Error cargando POS:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) loadPosData();
  }, [slug]);

  // Apertura de caja
  const handleOpenCashRegister = async () => {
    try {
      const fund = parseFloat(openingFund) || 0;
      const res = await fetch('/api/admin/cash/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingAmount: fund,
          notes: 'Apertura desde POS Táctil'
        })
      });
      if (res.ok) {
        const d = await res.json();
        setCashSession(d.session);
        setShowOpenRegisterModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'No se pudo abrir la caja');
      }
    } catch (e: any) {
      alert('Error de conexión al abrir caja');
    }
  };

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'ALL' || p.categoriaId === selectedCategory;
      const matchesSearch = !searchQuery.trim() ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Agregar al carrito
  const addToCart = (product: ProductItem, variant?: any) => {
    setCart(prev => {
      const variantId = variant?.id || null;
      const existingIndex = prev.findIndex(item => item.productId === product.id && item.variantId === variantId);

      const price = variant?.precio && variant.precio > 0 ? variant.precio : product.precio;
      const name = variant ? `${product.nombre} (${variant.nombre})` : product.nombre;

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [...prev, {
          productId: product.id,
          variantId,
          name,
          price,
          quantity: 1
        }];
      }
    });
  };

  // Actualizar cantidad en carrito
  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      } else {
        updated[index].quantity = newQty;
        return updated;
      }
    });
  };

  // Totales
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const totalCalculated = cartSubtotal;

  // Monto recibido y cambio
  const parsedReceived = parseFloat(amountReceived) || totalCalculated;
  const calculatedChange = Math.max(0, parsedReceived - totalCalculated);

  // Cobro de venta
  const handleCheckout = async () => {
    if (!cashSession) {
      setShowOpenRegisterModal(true);
      return;
    }

    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (paymentMethod === 'EFECTIVO' && parsedReceived < totalCalculated) {
      alert('El monto en efectivo ingresado es menor al total a cobrar');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const clientPayload = customerType === 'CONSUMIDOR_FINAL'
        ? {
            identificacion: '9999999999999',
            tipoIdentificacion: 'CONSUMIDOR_FINAL',
            nombre: 'Consumidor Final',
            razonSocial: 'Consumidor Final',
            telefono: '9999999999'
          }
        : {
            identificacion: customerTaxId,
            tipoIdentificacion: customerTaxId.length === 13 ? 'RUC' : 'CEDULA',
            nombre: customerName || 'Cliente Mostrador',
            razonSocial: customerName || 'Cliente Mostrador',
            email: customerEmail,
            telefono: customerPhone
          };

      const res = await fetch(`/api/${slug}/pos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          paymentMethod,
          amountPaid: parsedReceived,
          client: clientPayload,
          clubPhone: clubPhone.trim() || undefined,
          issueElectronicInvoice: issueInvoice && customerType === 'CUSTOM'
        })
      });

      if (res.ok) {
        const d = await res.json();
        setCompletedOrder(d.pedido);
        setClubResult(clubPhone.trim() ? (d.club || null) : null);
        setClubPhone('');
        setChangeDue(d.changeDue);
        setCart([]);
        setShowCheckoutModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al procesar la venta');
      }
    } catch (e: any) {
      alert('Error de conexión al procesar la venta');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-lg font-medium">Iniciando Citiox POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 font-sans text-slate-100 select-none">
      {/* ── BARRA SUPERIOR OPERATIVA POS ── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Panel Admin
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-none">
                {business?.nombre || 'Citiox POS'}
              </h1>
              <span className="text-xs font-semibold text-emerald-400">Punto de venta táctil</span>
            </div>
          </div>
        </div>

        {/* Estado de Caja */}
        <div className="flex items-center gap-3">
          {cashSession ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Unlock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Caja Abierta: <strong>{cashSession.cashRegister?.name || 'Caja 01'}</strong> ({cashSession.openedBy?.split('@')[0]})</span>
            </div>
          ) : (
            <button
              onClick={() => setShowOpenRegisterModal(true)}
              className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 animate-pulse"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Caja Cerrada — Clic para Abrir</span>
            </button>
          )}

          <div className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 font-mono">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* ── CUERPO PRINCIPAL DIVIDIDO EN 2 COLUMNAS ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* COLUMNA IZQUIERDA: CATÁLOGO TÁCTIL */}
        <section className="flex flex-1 flex-col border-r border-slate-800 bg-slate-900/40 p-3">
          {/* Barra de Búsqueda y Filtros Rápidos */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o escanear código de barras..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Categorías Táctiles Grandes */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Cuadrícula de Productos */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-800 bg-slate-800/80 p-3 transition-all hover:border-emerald-500/50 hover:bg-slate-800 active:scale-95"
                >
                  <div className="flex flex-col">
                    <div className="mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                      {prod.imagenUrl ? (
                        <img src={prod.imagenUrl} alt={prod.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <Coffee className="h-10 w-10 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                      )}
                    </div>
                    <span className="line-clamp-2 text-xs font-bold text-slate-200 group-hover:text-white">
                      {prod.nombre}
                    </span>
                    {prod.sku && (
                      <span className="text-xs text-slate-400 font-mono">SKU: {prod.sku}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-base font-bold text-emerald-400">
                      ${prod.precio.toFixed(2)}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950">
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex h-64 flex-col items-center justify-center text-slate-500">
                <Store className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm">No se encontraron productos en esta categoría</p>
              </div>
            )}
          </div>
        </section>

        {/* COLUMNA DERECHA: CARRITO Y COBRO */}
        <aside className="flex w-96 shrink-0 flex-col bg-slate-900 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Orden Actual</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Datos del Cliente Rápido */}
          <div className="mb-3 rounded-xl border border-slate-800 bg-slate-800/40 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400">Cliente:</span>
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setCustomerType('CONSUMIDOR_FINAL')}
                  className={`rounded px-2 py-0.5 font-bold ${customerType === 'CONSUMIDOR_FINAL' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}
                >
                  Final
                </button>
                <button
                  onClick={() => setCustomerType('CUSTOM')}
                  className={`rounded px-2 py-0.5 font-bold ${customerType === 'CUSTOM' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}
                >
                  Con Datos
                </button>
              </div>
            </div>

            {customerType === 'CUSTOM' ? (
              <div className="space-y-1.5 mt-2">
                <input
                  type="text"
                  placeholder="Cédula / RUC *"
                  value={customerTaxId}
                  onChange={e => setCustomerTaxId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Nombre / Razón Social *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-300 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issueInvoice}
                    onChange={e => setIssueInvoice(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Emitir Factura Electrónica SRI</span>
                </label>
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Consumidor Final</span>
                <span className="text-xs text-slate-500 font-mono">9999999999999</span>
              </div>
            )}

            {/* Club de beneficios: el teléfono identifica al cliente y le suma puntos */}
            <input
              type="tel"
              inputMode="tel"
              placeholder="Teléfono del cliente (suma puntos del club)"
              value={clubPhone}
              onChange={e => setClubPhone(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500"
            />
          </div>

          {/* Lista de Items en Carrito */}
          <div className="flex-1 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-slate-500">
                <ShoppingCart className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-xs">Toca productos para agregarlos al carrito</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantId || idx}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/60 p-2.5"
                  >
                    <div className="flex-1 pr-2">
                      <p className="text-xs font-bold text-white line-clamp-1">{item.name}</p>
                      <p className="text-xs text-emerald-400 font-semibold">${item.price.toFixed(2)} c/u</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="flex h-7 w-7 items-center justify-center text-slate-300 hover:text-white active:bg-slate-800"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="flex h-7 w-7 items-center justify-center text-slate-300 hover:text-white active:bg-slate-800"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="w-14 text-right text-xs font-bold text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total y Botón de Cobro */}
          <div className="mt-3 border-t border-slate-800 pt-3">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total a Pagar</span>
              <span className="text-2xl font-bold text-emerald-400">
                ${totalCalculated.toFixed(2)}
              </span>
            </div>

            <button
              disabled={cart.length === 0 || !cashSession}
              onClick={() => {
                setAmountReceived(totalCalculated.toFixed(2));
                setShowCheckoutModal(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-98 disabled:opacity-40 disabled:pointer-events-none"
            >
              <DollarSign className="h-5 w-5" /> Cobrar ${totalCalculated.toFixed(2)}
            </button>
          </div>
        </aside>
      </div>

      {/* ── MODAL DE COBRO RÁPIDO Y CAMBIO ── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Confirmar Cobro</h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 text-center">
              <span className="text-xs uppercase font-bold text-slate-400">Total de la Venta</span>
              <p className="text-3xl font-bold text-emerald-400">${totalCalculated.toFixed(2)}</p>
            </div>

            {/* Medios de Pago */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('EFECTIVO')}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 font-bold transition-all ${
                  paymentMethod === 'EFECTIVO'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400'
                }`}
              >
                <Banknote className="mb-1 h-5 w-5" />
                <span className="text-xs">Efectivo</span>
              </button>

              <button
                onClick={() => setPaymentMethod('TARJETA')}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 font-bold transition-all ${
                  paymentMethod === 'TARJETA'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400'
                }`}
              >
                <CreditCard className="mb-1 h-5 w-5" />
                <span className="text-xs">Tarjeta</span>
              </button>

              <button
                onClick={() => setPaymentMethod('TRANSFERENCIA')}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 font-bold transition-all ${
                  paymentMethod === 'TRANSFERENCIA'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400'
                }`}
              >
                <ArrowRightLeft className="mb-1 h-5 w-5" />
                <span className="text-xs">Transferencia</span>
              </button>
            </div>

            {/* Si es efectivo: Monto Recibido y Cambio */}
            {paymentMethod === 'EFECTIVO' && (
              <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Efectivo Recibido ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-lg font-bold text-white focus:border-emerald-500 focus:outline-none"
                />

                {/* Botones rápidos de billetes */}
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {[totalCalculated, 5, 10, 20, 50].map((val, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAmountReceived(val.toFixed(2))}
                      className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-emerald-500 hover:text-slate-950"
                    >
                      {i === 0 ? 'Exacto' : `$${val}`}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-2">
                  <span className="text-xs font-bold text-slate-400">Cambio a Entregar:</span>
                  <span className={`text-xl font-bold ${calculatedChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${calculatedChange.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={isSubmittingOrder}
              onClick={handleCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-98 disabled:opacity-50"
            >
              {isSubmittingOrder ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" /> Procesando Venta...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Confirmar Venta
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE VENTA COMPLETADA / TICKET ── */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Venta Exitosa!</h3>
            <p className="text-xs text-slate-400 mt-0.5">Venta #{completedOrder.numeroPedido}</p>

            <div className="my-4 rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-left">
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Total Cobrado:</span>
                <span className="font-bold text-white">${completedOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Método de Pago:</span>
                <span className="font-bold text-white">{completedOrder.extraInfo?.metodoPago || 'EFECTIVO'}</span>
              </div>
              {changeDue > 0 && (
                <div className="flex justify-between text-sm py-1 border-t border-slate-700/50 mt-1 font-bold text-emerald-400">
                  <span>Cambio Entregado:</span>
                  <span>${changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            {clubResult && (
              <div className={`mb-4 rounded-2xl p-3 text-left text-xs ${clubResult.puntos > 0 ? 'border border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border border-slate-800 bg-slate-800/40 text-slate-400'}`}>
                {clubResult.puntos > 0 ? (
                  <>
                    <p className="font-bold text-amber-300">+{clubResult.puntos} puntos para el cliente</p>
                    {(clubResult.saldo !== undefined || clubResult.nivel) && (
                      <p className="mt-0.5">Ahora tiene {clubResult.saldo ?? 0} puntos{clubResult.nivel ? ` · nivel ${clubResult.nivel}` : ''}.</p>
                    )}
                  </>
                ) : clubResult.motivo === 'CLUB_INACTIVO' ? (
                  <p>El club de beneficios no está activo. Actívalo en el panel para que tus ventas sumen puntos.</p>
                ) : clubResult.motivo === 'SIN_CLIENTE' ? (
                  <p>El teléfono no es válido, así que la venta no sumó puntos.</p>
                ) : (
                  <p>Esta venta no sumó puntos.</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex flex-1 items-center justify-center rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
              >
                Siguiente Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL OBLIGATORIO DE APERTURA DE CAJA ── */}
      {showOpenRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-white text-center">Apertura Obligatoria de Caja</h3>
            <p className="text-xs text-slate-400 text-center mt-1 mb-4">
              Para registrar ventas en mostrador, debes abrir el turno de caja declarando el fondo inicial en gaveta.
            </p>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Fondo Inicial en Efectivo ($):
              </label>
              <input
                type="number"
                step="0.01"
                value={openingFund}
                onChange={e => setOpeningFund(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-xl font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleOpenCashRegister}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              <Unlock className="h-5 w-5" /> Abrir Caja y Comenzar Turno
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
