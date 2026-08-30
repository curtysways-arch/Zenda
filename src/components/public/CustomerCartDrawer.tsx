'use client';

/**
 * @file CustomerCartDrawer.tsx
 * @module components/public
 * @description Modal de Carrito y Checkout en Pantalla Completa (FASE 5D Rediseño Intuítivo).
 * @responsibility Renderizar desglose de pedido ("Mi Pedido"), selección de entrega, formulario de checkout
 *   con mapa GPS fullscreen, y enviar la orden a /api/public/[slug]/orders con UI super intuitiva en PC y Móvil.
 * @dependencies lucide-react, CartContext, MapSelectionModal
 */

import React, { useState } from 'react';
import {
  ShoppingBag, X, Plus, Minus, MapPin, Truck, Store, Utensils,
  ArrowRight, Loader2, CheckCircle2, ChevronRight, Navigation, Trash2, ArrowLeft
} from 'lucide-react';
import { useCart } from '@/core/context/CartContext';
import MapSelectionModal from './MapSelectionModal';

interface CustomerCartDrawerProps {
  slug: string;
  businessName: string;
  primaryColor?: string;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: (order: any) => void;
}

export default function CustomerCartDrawer({
  slug,
  businessName,
  primaryColor = '#ff5500',
  isOpen,
  onClose,
  onOrderSuccess,
}: CustomerCartDrawerProps) {
  const {
    cart,
    deliveryType,
    customerData,
    deliveryCost,
    subtotal,
    total,
    totalItemsCount,
    setDeliveryType,
    setCustomerData,
    setItemQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  // Modal de Mapa GPS
  const [showMapModal, setShowMapModal] = useState(false);

  if (!isOpen) return null;

  const handleNextToCheckout = () => {
    if (cart.length === 0) return;
    setStep('checkout');
  };

  const handleMapSelect = (lat: number, lng: number, addressName?: string, ref?: string) => {
    setCustomerData({
      lat,
      lng,
      direccion: addressName || customerData.direccion || 'Ubicación fijada en mapa',
      referencia: ref || customerData.referencia
    });
    setShowMapModal(false);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerData.nombre.trim() || !customerData.telefono.trim()) {
      setErrorMessage('Por favor ingresa tu Nombre Completo y Teléfono de contacto.');
      return;
    }

    if (deliveryType === 'DOMICILIO' && !customerData.direccion.trim()) {
      setErrorMessage('Por favor ingresa o selecciona tu Dirección de Entrega en el mapa.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/public/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryType,
          tipoEntrega: deliveryType,
          clientName: customerData.nombre,
          nombreCliente: customerData.nombre,
          clientPhone: customerData.telefono,
          telefonoCliente: customerData.telefono,
          clientAddress: deliveryType === 'DOMICILIO' ? customerData.direccion : undefined,
          direccionCliente: deliveryType === 'DOMICILIO' ? customerData.direccion : undefined,
          clientReference: deliveryType === 'DOMICILIO' ? customerData.referencia : undefined,
          referenciaCliente: deliveryType === 'DOMICILIO' ? customerData.referencia : undefined,
          lat: deliveryType === 'DOMICILIO' ? customerData.lat : undefined,
          latitud: deliveryType === 'DOMICILIO' ? customerData.lat : undefined,
          lng: deliveryType === 'DOMICILIO' ? customerData.lng : undefined,
          longitud: deliveryType === 'DOMICILIO' ? customerData.lng : undefined,
          timeSlot: customerData.horaEntrega || 'ASAP',
          franjaHoraria: customerData.horaEntrega || 'ASAP',
          subtotal,
          costoEnvio: deliveryCost,
          total,
          extraInfo: {
            tableName: customerData.tableName,
            useEnterpriseRuntime: true,
          },
          items: cart.map(i => ({
            productId: i.product.id,
            productoId: i.product.id,
            nombreProducto: i.product.nombre,
            precioUnitario: i.product.precio,
            precio: i.product.precio,
            cantidad: i.quantity,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const order = data.pedido || data.order || data;
        setCreatedOrder(order);
        clearCart();
        setStep('success');
        if (onOrderSuccess) onOrderSuccess(order);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || err.message || 'No se pudo procesar el pedido.');
      }
    } catch (e: any) {
      console.error('[CartDrawer] Error enviando pedido:', e);
      setErrorMessage('Error de conexión al enviar tu pedido. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-white flex flex-col w-full h-full animate-in fade-in duration-200 select-none">
      {/* ── BARRA SUPERIOR FIJA ── */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          {step === 'checkout' && (
            <button
              type="button"
              onClick={() => setStep('cart')}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            style={{ backgroundColor: primaryColor }}
            className="p-2 rounded-xl text-white font-black shadow-xs flex items-center justify-center"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
              {step === 'cart' ? 'Mi Pedido' : step === 'checkout' ? 'Datos de Entrega' : '¡Pedido Confirmado!'}
            </h2>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              {businessName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* ── CONTENIDO PRINCIPAL EN PANTALLA COMPLETA ── */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* ── PASO 1: RESUMEN DEL CARRITO DE PRODUCTOS ── */}
        {step === 'cart' && (
          <div className="space-y-5">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-4 max-w-sm mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Tu carrito está vacío</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Agrega tus platillos y combos favoritos del menú</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                  style={{ backgroundColor: primaryColor }}
                >
                  Explorar Menú
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    PLATILLOS SELECCIONADOS ({totalItemsCount})
                  </span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vaciar Carrito
                  </button>
                </div>

                {/* LISTA DE PLATILLOS */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.product.imagenUrl ? (
                          <img
                            src={item.product.imagenUrl}
                            alt={item.product.nombre}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                            🍲
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                            {item.product.nombre}
                          </h4>
                          <span style={{ color: primaryColor }} className="text-xs font-black block mt-0.5">
                            ${((Number(item.product.precio) || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* CONTROLES CANTIDAD [- N +] */}
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => decrementQuantity(item.product.id)}
                          className="w-7 h-7 bg-white text-slate-800 rounded-lg font-black text-xs flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemQuantity(item.product, item.quantity + 1)}
                          style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                          className="w-7 h-7 text-white rounded-lg font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTÓN CONTINUAR A CHECKOUT */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleNextToCheckout}
                    style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl flex items-center justify-between px-6 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Continuar a Datos de Entrega</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black">${subtotal.toFixed(2)}</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PASO 2: CHECKOUT SUPER INTUITIVO (SIN CAMPO REFERENCIA EN ESTE FORMULARIO) ── */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="space-y-5">
            {/* SELECTOR MÉTODO DE ENTREGA */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                1. Selección de Método de Entrega
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('DOMICILIO')}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    deliveryType === 'DOMICILIO'
                      ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="w-5 h-5" style={{ color: deliveryType === 'DOMICILIO' ? primaryColor : undefined }} />
                  <span>A Domicilio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('RETIRO')}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    deliveryType === 'RETIRO'
                      ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Store className="w-5 h-5" style={{ color: deliveryType === 'RETIRO' ? primaryColor : undefined }} />
                  <span>Para Retirar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('MESA')}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    deliveryType === 'MESA'
                      ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Utensils className="w-5 h-5" style={{ color: deliveryType === 'MESA' ? primaryColor : undefined }} />
                  <span>En Mesa</span>
                </button>
              </div>
            </div>

            {/* DATOS DEL CLIENTE */}
            <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                2. Datos del Cliente
              </span>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={customerData.nombre}
                  onChange={(e) => setCustomerData({ nombre: e.target.value })}
                  placeholder="Ej: Carlos Caicedo"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-700">WhatsApp / Teléfono *</label>
                <input
                  type="tel"
                  required
                  value={customerData.telefono}
                  onChange={(e) => setCustomerData({ telefono: e.target.value })}
                  placeholder="Ej: 0991234567"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                />
              </div>

              {/* DOMICILIO: DIRECCIÓN + BOTÓN MAPA GPS (SIN CAMPO REFERENCIA EN EL FORMULARIO) */}
              {deliveryType === 'DOMICILIO' && (
                <div className="space-y-3 pt-2 border-t border-slate-200/60">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700">Dirección Exacta de Entrega *</label>
                    <input
                      type="text"
                      required
                      value={customerData.direccion}
                      onChange={(e) => setCustomerData({ direccion: e.target.value })}
                      placeholder="Ej: Av. Principal N24-15 y Calle Secundaria"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                    />
                  </div>

                  {/* BOTÓN MAPA SELECCIÓN DE UBICACIÓN GPS Y REFERENCIA */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="w-full py-3 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {customerData.lat && customerData.lng
                          ? '📍 Ubicación GPS Seleccionada (Cambiar en Mapa)'
                          : '📍 Abrir Mapa para Fijar Ubicación y Referencia'}
                      </span>
                    </button>
                  </div>

                  {customerData.referencia && (
                    <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-xs">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Referencia Registrada:</span>
                      <span className="font-bold text-slate-800">{customerData.referencia}</span>
                    </div>
                  )}
                </div>
              )}

              {deliveryType === 'MESA' && (
                <div className="space-y-1 pt-2 border-t border-slate-200/60">
                  <label className="text-[11px] font-extrabold text-slate-700">Número de Mesa *</label>
                  <input
                    type="text"
                    required
                    value={customerData.tableName || ''}
                    onChange={(e) => setCustomerData({ tableName: e.target.value })}
                    placeholder="Ej: Mesa 05"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-400 transition-all"
                  />
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold animate-pulse">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* CHECKOUT RESUMEN FINANCIERO */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-600">
                <span>Subtotal de Platillos</span>
                <span className="text-slate-900 font-extrabold">${subtotal.toFixed(2)}</span>
              </div>

              {deliveryType === 'DOMICILIO' && (
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Costo de Envío</span>
                  <span className="text-slate-900 font-extrabold">
                    {deliveryCost === 0 ? '¡GRATIS!' : `$${deliveryCost.toFixed(2)}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total A Pagar</span>
                <span style={{ color: primaryColor }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* BOTÓN ENVIAR PEDIDO */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Enviando Pedido...</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRMAR PEDIDO (${total.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── PASO 3: CONFIRMACIÓN EXITOSA ── */}
        {step === 'success' && (
          <div className="py-12 text-center space-y-5 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">¡Pedido Enviado con Éxito!</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Hemos recibido tu orden para <strong>{businessName}</strong>. Te contactaremos por WhatsApp.
              </p>
            </div>

            {createdOrder && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1 font-bold text-slate-700">
                <div>Código de Pedido: <span className="font-mono text-slate-900 font-black">#{createdOrder.id?.substring(0, 8)}</span></div>
                <div>Cliente: <span className="text-slate-900 font-black">{customerData.nombre}</span></div>
                <div>Total: <span style={{ color: primaryColor }} className="font-black">${total.toFixed(2)}</span></div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: primaryColor, color: '#ffffff' }}
              className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg cursor-pointer"
            >
              Volver al Inicio
            </button>
          </div>
        )}
      </div>

      {/* MODAL SELECCIÓN MAPA PANTALLA COMPLETA */}
      {showMapModal && (
        <MapSelectionModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          initialLat={customerData.lat}
          initialLng={customerData.lng}
          initialReference={customerData.referencia}
          onConfirmLocation={handleMapSelect}
        />
      )}
    </div>
  );
}
