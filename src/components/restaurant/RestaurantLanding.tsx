"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Utensils, Truck, ShoppingCart, Check, QrCode, Search, Phone, MapPin, Clock } from 'lucide-react';

interface RestaurantLandingProps {
  negocio: any;
  reviews?: any[];
  paginasPersonalizadas?: any[];
}

export default function RestaurantLanding({ negocio, reviews = [], paginasPersonalizadas = [] }: RestaurantLandingProps) {
  const [activeChannel, setActiveChannel] = useState<'TABLE' | 'DELIVERY' | 'PICKUP'>('TABLE');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<Array<{ producto: any; cantidad: number; notas?: string }>>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    // Detectar mesa en URL si viene con query param ?table=Mesa1
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tbl = params.get('table') || params.get('mesa');
      if (tbl) {
        setTableNumber(tbl);
        setActiveChannel('TABLE');
      }
    }
  }, []);

  useEffect(() => {
    if (!negocio?.slug) return;
    // Cargar catálogo de productos y categorías
    fetch(`/api/public/${negocio.slug}/products`)
      .then(res => res.json())
      .then(data => {
        if (data.products) setProductos(data.products);
        if (data.categories) setCategorias(data.categories);
      })
      .catch(err => console.error("Error al cargar productos del restaurante:", err));
  }, [negocio?.slug]);

  // Filtrar productos por canal de disponibilidad
  const filteredProducts = productos.filter(p => {
    const extra = typeof p.extraInfo === 'string' ? JSON.parse(p.extraInfo || '{}') : (p.extraInfo || {});
    
    // Si el producto especifica disponibilidades, filtramos según el canal activo
    if (activeChannel === 'TABLE' && extra.availableInTable === false) return false;
    if (activeChannel === 'DELIVERY' && extra.availableInDelivery === false) return false;
    if (activeChannel === 'PICKUP' && extra.availableInPickup === false) return false;

    if (selectedCategory !== 'TODOS' && p.categoriaId !== selectedCategory && p.categoria?.nombre !== selectedCategory) return false;
    if (searchQuery.trim() && !p.nombre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return p.activo !== false;
  });

  const addToCart = (prod: any) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.producto.id === prod.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].cantidad += 1;
        return next;
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
  };

  const updateQuantity = (prodId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.producto.id === prodId) {
          const newQty = item.cantidad + delta;
          return newQty > 0 ? { ...item, cantidad: newQty } : null;
        }
        return item;
      }).filter(Boolean) as any;
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (activeChannel === 'TABLE' && !tableNumber.trim()) {
      alert("Por favor indica el número o nombre de tu mesa.");
      return;
    }
    if (activeChannel === 'DELIVERY' && (!customerName || !customerPhone || !customerAddress)) {
      alert("Por favor completa tu nombre, teléfono y dirección de entrega.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        channel: activeChannel, // TABLE | DELIVERY | PICKUP
        tipoEntrega: activeChannel === 'DELIVERY' ? 'DOMICILIO' : 'RETIRO',
        nombreCliente: customerName || (tableNumber ? `Mesa ${tableNumber}` : 'Cliente Restaurante'),
        telefonoCliente: customerPhone || '0999999999',
        direccionCliente: activeChannel === 'DELIVERY' ? customerAddress : `Consumo en local - ${tableNumber || 'Mesa'}`,
        referenciaCliente: activeChannel === 'TABLE' ? `Mesa: ${tableNumber}` : '',
        fechaEntrega: new Date().toISOString(),
        franjaHoraria: 'Inmediata',
        subtotal: totalAmount,
        costoEnvio: activeChannel === 'DELIVERY' ? 2.50 : 0.0,
        total: totalAmount + (activeChannel === 'DELIVERY' ? 2.50 : 0.0),
        extraInfo: {
          channel: activeChannel,
          tableCode: tableNumber,
          kitchenStatus: 'NUEVA',
        },
        items: cart.map(item => ({
          productoId: item.producto.id,
          nombreProducto: item.producto.nombre,
          precioUnitario: item.producto.precio,
          cantidad: item.cantidad
        }))
      };

      const res = await fetch(`/api/public/${negocio.slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success || data.order) {
        setOrderSuccess(data.order || data);
        setCart([]);
      } else {
        alert(data.error || "No se pudo enviar el pedido. Intenta nuevamente.");
      }
    } catch (err) {
      console.error("Error enviando pedido:", err);
      alert("Ocurrió un error al procesar tu orden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = negocio?.colorPrimario || '#ea580c';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {negocio?.logoUrl ? (
              <img src={negocio.logoUrl} alt={negocio.nombre} className="w-10 h-10 rounded-full object-cover border border-amber-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold text-white shadow-lg">
                <Utensils className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-base text-white leading-tight">{negocio?.nombre || 'Restaurante'}</h1>
              <p className="text-xs text-amber-400 font-medium">{negocio?.heroSubtitulo || 'Menú Digital & Comandas'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Abierto
            </span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 px-4 py-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight italic">
            {negocio?.heroTitulo || '¡Pide tu plato favorito!'}
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            {negocio?.heroSubtitulo || 'Selecciona tu modalidad de pedido y disfruta la mejor cocina gourmet.'}
          </p>

          {/* Selector de Canales de Pedido */}
          <div className="inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-md w-full justify-between gap-1">
            <button
              onClick={() => setActiveChannel('TABLE')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeChannel === 'TABLE' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Utensils className="w-4 h-4" />
              Pedir a Mesa
            </button>
            <button
              onClick={() => setActiveChannel('DELIVERY')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeChannel === 'DELIVERY' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              Delivery
            </button>
            <button
              onClick={() => setActiveChannel('PICKUP')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                activeChannel === 'PICKUP' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Para Llevar
            </button>
          </div>
        </div>
      </div>

      {/* Menú Interactivo */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Buscador & Categorías */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar platillo, bebida o postre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('TODOS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'TODOS' ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Productos */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
            <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No hay platos disponibles en este canal</h3>
            <p className="text-xs text-slate-500 mt-1">Prueba cambiando de filtro o canal de pedido.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(prod => {
              const inCart = cart.find(c => c.producto.id === prod.id);
              return (
                <div key={prod.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg">
                  <div>
                    {prod.imagenUrl ? (
                      <div className="h-44 w-full overflow-hidden relative">
                        <img src={prod.imagenUrl} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-amber-400 border border-amber-500/20">
                          ${prod.precio.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-slate-800/50 flex items-center justify-center text-slate-600">
                        <Utensils className="w-8 h-8" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-white text-base leading-snug">{prod.nombre}</h4>
                      {prod.descripcion && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{prod.descripcion}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/50 mt-2">
                    <span className="font-black text-amber-400 text-lg">${prod.precio.toFixed(2)}</span>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                          onClick={() => updateQuantity(prod.id, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-600"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-white px-1">{inCart.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(prod.id, 1)}
                          className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center hover:bg-amber-500"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(prod)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Botón Flotante y Modal de Carrito */}
      {cart.length > 0 && !orderSuccess && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-50">
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 p-4 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.cantidad, 0)}
                </span>
                <span className="font-bold text-sm text-white">Tu Pedido ({activeChannel})</span>
              </div>
              <span className="font-black text-amber-400 text-base">${totalAmount.toFixed(2)}</span>
            </div>

            {/* Formulario rápido según canal */}
            <form onSubmit={handleSubmitOrder} className="space-y-2.5 pt-2 border-t border-slate-800">
              {activeChannel === 'TABLE' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="N° de Mesa (ej: Mesa 4)"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Tu nombre (opcional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {activeChannel === 'DELIVERY' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tu nombre completo"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono / WhatsApp"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Dirección exacta de entrega"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              {activeChannel === 'PICKUP' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre para retirar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando comanda...' : `Confirmar Pedido - $${(totalAmount + (activeChannel === 'DELIVERY' ? 2.50 : 0)).toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Comanda Enviada a Cocina!</h3>
            <p className="text-xs text-slate-400">
              Tu pedido ha sido recibido por la cocina. Tu comanda es la <strong className="text-amber-400">#{orderSuccess.numeroPedido || 'N/A'}</strong>.
            </p>
            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
