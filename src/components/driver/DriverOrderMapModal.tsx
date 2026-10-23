'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getCanonicalLogistics, getActiveDriverCompensation, isLaundryType } from '@/core/logistics/CanonicalLogisticsService';
import {
  Store, Building2, MapPin, ExternalLink, CheckCircle, X, Navigation,
  PackageCheck, Clock, ShieldAlert, Crosshair, Route, ArrowLeft, Check, Sparkles, Phone, MessageCircle
} from 'lucide-react';
import { ventanaRetiro, textoVentana, esParaMasTarde } from '@/lib/laundry/pickupWindow';

interface DbOrder {
  id: string;
  numeroPedido: number;
  codigo?: string;
  repartidorId?: string;
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
  branchId?: string;
  branch?: {
    id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  negocio?: {
    id: string;
    nombre: string;
    slug: string;
    logoUrl?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
    configuracion?: any;
    branches?: Array<{
      id: string;
      name: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      isMain?: boolean;
    }>;
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
  onUpdateState?: (orderId: string, newState: any, pin?: string) => Promise<any>;
  onCancel?: (order: DbOrder) => void;
}

export default function DriverOrderMapModal({
  order,
  driverId,
  hasActiveOrder,
  actionLoading,
  onAccept,
  onClose,
  onUpdateState,
  onCancel,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [driverRealCoords, setDriverRealCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'SOLICITANDO' | 'ACTIVO' | 'DENEGADO'>('SOLICITANDO');

  // Estados de las rutas:
  // 1. Repartidor -> A
  const [routeDriverA, setRouteDriverA] = useState<{ distanceKm: string; durationMin: string; numDist: number; numTime: number } | null>(null);
  // 2. Punto A -> Punto B (desde el inicio)
  const [routeAB, setRouteAB] = useState<{ distanceKm: string; durationMin: string; numDist: number; numTime: number } | null>(null);
  // 3. Repartidor -> B (cuando ya se recogió)
  const [routeDriverB, setRouteDriverB] = useState<{ distanceKm: string; durationMin: string; numDist: number; numTime: number } | null>(null);

  const parseJson = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  };

  const extra = parseJson(order.extraInfo);
  const cfg = parseJson(order.negocio?.configuracion);

  const businessIdentifier = `${order.negocio?.slug || ''} ${order.negocio?.nombre || ''}`;
  const canonical = getCanonicalLogistics(order, driverId);
  const driverComp = getActiveDriverCompensation(order, driverId);

  const isLaundry = isLaundryType((order.negocio as any)?.tipoNegocio, extra, businessIdentifier) ||
                    (order as any).isLaundry || extra?.isLaundry || 
                    canonical.tipoMision === 'ROUND_TRIP_SERVICE' ||
                    Boolean(extra?.servicioNombre || extra?.articulos || extra?.cantidadPares) ||
                    ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'ESPERANDO_REPARTIDOR_ENTREGA', 'LISTO_PARA_ENTREGA', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'].includes(order.estado);
  const isRetiro = (order as any).tipoMision === 'RETIRO' || extra?.tipoMision === 'RETIRO' || ['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'].includes(order.estado);
  
  // Determinar si ya está recogido
  const isPickedUp = 
    order.estado === 'RECOGIDO' ||
    order.estado === 'ENTREGADO_A_REPARTIDOR' ||
    order.estado === 'EN_CAMINO' ||
    order.estado === 'EN_RUTA' ||
    order.estado === 'EN_RUTA_ENTREGA' ||
    order.estado === 'WAITING_CLIENT' ||
    order.estado === 'ESPERANDO_CLIENTE' ||
    order.estado === 'DELIVERED_TO_WORKSHOP' ||
    order.estado === 'ENTREGADO' ||
    Boolean(extra?.isPickedUp || extra?.repartidorRecogio || extra?.repartidorEnRuta);

  const isAlreadyAssigned = 
    order.repartidorId === driverId ||
    ['REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_CAMINO', 'REPARTIDOR_EN_LOCAL', 'RECOGIDO', 'EN_CAMINO', 'EN_RUTA', 'EN_RUTA_ENTREGA', 'WAITING_CLIENT', 'ESPERANDO_CLIENTE'].includes(order.estado);

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
  const activeMissionEarning = (driverComp?.monto && driverComp.monto > 0)
    ? driverComp.monto.toFixed(2)
    : (isLaundry && Number(deliveryFee) > 0 ? (Number(deliveryFee) / 2).toFixed(2) : deliveryFee);
  const itemsSummary = (order.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');

  // SUCURSALES (Prioridad estricta en Sucursales)
  const branchDirect = order.branch;
  const branchesList = order.negocio?.branches || [];
  const targetBranchId = order.branchId || extra.branchId;
  const matchedBranch = branchDirect || branchesList.find((b: any) => b.id === targetBranchId) || branchesList.find((b: any) => b.isMain) || (branchesList.length > 0 ? branchesList[0] : null);

  const sucursales = order.negocio?.Ubicacion || (order.negocio as any)?.ubicaciones || [];
  const targetUbicacionId = extra.ubicacionId || (order as any).ubicacionId;
  const matchedSucursal = sucursales.find((u: any) => u.id === targetUbicacionId) || (sucursales.length > 0 ? sucursales[0] : null);

  const nombreLocal = matchedBranch 
    ? `${order.negocio?.nombre || 'Local'} (${matchedBranch.name})`
    : matchedSucursal 
      ? `${order.negocio?.nombre || 'Local'} (${matchedSucursal.nombre})`
      : (order.negocio?.nombre || 'Local');

  const direccionLocal = matchedBranch?.address
    || matchedSucursal?.direccion 
    || cfg.direccion 
    || order.negocio?.direccion 
    || 'Dirección del local registrada';

  const rawLatLocal = Number(
    matchedBranch?.latitude ||
    matchedSucursal?.latitud ||
    order.negocio?.latitud ||
    extra.origenLat ||
    cfg.latitudNegocio ||
    -0.0907211
  );
  const rawLngLocal = Number(
    matchedBranch?.longitude ||
    matchedSucursal?.longitud ||
    order.negocio?.longitud ||
    extra.origenLng ||
    cfg.longitudNegocio ||
    -78.4410867
  );

  const rawLatClient = Number(order.latitud || -0.180653);
  const rawLngClient = Number(order.longitud || -78.467838);

  // En RETIRO: Punto A es el Cliente (se recoge) y Punto B es el Taller (se entrega)
  // En ENTREGA / Estándar: Punto A es el Local y Punto B es el Cliente
  const latA = isRetiro ? rawLatClient : rawLatLocal;
  const lngA = isRetiro ? rawLngClient : rawLngLocal;

  const latB = isRetiro ? rawLatLocal : rawLatClient;
  const lngB = isRetiro ? rawLngLocal : rawLngClient;

  // Destino activo para navegación de Google Maps
  const targetLat = isPickedUp ? latB : latA;
  const targetLng = isPickedUp ? lngB : lngA;

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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDriverRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ACTIVO');
      },
      (err) => {
        console.warn('GPS inicial no obtenido inmediatamente:', err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDriverRealCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ACTIVO');
      },
      () => setGpsStatus('DENEGADO'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
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

      const latDriver = driverRealCoords?.lat ?? (isPickedUp ? (latB - 0.005) : (latA + 0.005));
      const lngDriver = driverRealCoords?.lng ?? (isPickedUp ? (lngB - 0.005) : (lngA - 0.005));

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([latDriver, lngDriver]);
      }

      try {
        // =========================================================================
        // 1. RUTA VIAL DESDE PUNTO A HASTA PUNTO B (PRESENTE DESDE EL INICIO)
        // =========================================================================
        const resAB = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${lngA},${latA};${lngB},${latB}?overview=full&geometries=geojson`
        );
        if (resAB.ok && !isCancelled) {
          const dataAB = await resAB.json();
          if (dataAB.routes && dataAB.routes.length > 0) {
            const rAB = dataAB.routes[0];
            const distAB = (rAB.distance / 1000).toFixed(1);
            const timeAB = Math.ceil(rAB.duration / 60);

            setRouteAB({
              distanceKm: `${distAB} km`,
              durationMin: `${timeAB} min`,
              numDist: Number(distAB),
              numTime: timeAB
            });

            const coordsAB = rAB.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            if ((mapInstanceRef.current as any).polyAB) {
              mapInstanceRef.current.removeLayer((mapInstanceRef.current as any).polyAB);
            }

            // Trazado vial por calles de A hacia B
            const polyAB = L.polyline(coordsAB, {
              color: '#10b981', // Verde esmeralda para el tramo A -> B
              weight: isPickedUp ? 3 : 5,
              opacity: isPickedUp ? 0.35 : 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(mapInstanceRef.current);
            (mapInstanceRef.current as any).polyAB = polyAB;

            const badgeB = document.getElementById('badge-b-text');
            if (badgeB && !isPickedUp) {
              badgeB.innerText = `A ➔ B: ${timeAB} min • ${distAB} km`;
            }
          }
        }

        // =========================================================================
        // 2. RUTA DEL REPARTIDOR (SEGÚN LA ETAPA)
        // =========================================================================
        if (!isPickedUp) {
          // FASE 1: Desde la posición actual del repartidor hacia el PUNTO A
          const resDriverA = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lngDriver},${latDriver};${lngA},${latA}?overview=full&geometries=geojson`
          );
          if (resDriverA.ok && !isCancelled) {
            const dataDriverA = await resDriverA.json();
            if (dataDriverA.routes && dataDriverA.routes.length > 0) {
              const rDA = dataDriverA.routes[0];
              const distDA = (rDA.distance / 1000).toFixed(1);
              const timeDA = Math.ceil(rDA.duration / 60);

              setRouteDriverA({
                distanceKm: `${distDA} km`,
                durationMin: `${timeDA} min`,
                numDist: Number(distDA),
                numTime: timeDA
              });

              const coordsDA = rDA.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
              if ((mapInstanceRef.current as any).polyDriverA) {
                mapInstanceRef.current.removeLayer((mapInstanceRef.current as any).polyDriverA);
              }
              const polyDriverA = L.polyline(coordsDA, {
                color: isRetiro ? '#8b5cf6' : '#2563eb', // Morado o Azul rey
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(mapInstanceRef.current);
              (mapInstanceRef.current as any).polyDriverA = polyDriverA;

              const badgeA = document.getElementById('badge-a-text');
              if (badgeA) {
                badgeA.innerText = `Repartidor ➔ A: ${timeDA} min • ${distDA} km`;
              }

              // Auto-encuadrar mostrando tanto la ruta del repartidor como el tramo a B
              try {
                const allBounds = L.latLngBounds([
                  [latDriver, lngDriver],
                  [latA, lngA],
                  [latB, lngB]
                ]);
                mapInstanceRef.current.fitBounds(allBounds, { padding: [60, 60], maxZoom: 16 });
              } catch {}
            }
          }
        } else {
          // FASE 2 (RECOGIDO): Limpiar ruta Repartidor -> A y trazar directa Repartidor -> B
          if ((mapInstanceRef.current as any).polyDriverA) {
            mapInstanceRef.current.removeLayer((mapInstanceRef.current as any).polyDriverA);
          }

          const resDriverB = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lngDriver},${latDriver};${lngB},${latB}?overview=full&geometries=geojson`
          );
          if (resDriverB.ok && !isCancelled) {
            const dataDriverB = await resDriverB.json();
            if (dataDriverB.routes && dataDriverB.routes.length > 0) {
              const rDB = dataDriverB.routes[0];
              const distDB = (rDB.distance / 1000).toFixed(1);
              const timeDB = Math.ceil(rDB.duration / 60);

              setRouteDriverB({
                distanceKm: `${distDB} km`,
                durationMin: `${timeDB} min`,
                numDist: Number(distDB),
                numTime: timeDB
              });

              const coordsDB = rDB.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
              if ((mapInstanceRef.current as any).polyDriverB) {
                mapInstanceRef.current.removeLayer((mapInstanceRef.current as any).polyDriverB);
              }
              const polyDriverB = L.polyline(coordsDB, {
                color: '#10b981', // Verde esmeralda directo
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(mapInstanceRef.current);
              (mapInstanceRef.current as any).polyDriverB = polyDriverB;

              const badgeB = document.getElementById('badge-b-text');
              if (badgeB) badgeB.innerText = `Repartidor ➔ B: ${timeDB} min • ${distDB} km`;

              const badgeA = document.getElementById('badge-a-text');
              if (badgeA) badgeA.innerText = '✓ Recogido';

              try {
                mapInstanceRef.current.fitBounds(polyDriverB.getBounds(), { padding: [60, 60], maxZoom: 16 });
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('Error en cálculo de rutas viales OSRM:', err);
      }
    }

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapDivRef.current, {
          zoomControl: true,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        // OpenStreetMap GRATUITO
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const badgeAColor = isPickedUp ? '#10b981' : (isRetiro ? '#8b5cf6' : '#2563eb');
        const badgeBColor = '#10b981';

        const iconA = L.divIcon({
          className: 'custom-pin-a',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
              <div id="badge-a-text" style="background:${badgeAColor}; color:white; font-size:10px; font-weight:900; padding:2px 8px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:2px solid white; white-space:nowrap; margin-bottom:4px;">
                ${isPickedUp ? '✓ Recogido' : (isRetiro ? '🧺 A: Cliente' : '🏢 A: Local')}
              </div>
              <div style="background:${badgeAColor}; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; border:3px solid white; box-shadow:0 6px 16px rgba(0,0,0,0.3);">
                ${isPickedUp ? '✓' : 'A'}
              </div>
            </div>
          `,
          iconSize: [140, 65],
          iconAnchor: [70, 63],
        });

        const iconB = L.divIcon({
          className: 'custom-pin-b',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
              <div id="badge-b-text" style="background:${badgeBColor}; color:white; font-size:10px; font-weight:900; padding:2px 8px; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:2px solid white; white-space:nowrap; margin-bottom:4px;">
                ${isRetiro ? '🏢 B: Taller Matriz' : '📍 B: Cliente'}
              </div>
              <div style="background:${badgeBColor}; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; border:3px solid white; box-shadow:0 6px 16px rgba(0,0,0,0.3);">
                B
              </div>
            </div>
          `,
          iconSize: [140, 65],
          iconAnchor: [70, 63],
        });

        markerARef.current = L.marker([latA, lngA], { icon: iconA }).addTo(map);
        markerBRef.current = L.marker([latB, lngB], { icon: iconB }).addTo(map);

        const latDriver = driverRealCoords?.lat ?? (isPickedUp ? (latB - 0.005) : (latA + 0.005));
        const lngDriver = driverRealCoords?.lng ?? (isPickedUp ? (lngB - 0.005) : (lngA - 0.005));

        const iconDriver = L.divIcon({
          className: 'custom-pin-driver',
          html: `
            <div style="background:#3b82f6; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; border:3px solid white; box-shadow:0 0 18px rgba(59,130,246,0.95);">
              🛵
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        driverMarkerRef.current = L.marker([latDriver, lngDriver], { icon: iconDriver }).addTo(map);

        const bounds = L.latLngBounds([[latDriver, lngDriver], [latA, lngA], [latB, lngB]]);
        map.fitBounds(bounds, { padding: [60, 60] });

        calculateRealRoute();
      } catch (e) {
        console.error('Error inicializando Leaflet map:', e);
      }
    } else {
      calculateRealRoute();
    }

    return () => { isCancelled = true; };
  }, [mapLoaded, latA, lngA, latB, lngB, driverRealCoords, isRetiro, isPickedUp]);

  const paymentState = (order.paymentStatus || (order as any).payment?.estado || extra?.paymentStatus || '').toUpperCase();
  const paymentMethod = ((order as any).metodoPago || (order as any).payment?.metodo || extra?.metodoPago || '').toUpperCase();

  const isOrderPaid = ['CONFIRMADO', 'PAGO_VERIFICADO', 'VERIFICADO', 'PAID'].includes(paymentState) ||
                      (['TRANSFERENCIA', 'TARJETA', 'STRIPE', 'PAYPHONE', 'DATAFAT', 'TRANSFER', 'ONLINE'].includes(paymentMethod) && paymentState !== 'PENDIENTE');

  const isCashOnDelivery = !isOrderPaid;
  const totalVal = Number(order.total || 0).toFixed(2);

  // Cálculos totales de ruta
  const totalEstTime = (routeDriverA?.numTime || 0) + (routeAB?.numTime || 0);
  const totalEstDist = ((routeDriverA?.numDist || 0) + (routeAB?.numDist || 0)).toFixed(1);

  // Color del negocio para la cabecera (azul Citiox si no tiene o es muy claro)
  const bizColor = (() => {
    const c = (order.negocio as any)?.colorPrimario;
    if (!c || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return '#0066FF';
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x: string) => x + x).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62 ? '#0066FF' : `#${h}`;
  })();

  const pointA = isRetiro
    ? { label: 'Retiras donde el cliente', name: order.nombreCliente, addr: order.direccionCliente || '', ref: order.referenciaCliente }
    : { label: 'Retiras en el local', name: nombreLocal, addr: direccionLocal, ref: '' };
  const pointB = isRetiro
    ? { label: 'Entregas en el taller', name: nombreLocal, addr: direccionLocal, ref: '' }
    : { label: 'Entregas al cliente', name: order.nombreCliente, addr: order.direccionCliente || '', ref: order.referenciaCliente };

  const collect = !isLaundry && driverComp?.puedeCobrarCliente && driverComp.montoRecaudarCliente > 0;

  return (
    <div className="fixed inset-0 z-[200] bg-[#F7F8FB] text-slate-900 flex flex-col h-[100dvh] overflow-hidden">
      {/* Cabecera */}
      <div className="text-white px-4 py-3 flex items-center gap-3 shrink-0" style={{ background: bizColor }}>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/80 truncate">{order.negocio?.nombre || 'Negocio'}</p>
          <p className="font-bold leading-tight">Pedido #{order.codigo || order.id.slice(-6).toUpperCase()}</p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20">
          {isAlreadyAssigned ? (isPickedUp ? 'Hacia la entrega' : 'Hacia el retiro') : 'Disponible'}
        </span>
      </div>

      {/* Mapa */}
      <div className="w-full h-[38vh] bg-slate-200 relative shrink-0">
        <div ref={mapDivRef} className="w-full h-full" />
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500 z-20">
            <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 border-t-[#0066FF] animate-spin" />
            <span className="text-xs">Cargando mapa…</span>
          </div>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-3 right-3 z-20 bg-white text-slate-900 px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5 text-sm font-semibold"
        >
          <Navigation className="w-4 h-4" style={{ color: bizColor }} />
          Abrir en Google Maps
        </a>
        {gpsStatus === 'DENEGADO' && (
          <span className="absolute top-3 left-3 z-20 bg-white/95 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow">
            Activa tu ubicación para ver tu ruta
          </span>
        )}
      </div>

      {/* Detalle */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40 space-y-3">
        {/* Ruta */}
        <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-900 text-sm">Recorrido</p>
            {totalEstTime > 0 && !isPickedUp ? (
              <span className="text-xs font-semibold text-slate-600">~{totalEstTime} min · {totalEstDist} km</span>
            ) : isPickedUp && routeDriverB ? (
              <span className="text-xs font-semibold text-slate-600">{routeDriverB.durationMin} · {routeDriverB.distanceKm}</span>
            ) : (
              <span className="text-xs text-slate-400">Calculando…</span>
            )}
          </div>
          <div className="relative pl-6 space-y-4">
            <span className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
            {[{ p: pointA, done: isPickedUp, key: 'A', eta: routeDriverA }, { p: pointB, done: false, key: 'B', eta: isPickedUp ? routeDriverB : routeAB }].map(({ p, done, key, eta }) => (
              <div key={key} className="relative">
                <span
                  className="absolute -left-6 top-0.5 w-[19px] h-[19px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: done ? '#10b981' : key === 'A' ? bizColor : '#0f172a' }}
                >
                  {done ? <Check className="w-3 h-3" /> : key}
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400">{p.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                    {p.addr && <p className="text-xs text-slate-500">{p.addr}</p>}
                    {p.ref && <p className="text-[11px] text-slate-400 mt-0.5">Ref: {p.ref}</p>}
                  </div>
                  {done ? (
                    <span className="text-[11px] font-semibold text-emerald-600 shrink-0">Hecho</span>
                  ) : eta ? (
                    <span className="text-[11px] font-semibold text-slate-500 shrink-0">{eta.durationMin}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Horario del retiro: si es para más tarde, aceptar lo deja agendado */}
        {isRetiro && (() => {
          const v = ventanaRetiro(extra, (order as any).createdAt);
          if (!v.fecha) return null;
          const luego = esParaMasTarde(v);
          return (
            <section className={`rounded-2xl p-4 flex gap-3 ${luego ? 'bg-sky-50 ring-1 ring-sky-200' : 'bg-white ring-1 ring-slate-100'}`}>
              <Clock className={`w-5 h-5 shrink-0 ${luego ? 'text-sky-600' : 'text-slate-400'}`} />
              <div className="min-w-0">
                <p className={`text-xs ${luego ? 'text-sky-800' : 'text-slate-500'}`}>Retiro</p>
                <p className="font-semibold text-slate-900">{textoVentana(v)}</p>
                {luego && !isAlreadyAssigned && <p className="text-xs text-sky-800 mt-0.5">Si lo aceptas queda agendado: puedes seguir tomando pedidos hasta esa hora.</p>}
              </div>
            </section>
          );
        })()}

        {/* Dinero */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
            <p className="text-xs text-slate-500">Ganas</p>
            <p className="text-2xl font-bold text-emerald-600">${activeMissionEarning}</p>
          </div>
          <div className={`rounded-2xl p-4 ${collect ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white ring-1 ring-slate-100'}`}>
            <p className={`text-xs ${collect ? 'text-amber-800' : 'text-slate-500'}`}>{collect ? 'Cobras en efectivo' : 'Cobro al cliente'}</p>
            <p className={`text-2xl font-bold ${collect ? 'text-amber-900' : 'text-slate-900'}`}>
              {collect ? `$${driverComp.montoRecaudarCliente.toFixed(2)}` : '$0.00'}
            </p>
            {!collect && <p className="text-[11px] text-slate-500">{isLaundry ? 'Sin cobro' : 'Ya pagado'}</p>}
          </div>
        </section>

        {/* Artículos */}
        <section className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex gap-3">
          <PackageCheck className="w-5 h-5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{isRetiro ? 'Prendas a retirar' : 'Pedido'}</p>
            <p className="text-sm text-slate-800">{itemsSummary || 'Sin detalle'}</p>
          </div>
        </section>
      </div>

      {/* Acciones: aquí solo se acepta; los pasos de la entrega se hacen en la pantalla de la misión */}
      <div className="fixed bottom-0 inset-x-0 z-[300] bg-white border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto space-y-2">
          {!isAlreadyAssigned && (
            <button
              onClick={() => onAccept(order.id)}
              disabled={actionLoading || hasActiveOrder}
              className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: bizColor }}
            >
              <CheckCircle className="w-5 h-5" />
              {hasActiveOrder ? 'Termina tu entrega actual para aceptar otra' : `Aceptar ${isRetiro ? 'retiro' : 'pedido'} · gana $${activeMissionEarning}`}
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm">
            {isAlreadyAssigned ? 'Volver a la entrega' : 'Volver a la lista'}
          </button>
        </div>
      </div>
    </div>
  );
}
