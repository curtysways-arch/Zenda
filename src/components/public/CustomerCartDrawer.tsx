'use client';

/**
 * @file CustomerCartDrawer.tsx
 * @module components/public
 * @description Modal de Checkout y Datos de Entrega (FASE 5D - Ubicación Actual por Defecto).
 * @responsibility Renderizar desglose de pedido ("Mi Pedido"), selección de entrega (A Domicilio vs Para Retirar),
 *   card con miniatura de mapa real Leaflet, auto-detección de ubicación actual y recálculo dinámico de envío.
 * @dependencies lucide-react, CartContext, MapSelectionModal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, X, Plus, Minus, MapPin, Truck, Store,
  ArrowRight, Loader2, CheckCircle2, Navigation, Trash2, ArrowLeft,
  User, Phone, Tag, Edit2, RefreshCw, ShieldCheck, Clock, Lock, Info
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

// Componente Miniatura de Mapa Real Centrado en las Coordenadas del Cliente
function MiniMapPreview({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const targetLat = lat || -0.180653;
  const targetLng = lng || -78.467838;

  useEffect(() => {
    if (!containerRef.current) return;
    const L = (window as any).L;

    const initMiniMap = () => {
      if (!L || !containerRef.current) return;

      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }

      try {
        const miniMap = L.map(containerRef.current, {
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: false
        }).setView([targetLat, targetLng], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(miniMap);

        mapRef.current = miniMap;

        [100, 300].forEach(delay => {
          setTimeout(() => {
            if (mapRef.current) mapRef.current.invalidateSize();
          }, delay);
        });
      } catch (e) {
        console.warn('Error mini map:', e);
      }
    };

    if (L) {
      initMiniMap();
    } else {
      const timer = setTimeout(initMiniMap, 250);
      return () => clearTimeout(timer);
    }

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [targetLat, targetLng]);

  return (
    <div className="relative w-full h-32 bg-slate-100 overflow-hidden border-b border-slate-100">
      <div ref={containerRef} className="w-full h-full z-0 pointer-events-none" />
      {/* Pin Rojo Central Ilustrativo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none flex flex-col items-center drop-shadow-md pb-0.5">
        <MapPin className="w-8 h-8 text-red-500 fill-red-500 stroke-white stroke-2" />
        <div className="w-3 h-1 bg-slate-900/30 rounded-full blur-[1px] -mt-1" />
      </div>
    </div>
  );
}

// Haversine Distance Helper para cálculo dinámico de costo de envío
function calculateDeliveryCostFromCoords(
  userLat?: number | null,
  userLng?: number | null,
  bizLat: number = -0.180653,
  bizLng: number = -78.467838,
  defaultFee: number = 1.50
): number {
  if (!userLat || !userLng) return defaultFee;
  const R = 6371; // Radio terrestre en KM
  const dLat = (userLat - bizLat) * (Math.PI / 180);
  const dLon = (userLng - bizLng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(bizLat * (Math.PI / 180)) * Math.cos(userLat * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  if (distanceKm <= 3) return defaultFee;
  const extraKm = Math.ceil(distanceKm - 3);
  const calculatedCost = defaultFee + (extraKm * 0.50);
  return Math.round(calculatedCost * 100) / 100;
}

export default function CustomerCartDrawer({
  slug,
  businessName,
  primaryColor = '#d32f2f',
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
    setDeliveryCost,
    setItemQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState<boolean>(false);

  // Modal de Mapa GPS
  const [showMapModal, setShowMapModal] = useState(false);

  // Recalcular dinámicamente el costo de envío al cambiar coordenadas o tipo de entrega
  useEffect(() => {
    if (deliveryType === 'RETIRO') {
      setDeliveryCost(0);
    } else {
      const dynamicFee = calculateDeliveryCostFromCoords(
        customerData.lat,
        customerData.lng,
        -0.180653,
        -78.467838,
        1.50
      );
      setDeliveryCost(dynamicFee);
    }
  }, [deliveryType, customerData.lat, customerData.lng, setDeliveryCost]);

  if (!isOpen) return null;

  const hasLocationSelected = !!(customerData.lat && customerData.lng && customerData.direccion && customerData.direccion.trim());

  const handleNextToCheckout = () => {
    if (cart.length === 0) return;
    setStep('checkout');
  };

  const handleMapSelect = (lat: number, lng: number, addressName?: string, ref?: string) => {
    const newFee = calculateDeliveryCostFromCoords(lat, lng, -0.180653, -78.467838, 1.50);
    setDeliveryCost(newFee);

    setCustomerData({
      lat,
      lng,
      direccion: addressName || customerData.direccion || 'Ubicación seleccionada en mapa',
      referencia: ref || customerData.referencia
    });
    setShowMapModal(false);
  };

  const handleAutoDetectCurrentLocation = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsLocatingCurrent(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          let addrName = 'Mi Ubicación Actual';

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${uLat}&lon=${uLng}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                const parts = data.display_name.split(',');
                addrName = parts.slice(0, 3).join(',').trim();
              }
            }
          } catch (err) {}

          const newFee = calculateDeliveryCostFromCoords(uLat, uLng, -0.180653, -78.467838, 1.50);
          setDeliveryCost(newFee);
          setCustomerData({
            lat: uLat,
            lng: uLng,
            direccion: addrName
          });
          setIsLocatingCurrent(false);
        },
        () => {
          setIsLocatingCurrent(false);
          setShowMapModal(true);
        },
        { timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setShowMapModal(true);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerData.nombre.trim() || !customerData.telefono.trim()) {
      setErrorMessage('Por favor ingresa tu Nombre Completo y Teléfono de contacto.');
      return;
    }

    if (deliveryType === 'DOMICILIO' && !customerData.direccion.trim()) {
      setErrorMessage('Por favor selecciona tu Ubicación de Entrega en el mapa.');
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
      {/* ── BARRA SUPERIOR FIJA DE NAVEGACIÓN ── */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={step === 'checkout' ? () => setStep('cart') : onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div
            style={{ backgroundColor: primaryColor }}
            className="p-2 rounded-xl text-white font-black shadow-xs flex items-center justify-center"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>

          <div>
            <h2 className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-tight">
              {step === 'cart' ? 'Mi Pedido' : step === 'checkout' ? 'Datos de Entrega' : '¡Pedido Confirmado!'}
            </h2>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">
              {businessName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── CONTENIDO PRINCIPAL EN PANTALLA COMPLETA ── */}
      <div className="flex-1 overflow-y-auto max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5">
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
                  <p className="text-xs text-slate-500 mt-1 font-medium">Agrega tus platillos favoritos del menú</p>
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
                {/* CABECERA PLATILLOS SELECCIONADOS */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    PLATILLOS SELECCIONADOS ({totalItemsCount})
                  </span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Carrito</span>
                  </button>
                </div>

                {/* LISTA DE TARJETAS DE PLATILLOS */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center justify-between gap-4 hover:shadow-xs transition-all"
                    >
                      {/* Imagen + Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {item.product.imagenUrl ? (
                          <img
                            src={item.product.imagenUrl}
                            alt={item.product.nombre}
                            className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl shrink-0">
                            🍲
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                            {item.product.nombre}
                          </h4>
                          {item.product.descripcion && (
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-normal">
                              {item.product.descripcion.replace(/<!--[\s\S]*?-->/g, '')}
                            </p>
                          )}
                          <span style={{ color: primaryColor }} className="text-sm font-black block pt-0.5">
                            ${((Number(item.product.precio) || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Controles de Cantidad [- N +] y Eliminar */}
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => decrementQuantity(item.product.id)}
                            className="w-8 h-8 bg-white text-slate-800 rounded-xl font-black text-xs flex items-center justify-center hover:bg-slate-200 cursor-pointer active:scale-95 transition-all"
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
                            className="w-8 h-8 text-white rounded-xl font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTÓN AGREGAR MÁS PRODUCTOS */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl border border-dashed border-slate-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" style={{ color: primaryColor }} />
                  <span>Agregar más productos</span>
                </button>

                {/* TARJETA CÓDIGO DE DESCUENTO */}
                <div className="bg-amber-50/60 border border-amber-100/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-2xs shrink-0" style={{ color: primaryColor }}>
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                        ¿Tienes un código de descuento?
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Ingresa tu código y obtén beneficios
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{ color: primaryColor, borderColor: `${primaryColor}30` }}
                    className="bg-white border px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-2xs hover:bg-amber-50/50 transition-all shrink-0 cursor-pointer"
                  >
                    Agregar código
                  </button>
                </div>

                {/* RESUMEN DEL PEDIDO */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Resumen del pedido
                  </h3>

                  <div className="space-y-2 text-xs font-medium text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Subtotal ({totalItemsCount} productos)</span>
                      <span className="font-black text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Descuento</span>
                      <span className="font-bold text-emerald-600">-$0.00</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <span>Costo de envío</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                      <span className="font-black text-slate-900">
                        {deliveryCost === 0 ? (
                          <span className="text-emerald-600 font-bold">$0.00</span>
                        ) : (
                          `$${deliveryCost.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* CAJA TOTAL DESTACADA DEBAJO DEL RESUMEN */}
                  <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4 flex items-center justify-between mt-2">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                        Total a pagar
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                        IVA incluido
                      </span>
                    </div>

                    <span style={{ color: primaryColor }} className="text-2xl font-black">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* FILA DE GARANTÍAS / BENEFICIOS (TRUST BADGES) */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-2xs" style={{ color: primaryColor }}>
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-900 block leading-tight">Pago seguro</span>
                    <span className="text-[9px] font-medium text-slate-500 block leading-tight">Tus datos protegidos</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-2xs" style={{ color: primaryColor }}>
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-900 block leading-tight">Preparación rápida</span>
                    <span className="text-[9px] font-medium text-slate-500 block leading-tight">Listo en 25–35 min</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-2xs" style={{ color: primaryColor }}>
                      <Truck className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-900 block leading-tight">Entrega a domicilio</span>
                    <span className="text-[9px] font-medium text-slate-500 block leading-tight">Rápido y seguro</span>
                  </div>
                </div>

                {/* BOTÓN PRINCIPAL DE CONTINUAR PEDIDO Y SEGURIDAD SSL */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleNextToCheckout}
                    style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl flex items-center justify-between px-6 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>CONTINUAR PEDIDO</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black">${subtotal.toFixed(2)}</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Tus datos están protegidos con cifrado SSL</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PASO 2: CHECKOUT CON SELECCIONAR UBICACIÓN ACTUAL ── */}
        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            {/* 1. SELECCIÓN DE MÉTODO DE ENTREGA */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                1. SELECCIÓN DE MÉTODO DE ENTREGA
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType('DOMICILIO')}
                  style={{
                    borderColor: deliveryType === 'DOMICILIO' ? primaryColor : '#e2e8f0',
                    backgroundColor: deliveryType === 'DOMICILIO' ? '#fff5f2' : '#ffffff',
                    color: deliveryType === 'DOMICILIO' ? primaryColor : '#475569'
                  }}
                  className={`py-3 px-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                    deliveryType === 'DOMICILIO' ? 'border-2' : ''
                  }`}
                >
                  <Truck className="w-5 h-5" style={{ color: deliveryType === 'DOMICILIO' ? primaryColor : '#64748b' }} />
                  <span>A Domicilio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('RETIRO')}
                  style={{
                    borderColor: deliveryType === 'RETIRO' ? primaryColor : '#e2e8f0',
                    backgroundColor: deliveryType === 'RETIRO' ? '#fff5f2' : '#ffffff',
                    color: deliveryType === 'RETIRO' ? primaryColor : '#475569'
                  }}
                  className={`py-3 px-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                    deliveryType === 'RETIRO' ? 'border-2' : ''
                  }`}
                >
                  <Store className="w-5 h-5" style={{ color: deliveryType === 'RETIRO' ? primaryColor : '#64748b' }} />
                  <span>Para Retirar</span>
                </button>
              </div>
            </div>

            {/* 2. DATOS DEL CLIENTE */}
            <div className="space-y-3.5 bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                2. DATOS DEL CLIENTE
              </span>

              {/* Nombre Completo con padding seguro pl-11 */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-800">Nombre Completo *</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                  <input
                    type="text"
                    required
                    value={customerData.nombre}
                    onChange={(e) => setCustomerData({ nombre: e.target.value })}
                    placeholder="Carlos Caicedo"
                    className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp / Teléfono con padding seguro pl-11 */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-800">WhatsApp / Teléfono *</label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                  <input
                    type="tel"
                    required
                    value={customerData.telefono}
                    onChange={(e) => setCustomerData({ telefono: e.target.value })}
                    placeholder="593959997521"
                    className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* DIRECCIÓN DE ENTREGA CON SELECCIONAR UBICACIÓN ACTUAL */}
              {deliveryType === 'DOMICILIO' && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-black text-slate-800">Dirección de Entrega *</label>

                  <div
                    onClick={() => setShowMapModal(true)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
                  >
                    {/* Miniatura de Mapa Leaflet Centrado */}
                    <MiniMapPreview lat={customerData.lat} lng={customerData.lng} />

                    {/* Tarjeta Inferior Blanca con Dirección o Seleccionar Ubicación Actual */}
                    <div className="p-3.5 bg-white space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span className="text-xs font-black text-slate-900 leading-tight">
                            {hasLocationSelected
                              ? customerData.direccion
                              : 'Seleccionar ubicación actual'}
                          </span>
                        </div>
                        <div className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg shrink-0">
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                      </div>

                      {/* Estado Verificado o Botón de Autodetectar Ubicación Actual */}
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                        {hasLocationSelected ? (
                          <>
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 shrink-0" />
                              <span>Ubicación verificada</span>
                              {customerData.lat && customerData.lng && (
                                <span className="font-mono text-slate-400 font-normal">
                                  Lat: {customerData.lat.toFixed(4)}, Lng: {customerData.lng.toFixed(4)}
                                </span>
                              )}
                            </div>

                            <span style={{ color: primaryColor }} className="font-extrabold hover:underline">
                              Cambiar ubicación
                            </span>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleAutoDetectCurrentLocation}
                              disabled={isLocatingCurrent}
                              className="flex items-center gap-1.5 text-emerald-600 font-extrabold hover:underline"
                            >
                              {isLocatingCurrent ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>Usar mi ubicación GPS actual</span>
                            </button>

                            <span style={{ color: primaryColor }} className="font-extrabold hover:underline">
                              Seleccionar en mapa
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Referencia (Opcional) con padding seguro pl-11 */}
              {deliveryType === 'DOMICILIO' && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-black text-slate-800">Referencia (Opcional)</label>
                  <div className="relative flex items-center">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                    <input
                      type="text"
                      value={customerData.referencia || ''}
                      onChange={(e) => setCustomerData({ referencia: e.target.value })}
                      placeholder="ZV00ZXW"
                      className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold animate-pulse">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* RESUMEN FINANCIERO */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between font-medium text-slate-600">
                <span>Subtotal de Platillos</span>
                <span className="text-slate-900 font-black">${subtotal.toFixed(2)}</span>
              </div>

              {deliveryType === 'DOMICILIO' && (
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Costo de Envío</span>
                  <span className="text-slate-900 font-black">
                    {deliveryCost === 0 ? (
                      <span className="text-emerald-600 font-black flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" /> GRATIS
                      </span>
                    ) : (
                      `$${deliveryCost.toFixed(2)}`
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total a Pagar</span>
                <span style={{ color: primaryColor }} className="font-black text-base">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* BOTÓN SUBMIT CONFIRMAR PEDIDO */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>ENVIANDO PEDIDO...</span>
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
