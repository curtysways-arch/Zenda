'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Store, Building2, MapPin, ExternalLink, CheckCircle, X, Navigation,
  PackageCheck, Clock, ShieldAlert, Crosshair, Route, ArrowLeft, Check, Sparkles
} from 'lucide-react';

interface DbOrder {
  id: string;
  numeroPedido: number;
  codigo?: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionCliente?: string;
  referenciaCliente?: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  total: number;
  costoEnvio?: number;
  paymentStatus?: string;
  createdAt: string;
  extraInfo?: any;
  negocio?: {
    id: string;
    nombre: string;
    slug: string;
    logoUrl?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
    configuracion?: any;
    Ubicacion?: Array<{
      id: string;
      nombre: string;
      direccion?: string;
      latitud?: number;
      longitud?: number;
    }>;
  };
  items: Array<{
    id?: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
  }>;
}

interface Props {
  order: DbOrder;
  driverId: string;
  hasActiveOrder: boolean;
  actionLoading: boolean;
  onAccept: (orderId: string) => void;
  onClose: () => void;
}

export default function DriverOrderMapModal({
  order,
  driverId,
  hasActiveOrder,
  actionLoading,
  onAccept,
  onClose,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [driverRealCoords, setDriverRealCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'SOLICITANDO' | 'ACTIVO' | 'DENEGADO'>('SOLICITANDO');

  const [routeLeg1, setRouteLeg1] = useState<{ distanceKm: string; durationMin: string } | null>(null);
  const [routeLeg2, setRouteLeg2] = useState<{ distanceKm: string; durationMin: string } | null>(null);

  const parseJson = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  };

  const extra = parseJson(order.extraInfo);
  const cfg = parseJson(order.negocio?.configuracion);
  
  const getDriverRealFee = () => {
    const realFee = Number(
      extra?.pricingBreakdown?.realShippingCost ||
      extra?.pricingBreakdown?.originalShippingFee ||
      extra?.pricingBreakdown?.driverFee ||
      extra?.realDriverFee ||
      extra?.originalCostoEnvio ||
      0
    );
    if (realFee > 0) return realFee.toFixed(2);

    const orderFee = Number(order.costoEnvio || 0);
    const subsidy = Number(extra?.pricingBreakdown?.restaurantSubsidy || extra?.restaurantSubsidy || extra?.subsidioRestaurante || 0);
    if (subsidy > 0) {
      return (orderFee + subsidy).toFixed(2);
    }

    if (orderFee < 1.50) {
      const breakdownDist = Number(extra?.pricingBreakdown?.distanceKm || extra?.distanceKm || 0);
      let dist = breakdownDist;
      if (dist <= 0 && order.latitud && order.longitud) {
        const R = 6371;
        const lat1 = -0.180653; const lon1 = -78.467838;
        const dLat = ((order.latitud - lat1) * Math.PI) / 180;
        const dLon = ((order.longitud - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((order.latitud * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
      }
      if (dist <= 0) dist = 5.3;
      const calcFee = Math.max(2.50, 1.50 + (dist * 0.30));
      return calcFee.toFixed(2);
    }

    return (orderFee > 0 ? orderFee : 2.50).toFixed(2);
  };
  const deliveryFee = getDriverRealFee();
  const itemsSummary = (order.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');

  // SUCURSALES
  const sucursales = order.negocio?.Ubicacion || (order.negocio as any)?.ubicaciones || [];
  const targetUbicacionId = extra.ubicacionId || (order as any).ubicacionId;
  const matchedSucursal = sucursales.find((u: any) => u.id === targetUbicacionId) || (sucursales.length > 0 ? sucursales[0] : null);

  const nombreLocal = matchedSucursal 
    ? `${order.negocio?.nombre || 'Local'} (${matchedSucursal.nombre})`
    : (order.negocio?.nombre || 'La Parrilla Citiox');

  const direccionLocal = matchedSucursal?.direccion 
    || cfg.direccion 
    || order.negocio?.direccion 
    || 'Dirección del local registrada';

  const latA = Number(matchedSucursal?.latitud || cfg.latitudNegocio || order.negocio?.latitud || -0.1136755);
  const lngA = Number(matchedSucursal?.longitud || cfg.longitudNegocio || order.negocio?.longitud || -78.4723924);

  const latB = Number(order.latitud || -0.180653);
  const lngB = Number(order.longitud || -78.467838);

  const getHoraLlegadaLocal = () => {
    if (extra.horaLlegadaLocal) return extra.horaLlegadaLocal;
    const prepMinutes = Number(extra.tiempoPreparacionEstimado || 15);
    const createdTime = new Date(order.createdAt).getTime();
    const limitTime = new Date(createdTime + prepMinutes * 60000);
    return `${limitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Faltan ${prepMinutes} min)`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('DENEGADO');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDriverRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ACTIVO');
      },
      () => setGpsStatus('DENEGADO'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapDivRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    let isCancelled = false;

    async function calculateRealRoute() {
      if (!mapLoaded || !mapInstanceRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      const latDriver = driverRealCoords?.lat || (latA + 0.004);
      const lngDriver = driverRealCoords?.lng || (lngA - 0.003);

      try {
        const res1 = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${lngDriver},${latDriver};${lngA},${latA}?overview=full&geometries=geojson`
        );
        if (res1.ok && !isCancelled) {
          const data1 = await res1.json();
          if (data1.routes && data1.routes.length > 0) {
            const r1 = data1.routes[0];
            const dist1 = (r1.distance / 1000).toFixed(1);
            const time1 = Math.ceil(r1.duration / 60);

            setRouteLeg1({ distanceKm: `${dist1} km`, durationMin: `${time1} min` });

            const coords1 = r1.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            if ((mapInstanceRef.current as any).polyLeg1) {
              mapInstanceRef.current.removeLayer((mapInstanceRef.current as any).polyLeg1);
            }
            const poly1 = L.polyline(coords1, {
              color: '#2563eb',
              weight: 6,
              opacity: 0.85,
              dashArray: '6, 8',
            }).addTo(mapInstanceRef.current);
            (mapInstanceRef.current as any).polyLeg1 = poly1;

            const badgeEl = document.getElementById('badge-a-text');
            if (badgeEl) badgeEl.innerText = `${time1} min • ${dist1} km`;
          }
        }

        const res2 = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${lngA},${latA};${lngB},${latB}?overview=full&geometries=geojson`
        );
        if (res2.ok && !isCancelled) {
          const data2 = await res2.json();
          if (data2.routes && data2.routes.length > 0) {
            const r2 = data2.routes[0];
            const dist2 = (r2.distance / 1000).toFixed(1);
            const time2 = Math.ceil(r2.duration / 60);

            setRouteLeg2({ distanceKm: `${dist2} km`, durationMin: `${time2} min` });

            const coords2 = r2.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            if ((mapInstanceRef.current as any).polyLeg2) {
              mapInstanceRef.current.removeLayer((mapInstanceRef.current as any).polyLeg2);
            }
            const poly2 = L.polyline(coords2, {
              color: '#10b981',
              weight: 6,
              opacity: 0.9,
            }).addTo(mapInstanceRef.current);
            (mapInstanceRef.current as any).polyLeg2 = poly2;

            const badgeEl = document.getElementById('badge-b-text');
            if (badgeEl) badgeEl.innerText = `${time2} min • ${dist2} km`;
          }
        }
      } catch (err) {
        console.warn('Error obteniendo ruta OSRM:', err);
      }
    }

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapDivRef.current, {
          zoomControl: true,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        const iconA = L.divIcon({
          className: 'custom-pin-a',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
              <div id="badge-a-text" style="background:#2563eb; color:white; font-size:11px; font-weight:900; padding:3px 8px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:2px solid white; white-space:nowrap; margin-bottom:4px;">
                Calculando ruta...
              </div>
              <div style="background:#2563eb; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; border:3px solid white; box-shadow:0 6px 16px rgba(37,99,235,0.5);">
                A
              </div>
            </div>
          `,
          iconSize: [120, 65],
          iconAnchor: [60, 63],
        });

        const iconB = L.divIcon({
          className: 'custom-pin-b',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
              <div id="badge-b-text" style="background:#10b981; color:white; font-size:11px; font-weight:900; padding:3px 8px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:2px solid white; white-space:nowrap; margin-bottom:4px;">
                Calculando ruta...
              </div>
              <div style="background:#10b981; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; border:3px solid white; box-shadow:0 6px 16px rgba(16,185,129,0.5);">
                B
              </div>
            </div>
          `,
          iconSize: [120, 65],
          iconAnchor: [60, 63],
        });

        markerARef.current = L.marker([latA, lngA], { icon: iconA }).addTo(map);
        markerBRef.current = L.marker([latB, lngB], { icon: iconB }).addTo(map);

        const latDriver = driverRealCoords?.lat || (latA + 0.004);
        const lngDriver = driverRealCoords?.lng || (lngA - 0.003);

        const iconDriver = L.divIcon({
          className: 'custom-pin-driver',
          html: `
            <div style="background:#3b82f6; color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; border:3px solid white; box-shadow:0 0 15px rgba(59,130,246,0.8);">
              🛵
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        driverMarkerRef.current = L.marker([latDriver, lngDriver], { icon: iconDriver }).addTo(map);

        const bounds = L.latLngBounds([[latDriver, lngDriver], [latA, lngA], [latB, lngB]]);
        map.fitBounds(bounds, { padding: [50, 50] });

        calculateRealRoute();
      } catch (e) {
        console.error('Error inicializando Leaflet map:', e);
      }
    } else {
      calculateRealRoute();
    }

    return () => { isCancelled = true; };
  }, [mapLoaded, latA, lngA, latB, lngB, driverRealCoords]);

  const paymentState = (order.paymentStatus || (order as any).payment?.estado || extra?.paymentStatus || '').toUpperCase();
  const paymentMethod = ((order as any).metodoPago || (order as any).payment?.metodo || extra?.metodoPago || '').toUpperCase();

  const isOrderPaid = ['CONFIRMADO', 'PAGO_VERIFICADO', 'VERIFICADO', 'PAID'].includes(paymentState) ||
                      (['TRANSFERENCIA', 'TARJETA', 'STRIPE', 'PAYPHONE', 'DATAFAT', 'TRANSFER', 'ONLINE'].includes(paymentMethod) && paymentState !== 'PENDIENTE');

  const isCashOnDelivery = !isOrderPaid;
  const totalVal = Number(order.total || 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 text-slate-900 flex flex-col h-[100dvh] overflow-hidden animate-in fade-in duration-300">
      
      {/* 1. HEADER FIJO SUPERIOR CON LOGO CITIOX DRIVER (AZUL REY) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white px-4 py-3 flex items-center justify-between z-30 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 overflow-hidden flex items-center justify-center shadow-md">
            <img src="/citiox-driver-logo.png" alt="CiTiOX Driver" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block leading-tight">
              {nombreLocal}
            </span>
            <h2 className="text-sm font-black text-white leading-tight">
              Pedido #{order.codigo || order.id.slice(-6).toUpperCase()}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. MAPA EN LA PARTE SUPERIOR */}
      <div className="w-full h-[36vh] sm:h-[40vh] bg-slate-200 relative z-10 shrink-0 shadow-md">
        <div ref={mapDivRef} className="w-full h-full" />
        
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white gap-2 z-20">
            <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-blue-200">Trazando ruta por calles...</span>
          </div>
        )}

        {/* Badge GPS Status */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-md flex items-center gap-2 text-xs font-black">
          <Crosshair className={`w-4 h-4 ${gpsStatus === 'ACTIVO' ? 'text-blue-600 animate-pulse' : 'text-amber-500'}`} />
          <span className="text-slate-800">
            {gpsStatus === 'ACTIVO' ? 'GPS Móvil Activo' : 'Obteniendo GPS...'}
          </span>
        </div>
      </div>

      {/* 3. INFORMACIÓN DE LA ORDEN PRE-ACEPTACIÓN (DISEÑO BLANCO Y AZUL SIN BORDES) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48 text-left bg-slate-100 custom-scrollbar">
        
        {/* 1. Banner Ganancia */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 rounded-3xl flex items-center justify-between shadow-lg shadow-blue-500/20">
          <span className="text-xs font-black uppercase tracking-wider">TU GANANCIA DE ENVÍO:</span>
          <span className="text-xl font-black tracking-tight">+${deliveryFee}</span>
        </div>

        {/* 1.5. Banner Cobro al Cliente */}
        {isOrderPaid ? (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-4 shadow-sm text-left flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-emerald-950 block">✅ PEDIDO YA PAGADO ($0.00 A COBRAR)</span>
                <span className="text-xs font-bold text-emerald-700">El cliente pagó online. No debes cobrar efectivo al entregar.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-3xl p-4 shadow-md text-left space-y-1">
            <span className="text-xs font-black uppercase tracking-wider block opacity-90">💵 COBRAR EN EFECTIVO AL CLIENTE:</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black font-mono">${totalVal}</span>
              <span className="px-3 py-0.5 bg-slate-950/20 rounded-full text-[10px] font-black uppercase">Cobrar en Puerta</span>
            </div>
          </div>
        )}

        {/* 2. Detalle de Productos en Paquete */}
        <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-wider">
            <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>DETALLE DE PRODUCTOS EN PAQUETE:</span>
          </div>
          <p className="font-bold text-slate-800 text-sm leading-relaxed pl-6">
            {itemsSummary || 'Sin productos registrados'}
          </p>
        </div>

        {/* 3. Recoge el Pedido en (Punto A - Local / Sucursal) */}
        <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">A</span>
              RECOGE EL PEDIDO EN:
            </span>
            {matchedSucursal && (
              <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                Sucursal: {matchedSucursal.nombre}
              </span>
            )}
          </div>
          <p className="font-extrabold text-slate-900 text-sm pl-6 leading-relaxed">
            {nombreLocal} — {direccionLocal}
          </p>
        </div>

        {/* 4. Hora límite de llegada al local */}
        <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-2">
          <span className="text-xs font-black uppercase text-amber-600 tracking-wider block flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            HORA LÍMITE DE LLEGADA AL LOCAL (FIJADA POR NEGOCIO):
          </span>
          <div className="bg-amber-50 p-4 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-900">Hora de retiro acordada:</span>
            <span className="font-black text-amber-600 font-mono text-sm">
              {getHoraLlegadaLocal()}
            </span>
          </div>
          {routeLeg1 && (
            <p className="text-xs text-slate-500 font-semibold pl-1">
              📍 Trayecto estimado a la sucursal: {routeLeg1.distanceKm} ({routeLeg1.durationMin} en vía)
            </p>
          )}
        </div>

        {/* 5. Entrega a Destino (Punto B - Cliente) */}
        <div className="bg-white rounded-3xl p-5 shadow-md shadow-slate-200/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">B</span>
              ENTREGA A DESTINO (CLIENTE):
            </span>
          </div>
          <p className="font-extrabold text-slate-900 text-sm pl-6 leading-relaxed">
            {order.direccionCliente || 'Sin dirección de cliente registrada'}
          </p>
          {order.referenciaCliente && (
            <p className="text-xs text-slate-500 font-medium pl-6">Ref: {order.referenciaCliente}</p>
          )}
        </div>

      </div>

      {/* 4. BARRA DE ACCIÓN FIJA INFERIOR BLANCA CON BOTÓN GIGANTE AZUL */}
      <div className="fixed bottom-0 left-0 right-0 z-[300] bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 pb-6 space-y-2 shadow-2xl">
        <button
          onClick={() => onAccept(order.id)}
          disabled={actionLoading || hasActiveOrder}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-5 h-5 stroke-[2.5]" />
          <span>
            {hasActiveOrder
              ? '⚠️ Ya tienes 1 entrega activa'
              : `ACEPTAR ESTA CARRERA (GANANCIA $${deliveryFee})`}
          </span>
        </button>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLVER A LA BOLSA</span>
        </button>
      </div>

    </div>
  );
}
