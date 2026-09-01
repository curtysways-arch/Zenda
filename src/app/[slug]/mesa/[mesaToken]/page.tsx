'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Utensils, ShoppingBag, MapPin, Bell, Loader2, CheckCircle2, AlertCircle,
  XCircle, ChevronRight, Compass, ShieldCheck, Flame
} from 'lucide-react';
import { useCart } from '@/core/context/CartContext';
import ProductVariantModal from '@/components/public/ProductVariantModal';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';

export default function PublicMesaPage() {
  const params = useParams();
  const slug = (params.slug as string) || 'tienda';
  const mesaToken = (params.mesaToken as string) || '';
  const router = useRouter();

  const cartContext = useCart();
  const {
    cart,
    subtotal,
    total,
    totalItemsCount,
    setIsCartOpen,
    clearCart,
    addToCart,
    setDeliveryType
  } = cartContext;

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negocio, setNegocio] = useState<any>(null);
  const [mesa, setMesa] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [tableSessionId, setTableSessionId] = useState<string>('');

  // Productos y Categorías
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);

  // Estados de Llamada de Mesero & Cooldown
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [waiterMessage, setWaiterMessage] = useState<string | null>(null);

  // Estados de Solicitud de Pedido & Geolocalización
  const [requestingOrder, setRequestingOrder] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null); // null | 'REQUESTING_GPS' | 'VALIDATING' | 'SUCCESS' | 'ERROR'
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [orderSentSuccess, setOrderSentSuccess] = useState(false);

  // Datos del Cliente en Mesa
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notasPedido, setNotasPedido] = useState('');

  // Inicializar Sesión Temporal de Mesa (2 horas)
  useEffect(() => {
    let sessId = localStorage.getItem('citiox_table_session');
    if (!sessId) {
      sessId = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      localStorage.setItem('citiox_table_session', sessId);
    }
    setTableSessionId(sessId);
    localStorage.setItem('citiox_table_token', mesaToken);
    localStorage.setItem('citiox_table_slug', slug);

    setDeliveryType('MESA');
  }, [mesaToken, slug]);

  // Cargar Mesa, Negocio y Catálogo
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [resMesa, resProducts, resCats] = await Promise.all([
          fetch(`/api/public/${slug}/mesa/${mesaToken}`),
          fetch(`/api/public/productos?slug=${slug}`),
          fetch(`/api/public/categorias?slug=${slug}`)
        ]);

        if (!resMesa.ok) {
          const d = await resMesa.json();
          setError(d.error || 'La mesa solicitada no existe o no se encuentra disponible.');
          setLoading(false);
          return;
        }

        const dataMesa = await resMesa.json();
        setNegocio(dataMesa.negocio);
        setMesa(dataMesa.mesa);
        setConfig(dataMesa.config);

        if (resProducts.ok) {
          const d = await resProducts.json();
          setProducts(Array.isArray(d) ? d : (d.productos || []));
        }
        if (resCats.ok) {
          const d = await resCats.json();
          setCategories(Array.isArray(d) ? d : (d.categorias || []));
        }
      } catch (err) {
        console.error('Error al cargar la mesa:', err);
        setError('Error de conexión al cargar la mesa.');
      } finally {
        setLoading(false);
      }
    }

    if (slug && mesaToken) loadData();
  }, [slug, mesaToken]);

  // Cooldown timer effect
  useEffect(() => {
    if (waiterCooldown <= 0) return;
    const t = setInterval(() => setWaiterCooldown(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [waiterCooldown]);

  // Handler para Llamar Mesero
  const handleCallWaiter = async () => {
    if (waiterCooldown > 0 || callingWaiter) return;

    setCallingWaiter(true);
    setWaiterMessage(null);
    try {
      const res = await fetch(`/api/public/${slug}/mesa/${mesaToken}/waiter-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableSessionId,
          notas: 'Atención solicitada desde mesa'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setWaiterMessage('🔔 ¡Notificación enviada! El mesero se acerca a tu mesa.');
        setWaiterCooldown(config.mesaCooldownLlamada || 120);
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

    if (!navigator.geolocation) {
      setGeoStatus('ERROR');
      setGeoErrorMessage('Tu navegador o celular no soporta geolocalización por GPS.');
      setRequestingOrder(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

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
                varianteId: item.product.varianteId,
                varianteNombre: item.product.varianteNombre,
                cantidad: item.quantity,
                precioUnitario: item.product.precio,
                nombre: item.product.nombre
              })),
              notas: notasPedido || undefined,
              clientLat: latitude,
              clientLng: longitude,
              accuracy
            })
          });

          const data = await res.json();

          if (res.ok) {
            setGeoStatus('SUCCESS');
            setOrderSentSuccess(true);
            clearCart();
            setIsCartOpen(false);
          } else {
            setGeoStatus('ERROR');
            setGeoErrorMessage(data.error || 'No se pudo enviar la solicitud de pedido.');
          }
        } catch (err) {
          setGeoStatus('ERROR');
          setGeoErrorMessage('Error de conexión al enviar el pedido.');
        } finally {
          setRequestingOrder(false);
        }
      },
      (geoErr) => {
        console.error('Error GPS:', geoErr);
        setGeoStatus('ERROR');
        let msg = 'Necesitamos verificar que estás dentro del restaurante para solicitar un pedido desde la mesa. Activa el GPS de tu dispositivo e inténtalo nuevamente.';
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          msg = 'Permiso de ubicación denegado. Por favor otorga permisos de geolocalización a tu navegador para realizar el pedido desde tu mesa.';
        }
        setGeoErrorMessage(msg);
        setRequestingOrder(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Filtrado de productos
  const filteredProducts = products.filter(p => {
    const matchesCat = !selectedCategoryId || p.categoriaId === selectedCategoryId;
    const matchesSearch = !searchQuery || p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-white">
        <Loader2 className="animate-spin text-amber-500" size={48} />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Identificando Mesa...</span>
      </div>
    );
  }

  if (error || !mesa) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="size-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-3xl">
          <XCircle size={36} />
        </div>
        <h2 className="text-xl font-black text-white uppercase">Mesa No Disponible</h2>
        <p className="text-xs text-slate-400 max-w-sm font-medium leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}`)}
          className="px-6 py-3 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-2xl shadow-lg"
        >
          Ver Menú General
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-36 select-none">
      
      {/* ── 1. HEADER FIJO CON IDENTIFICACIÓN DE MESA ── */}
      <header className="sticky top-0 z-[100] bg-slate-950 text-white px-4 py-3 shadow-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/${slug}`)}
              className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
            >
              ←
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block leading-none">
                {negocio?.nombre || 'Restaurante'}
              </span>
              <h1 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 leading-tight mt-0.5">
                <span>📍 Estás en {mesa.nombre}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.mesaLlamarMeseroHabilitado && (
              <button
                type="button"
                onClick={handleCallWaiter}
                disabled={waiterCooldown > 0 || callingWaiter}
                className={`px-3 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 ${
                  waiterCooldown > 0
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <Bell className={`w-4 h-4 ${callingWaiter ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {waiterCooldown > 0 ? `Esperar (${waiterCooldown}s)` : 'Llamar Mesero'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Carrito</span>
              {totalItemsCount > 0 && (
                <span className="bg-slate-950 text-white px-2 py-0.5 rounded-full text-[11px] font-black">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* AVISO MENSAJE DE LLAMADA AL MESERO */}
      {waiterMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-center text-xs font-black uppercase tracking-wider animate-in fade-in">
          {waiterMessage}
        </div>
      )}

      {/* PANTALLA DE ÉXITO TRAS SOLICITAR PEDIDO */}
      {orderSentSuccess && (
        <section className="max-w-xl mx-auto px-4 pt-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase">¡Solicitud Enviada con Éxito!</h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Tu solicitud para <span className="font-bold text-slate-900">{mesa.nombre}</span> fue enviada al administrador y está siendo revisada antes de pasar a la cocina.
            </p>
            <div className="p-3 bg-emerald-50 rounded-2xl text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-2">
              <ShieldCheck size={16} /> Ubicación verificada dentro del restaurante
            </div>
            <button
              type="button"
              onClick={() => setOrderSentSuccess(false)}
              className="w-full py-3.5 bg-slate-900 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer"
            >
              Pedir Algo Más
            </button>
          </div>
        </section>
      )}

      {/* CATÁLOGO Y MENÚ DE MESA */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 space-y-6">

        {/* BARRA DE BÚSQUEDA Y CATEGORÍAS */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="🔎 Buscar productos en el menú..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none shadow-xs"
          />

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer transition-all ${
                !selectedCategoryId ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Todos
            </button>

            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer transition-all ${
                  selectedCategoryId === cat.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* GRID DE PRODUCTOS */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
            <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black uppercase text-slate-800">No se encontraron productos</h3>
            <p className="text-xs text-slate-400">Intenta con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  {product.imagenUrl && (
                    <img
                      src={product.imagenUrl}
                      alt={product.nombre}
                      className="w-full h-36 object-cover rounded-2xl border border-slate-100"
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{product.nombre}</h3>
                    {product.descripcion && (
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">{product.descripcion}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-base font-black text-slate-900">${Number(product.precio || 0).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (product.variantes && product.variantes.length > 0) {
                        setSelectedProductForModal(product);
                      } else {
                        addToCart({
                          id: product.id,
                          nombre: product.nombre,
                          precio: Number(product.precio || 0),
                          imagenUrl: product.imagenUrl
                        });
                        setIsCartOpen(true);
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BARRA INFERIOR FLOTANTE DE CARRITO */}
      {totalItemsCount > 0 && !orderSentSuccess && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-[90]">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-950 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between cursor-pointer border border-slate-800 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
                {totalItemsCount}
              </span>
              <div className="text-left">
                <span className="text-xs font-black uppercase text-white block">Solicitar Pedido en {mesa.nombre}</span>
                <span className="text-[10px] text-slate-400">Ver carrito y confirmar ubicacion</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black text-amber-400">${total.toFixed(2)}</span>
              <ChevronRight size={20} />
            </div>
          </button>
        </div>
      )}

      {/* MODAL DE VARIANTES DE PRODUCTO */}
      {selectedProductForModal && (
        <ProductVariantModal
          product={selectedProductForModal}
          isOpen={Boolean(selectedProductForModal)}
          onClose={() => setSelectedProductForModal(null)}
          primaryColor="#0f172a"
        />
      )}

      {/* DRAWER DEL CARRITO DE COMPRAS */}
      <CustomerCartDrawer
        slug={slug}
        businessName={negocio?.nombre || 'Restaurante'}
        isOpen={false}
        onClose={() => setIsCartOpen(false)}
        primaryColor="#0f172a"
      />

      {/* MODAL / SECCIÓN DE CONFIRMACIÓN CON GPS */}
      {cartContext.isCartOpen && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 block">Pedido desde Mesa</span>
                <h3 className="font-black text-base uppercase text-slate-900">📍 {mesa.nombre}</h3>
              </div>
              <button type="button" onClick={() => setIsCartOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-xl">
                <XCircle size={24} />
              </button>
            </div>

            {/* Resumen del Carrito */}
            <div className="space-y-3 text-xs">
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900">{item.quantity}x {item.product.nombre}</span>
                      {item.product.varianteNombre && (
                        <span className="text-[10px] text-slate-500 block">({item.product.varianteNombre})</span>
                      )}
                    </div>
                    <span className="font-black text-slate-900">${(item.product.precio * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-slate-900">
                <span>TOTAL:</span>
                <span className="text-emerald-600">${total.toFixed(2)}</span>
              </div>

              {/* Formulario Cliente (Opcional) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Tu Nombre (opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Carlos Caicedo"
                  value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs outline-none"
                />
              </div>

              {/* Mensaje de Error de Geolocalización */}
              {geoErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl space-y-1">
                  <p className="flex items-center gap-1.5">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>Validación de Ubicación Fallida</span>
                  </p>
                  <p className="text-[11px] font-normal leading-relaxed">{geoErrorMessage}</p>
                </div>
              )}

              {/* Botón de Confirmación con GPS */}
              <button
                type="button"
                onClick={handleSubmitTableOrder}
                disabled={requestingOrder || cart.length === 0}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl cursor-pointer flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {requestingOrder ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Verificando Ubicación GPS...</span>
                  </>
                ) : (
                  <>
                    <Compass size={18} className="text-amber-400" />
                    <span>Solicitar Pedido (Verificar Ubicación)</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 italic text-center leading-tight">
                📍 Se verificará que tu dispositivo se encuentre físicamente a menos de {config.mesaRadioPermitido || 100}m del restaurante antes de procesar el pedido.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
