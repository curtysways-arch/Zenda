/**
 * @file CustomerCartDrawer.tsx
 * @module components/public
 * @description Drawer lateral y modal de checkout para pedidos del cliente (FASE 5D).
 * @responsibility Renderizar desglose de pedido ("Mi Pedido"), selección de entrega, formulario de checkout
 *   con GPS, y enviar la orden a /api/public/[slug]/orders con compatibilidad total de parámetros y UI 100% visible en PC/Móvil.
 * @dependencies lucide-react, CartContext, MapSelectionModal
 * @status Stable (FASE 5D - Customer Ordering Experience)
 */

'use client';

import React, { useState } from 'react';
import {
  ShoppingBag, X, Plus, Minus, MapPin, Truck, Store, Utensils,
  ArrowRight, Loader2, CheckCircle2, ChevronRight, Navigation
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
  primaryColor = '#ff6b2b',
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

  const handleMapSelect = (lat: number, lng: number) => {
    setCustomerData({ lat, lng });
    setShowMapModal(false);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerData.nombre.trim() || !customerData.telefono.trim()) {
      setErrorMessage('Por favor ingresa tu Nombre y Teléfono de contacto.');
      return;
    }

    if (deliveryType === 'DOMICILIO' && !customerData.direccion.trim()) {
      setErrorMessage('Por favor ingresa tu Dirección de entrega.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/public/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Parámetros en español y en inglés para máxima compatibilidad
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
    <div className="fixed inset-0 z-[9999] flex justify-end h-[100dvh] overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container (Flexbox estricto de altura completa) */}
      <div className="relative w-full max-w-md bg-white h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col z-10 text-slate-900 overflow-hidden">
        {/* Header (Fijo arriba) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
            <h2 className="font-black text-lg text-slate-900 tracking-tight">
              {step === 'cart' ? 'Mi Pedido' : step === 'checkout' ? 'Datos de Entrega' : '¡Pedido Confirmado!'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── PASO 1: CARRO ("Mi Pedido") ── */}
        {step === 'cart' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-base">Tu carrito está vacío</h3>
                  <p className="text-xs text-slate-400 mt-1">Agrega deliciosos productos desde el menú</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Explorar Menú
                </button>
              </div>
            ) : (
              <>
                {/* Lista de Items con Scroll Interno */}
                <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {item.product.imagenUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.product.imagenUrl}
                            alt={item.product.nombre}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{item.product.nombre}</h4>
                          <span className="text-xs font-black text-slate-500">
                            ${((Number(item.product.precio) || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Controles [-] N [+] */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => decrementQuantity(item.product.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setItemQuantity(item.product, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 hover:bg-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen Financiero + Botón Continuar (Fijo al fondo) */}
                <div className="shrink-0 p-5 pb-16 sm:pb-6 bg-slate-50 border-t border-slate-100 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    {deliveryType === 'DOMICILIO' && (
                      <div className="flex justify-between">
                        <span>Costo Delivery</span>
                        <span className="font-bold text-slate-900">${deliveryCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total</span>
                      <span style={{ color: primaryColor }}>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleNextToCheckout}
                    className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>Continuar Pedido ({totalItemsCount} items)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PASO 2: CHECKOUT (Formulario de Datos) ── */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
            {/* Cuerpo del Formulario con Scroll Interno */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4">
              {/* Selección Método de Entrega */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Método de Entrega
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('DOMICILIO')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      deliveryType === 'DOMICILIO'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Domicilio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('RETIRO')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      deliveryType === 'RETIRO'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Para Retirar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('MESA')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      deliveryType === 'MESA'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    <span>En Mesa</span>
                  </button>
                </div>
              </div>

              {/* Campos de Nombre & Celular */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={customerData.nombre}
                    onChange={(e) => setCustomerData({ nombre: e.target.value })}
                    placeholder="Ej: Carlos Caicedo"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={customerData.telefono}
                    onChange={(e) => setCustomerData({ telefono: e.target.value })}
                    placeholder="Ej: 0991234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Campos condicionales según tipo de entrega */}
              {deliveryType === 'DOMICILIO' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Exacta de Entrega *</label>
                    <input
                      type="text"
                      required
                      value={customerData.direccion}
                      onChange={(e) => setCustomerData({ direccion: e.target.value })}
                      placeholder="Calle Principal N24-15 y Secundaria"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Referencia (Opcional)</label>
                    <input
                      type="text"
                      value={customerData.referencia || ''}
                      onChange={(e) => setCustomerData({ referencia: e.target.value })}
                      placeholder="Frente a la farmacia, casa blanca"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Selector de Mapa GPS */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      {customerData.lat && customerData.lng
                        ? '📍 Ubicación GPS Seleccionada (Cambiar)'
                        : '📍 Seleccionar Ubicación Exacta en Mapa GPS'}
                    </button>
                  </div>
                </div>
              )}

              {deliveryType === 'MESA' && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número de Mesa</label>
                  <input
                    type="text"
                    value={customerData.tableName || ''}
                    onChange={(e) => setCustomerData({ tableName: e.target.value })}
                    placeholder="Mesa 01"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold animate-pulse">
                  ⚠️ {errorMessage}
                </div>
              )}
            </div>

            {/* Total + Botón Confirmar (Fijo al fondo) */}
            <div className="shrink-0 p-5 pb-16 sm:pb-6 bg-slate-50 border-t border-slate-100 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
              <div className="flex justify-between text-base font-black text-slate-900">
                <span>Total A Pagar</span>
                <span style={{ color: primaryColor }}>${total.toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="py-3 px-4 rounded-xl font-bold text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Confirmar Pedido</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── PASO 3: EXITO DE PEDIDO ── */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 animate-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">¡Pedido Recibido con Éxito!</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Tu pedido #{createdOrder?.numeroPedido || ''} ha sido enviado a la cocina de <strong>{businessName}</strong>.
              </p>
            </div>

            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
                <span>Estado:</span>
                <span className="text-amber-600 uppercase">⌛ Esperando Aceptación</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cliente:</span>
                <span className="font-semibold text-slate-900">{customerData.nombre}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total:</span>
                <span className="font-bold text-emerald-600">${(Number(total) || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Botón de seguimiento — navega a la página de tracking */}
            {createdOrder?.id && (
              <a
                href={`/${slug}/pedidos/${createdOrder.id}`}
                className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 no-underline"
                style={{ backgroundColor: primaryColor }}
              >
                🛵 Seguir mi pedido en vivo
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              Volver al menú
            </button>
          </div>
        )}
      </div>

      {/* Modal de Mapa GPS */}
      {showMapModal && (
        <MapSelectionModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          onConfirmLocation={handleMapSelect}
          initialLat={customerData.lat || -0.180653}
          initialLng={customerData.lng || -78.467838}
        />
      )}
    </div>
  );
}
