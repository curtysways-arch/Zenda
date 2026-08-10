'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Store, Building2, MapPin, ExternalLink, CheckCircle, X, Navigation,
  PackageCheck, Clock, ShieldAlert, Crosshair, Route, ArrowLeft
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
  
  // Tiempos y distancias reales de la ruta por calles (OSRM)
  const [routeLeg1, setRouteLeg1] = useState<{ distanceKm: string; durationMin: string } | null>(null);
  const [routeLeg2, setRouteLeg2] = useState<{ distanceKm: string; durationMin: string } | null>(null);

  // Parsear extraInfo y configuracion
  const parseJson = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  };

  const extra = parseJson(order.extraInfo);
  const cfg = parseJson(order.negocio?.configuracion);
  const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);
  const itemsSummary = (order.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');

  // SUCURSALES: Identificar si el pedido corresponde a una sucursal específica
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

  // Coordenadas Punto A (Recogida): Priorizar sucursal -> latitudNegocio en config -> latitud negocio -> fallback
  const latA = Number(matchedSucursal?.latitud || cfg.latitudNegocio || order.negocio?.latitud || -0.1136755);
  const lngA = Number(matchedSucursal?.longitud || cfg.longitudNegocio || order.negocio?.longitud || -78.4798158);

  // Coordenadas Punto B (Cliente Entrega)
  const latB = Number(order.latitud || extra.latitudCliente || (latA - 0.015));
  const lngB = Number(order.longitud || extra.longitudCliente || (lngA - 0.012));

  // CALCULAR HORA DE LLEGADA ESTIMADA AL LOCAL (HORA FIJADA POR EL NEGOCIO AL ACEPTAR EL PEDIDO)
  const getHoraLlegadaLocal = () => {
    if (extra?.estimatedReadyAt) {
      const targetDate = new Date(extra.estimatedReadyAt);
      if (!isNaN(targetDate.getTime())) {
        const formattedHora = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const diffMs = targetDate.getTime() - Date.now();
        if (diffMs <= 0) {
          return `⏰ ¡Llegar Ya! (${formattedHora})`;
        }
        const mins = Math.ceil(diffMs / 60000);
        return `⏰ ${formattedHora} (Faltan ${mins} min)`;
      }
    }

    // Fallback: Si no tiene hora fijada por el negocio, calcula la hora +15-20 min del pedido
    const baseDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const targetDate = new Date(baseDate.getTime() + 20 * 60 * 1000);
    const formattedHora = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `⏰ ${formattedHora} (Hora est. del negocio)`;
  };

  // 1. SOLICITAR PERMISO DE UBICACIÓN MÓVIL EN TIEMPO REAL
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('ACTIVO');
        },
        (err) => {
          console.warn('Permiso GPS no concedido o no disponible:', err);
          setGpsStatus('DENEGADO');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setDriverRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('ACTIVO');
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setGpsStatus('DENEGADO');
    }
  }, []);

  // 2. INICIALIZAR LEAFLET MAP (PARTE SUPERIOR DE LA PANTALLA)
  useEffect(() => {
    let isCancelled = false;

    const initMap = () => {
      if (isCancelled || !mapDivRef.current) return;

      const L = (window as any).L;
      if (!L) {
        if (!document.getElementById('leaflet-css-driver')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css-driver';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        if (!document.getElementById('leaflet-js-driver')) {
          const script = document.createElement('script');
          script.id = 'leaflet-js-driver';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => { if (!isCancelled) initMap(); };
          document.head.appendChild(script);
        } else {
          setTimeout(() => { if (!isCancelled) initMap(); }, 250);
        }
        return;
      }

      if (mapInstanceRef.current || (mapDivRef.current as any)._leaflet_id) {
        try { mapInstanceRef.current?.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }

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

        // Marker A (Restaurante Recogida - Azul)
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

        // Marker B (Cliente Entrega - Verde)
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

        const latDriver = driverRealCoords?.lat || (latA + 0.004);
        const lngDriver = driverRealCoords?.lng || (lngA - 0.003);

        const iconDriver = L.divIcon({
          className: 'custom-pin-driver',
          html: `
            <div style="background:#84cc16; color:#0f172a; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 6px 16px rgba(132,204,22,0.6);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A2 2 0 0 0 2 11.7V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        driverMarkerRef.current = L.marker([latDriver, lngDriver], { icon: iconDriver }).addTo(map);
        markerARef.current = L.marker([latA, lngA], { icon: iconA }).addTo(map);
        markerBRef.current = L.marker([latB, lngB], { icon: iconB }).addTo(map);

        const bounds = L.latLngBounds([[latDriver, lngDriver], [latA, lngA], [latB, lngB]]);
        map.fitBounds(bounds, { padding: [40, 40] });

        setMapLoaded(true);
        setTimeout(() => map.invalidateSize(), 300);
      } catch (err) {
        console.error('Error inicializando mapa:', err);
      }
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [latA, lngA, latB, lngB]);

  // 3. CALCULAR RUTA REAL POR CALLES CON OSRM
  useEffect(() => {
    let isCancelled = false;

    async function calculateRealRoute() {
      if (!mapLoaded || !mapInstanceRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      const latDriver = driverRealCoords?.lat || (latA + 0.004);
      const lngDriver = driverRealCoords?.lng || (lngA - 0.003);

      try {
        // Tramo 1: Repartidor -> Punto A
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

        // Tramo 2: Punto A -> Punto B
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
              color: '#2563eb',
              weight: 7,
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

    calculateRealRoute();

    return () => { isCancelled = true; };
  }, [mapLoaded, latA, lngA, latB, lngB, driverRealCoords]);

  // Actualizar marcador del repartidor en tiempo real
  useEffect(() => {
    if (driverRealCoords && driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverRealCoords.lat, driverRealCoords.lng]);
    }
  }, [driverRealCoords]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col h-[100dvh] overflow-hidden animate-in fade-in duration-300">
      
      {/* 1. HEADER FIJO SUPERIOR CON LOGO CITIOX DRIVER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-30 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-400/30 overflow-hidden flex items-center justify-center shadow-md">
            <img src="/citiox-driver-logo.png" alt="CiTiOX Driver" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block leading-tight">
              {nombreLocal}
            </span>
            <h2 className="text-sm font-black text-white leading-tight">
              Pedido #{order.codigo || order.id.slice(-6).toUpperCase()}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          title="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. MAPA EN LA PARTE SUPERIOR (UBICACIÓN ANTES DE LA INFORMACIÓN DE LA ORDEN) */}
      <div className="w-full h-[36vh] sm:h-[40vh] bg-slate-900 relative z-10 shrink-0 border-b border-slate-800 shadow-md">
        <div ref={mapDivRef} className="w-full h-full" />
        
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-slate-300 gap-2 z-20">
            <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Trazando ruta por calles...</span>
          </div>
        )}

        {/* Badge GPS Status */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 text-[10px] font-extrabold shadow-lg">
          <Crosshair className={`w-3.5 h-3.5 ${gpsStatus === 'ACTIVO' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <span className="text-slate-200">
            {gpsStatus === 'ACTIVO' ? 'GPS Móvil Activo' : 'Obteniendo GPS...'}
          </span>
        </div>
      </div>

      {/* 3. INFORMACIÓN DE LA ORDEN PRE-ACEPTACIÓN (CON PADDING SUFICIENTE PARA LOS BOTONES FIJOS) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-48 text-left bg-slate-950 custom-scrollbar">
        
        {/* 1. Banner Ganancia */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-500/10">
          <span className="text-xs font-black uppercase tracking-wider">TU GANANCIA DE ENVÍO:</span>
          <span className="text-lg font-black tracking-tight">+${deliveryFee}</span>
        </div>

        {/* 2. Detalle de Productos en Paquete */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
            <PackageCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>DETALLE DE PRODUCTOS EN PAQUETE:</span>
          </div>
          <p className="font-bold text-slate-100 text-xs leading-relaxed pl-6">
            {itemsSummary || 'Sin productos registrados'}
          </p>
        </div>

        {/* 3. Recoge el Pedido en (Punto A - Local / Sucursal) */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-[10px]">A</span>
              RECOGE EL PEDIDO EN:
            </span>
            {matchedSucursal && (
              <span className="text-[9px] font-black uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30">
                Sucursal: {matchedSucursal.nombre}
              </span>
            )}
          </div>
          <p className="font-extrabold text-slate-100 text-xs pl-6 leading-relaxed">
            {nombreLocal} — {direccionLocal}
          </p>
        </div>

        {/* 4. Hora en la que debe llegar al local (Hora fijada por el negocio al aceptar el pedido) */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 shadow-sm">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            HORA LÍMITE DE LLEGADA AL LOCAL (FIJADA POR NEGOCIO):
          </span>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-300">Hora de retiro acordada:</span>
            <span className="font-black text-amber-300 font-mono text-xs sm:text-sm">
              {getHoraLlegadaLocal()}
            </span>
          </div>
          {routeLeg1 && (
            <p className="text-[10px] text-slate-400 font-medium pl-1">
              📍 Trayecto estimado a la sucursal: {routeLeg1.distanceKm} ({routeLeg1.durationMin} en vía)
            </p>
          )}
        </div>

        {/* 5. Entrega a Destino (Punto B - Cliente) */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center text-[10px]">B</span>
              ENTREGA A DESTINO (CLIENTE):
            </span>
          </div>
          <p className="font-extrabold text-slate-100 text-xs pl-6 leading-relaxed">
            {order.direccionCliente || 'Sin dirección de cliente registrada'}
          </p>
          {order.referenciaCliente && (
            <p className="text-[10px] text-slate-400 font-medium pl-6">Ref: {order.referenciaCliente}</p>
          )}
        </div>

      </div>

      {/* 4. BARRA DE ACCIÓN FIJA INFERIOR (PERMANENTEMENTE FIJA Y VISIBLE EN CUALQUIER PANTALLA) */}
      <div className="fixed bottom-0 left-0 right-0 z-[300] bg-slate-900/98 backdrop-blur-2xl border-t border-slate-800 p-3.5 sm:p-4 pb-6 space-y-2 shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
        <button
          onClick={() => onAccept(order.id)}
          disabled={actionLoading || hasActiveOrder}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLVER A LA BOLSA</span>
        </button>
      </div>

    </div>
  );
}
