'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Store, Building2, MapPin, ExternalLink, CheckCircle, X, Navigation,
  PackageCheck, Clock, ArrowRight, ShieldAlert
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
  const [mapLoaded, setMapLoaded] = useState(false);

  // Extraer información
  const parseExtraInfo = (extra: any) => {
    if (!extra) return {};
    if (typeof extra === 'string') {
      try { return JSON.parse(extra); } catch { return {}; }
    }
    return extra;
  };

  const extra = parseExtraInfo(order.extraInfo);
  const deliveryFee = Number(order.costoEnvio || 2.50).toFixed(2);
  const itemsSummary = (order.items || []).map(i => `${i.cantidad}x ${i.nombreProducto}`).join(', ');

  // Coordenadas Punto A (Restaurante)
  const cfg = order.negocio?.configuracion || {};
  const latA = Number(order.negocio?.latitud || cfg.latitudNegocio || -0.180653);
  const lngA = Number(order.negocio?.longitud || cfg.longitudNegocio || -78.467838);

  // Coordenadas Punto B (Cliente)
  const latB = Number(order.latitud || extra.latitudCliente || (latA - 0.015));
  const lngB = Number(order.longitud || extra.longitudCliente || (lngA - 0.012));

  // Cargar Leaflet y montar mapa
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
          zoomControl: false,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        // Tile layer voyager (Estilo limpio moderno)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        // Marker A (Restaurante Recogida - Azul)
        const iconA = L.divIcon({
          className: 'custom-pin-a',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
              <div style="background:#2563eb; color:white; font-size:12px; font-weight:900; padding:4px 10px; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,0.3); border:2px solid white; white-space:nowrap; margin-bottom:4px;">
                3 min • ~1.2 km
              </div>
              <div style="background:#2563eb; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:16px; border:3px solid white; box-shadow:0 8px 20px rgba(37,99,235,0.5);">
                A
              </div>
            </div>
          `,
          iconSize: [120, 70],
          iconAnchor: [60, 68],
        });

        // Marker B (Cliente Entrega - Verde)
        const iconB = L.divIcon({
          className: 'custom-pin-b',
          html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
              <div style="background:#10b981; color:white; font-size:12px; font-weight:900; padding:4px 10px; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,0.3); border:2px solid white; white-space:nowrap; margin-bottom:4px;">
                9 min • 2.4 km
              </div>
              <div style="background:#10b981; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:16px; border:3px solid white; box-shadow:0 8px 20px rgba(16,185,129,0.5);">
                B
              </div>
            </div>
          `,
          iconSize: [120, 70],
          iconAnchor: [60, 68],
        });

        // Driver Marker (Ubicación Repartidor - Moto)
        const latDriver = latA + 0.005;
        const lngDriver = lngA - 0.004;

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

        L.marker([latDriver, lngDriver], { icon: iconDriver }).addTo(map);
        L.marker([latA, lngA], { icon: iconA }).addTo(map);
        L.marker([latB, lngB], { icon: iconB }).addTo(map);

        // Dibujar líneas de ruta
        // Ruta 1: Repartidor -> Punto A (Línea Azul)
        L.polyline([[latDriver, lngDriver], [latA, lngA]], {
          color: '#2563eb',
          weight: 5,
          opacity: 0.8,
          dashArray: '6, 8',
        }).addTo(map);

        // Ruta 2: Punto A -> Punto B (Línea Verde)
        L.polyline([[latA, lngA], [latB, lngB]], {
          color: '#10b981',
          weight: 6,
          opacity: 0.9,
        }).addTo(map);

        // Ajustar zoom para ver toda la ruta
        const bounds = L.latLngBounds([[latDriver, lngDriver], [latA, lngA], [latB, lngB]]);
        map.fitBounds(bounds, { padding: [60, 60] });

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

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
      
      {/* 1. MAPA A PANTALLA COMPLETA */}
      <div className="absolute inset-0 z-0">
        <div ref={mapDivRef} className="w-full h-full bg-slate-900" />
        
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-slate-300 gap-3 z-10">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando mapa de ruta GPS...</span>
          </div>
        )}
      </div>

      {/* 2. HEADER FLOTANTE SUPERIOR */}
      <div className="relative z-10 p-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-3 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              {order.negocio?.nombre || 'La Parrilla Citiox'}
            </span>
            <h2 className="text-sm font-black text-white leading-tight">
              Pedido #{order.codigo || order.id.slice(-6).toUpperCase()}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="pointer-events-auto w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 3. PANEL INFERIOR CON DETALLES Y BOTÓN FIJO */}
      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col max-h-[65vh]">
        
        {/* Tarjeta Deslizable de Información */}
        <div className="bg-slate-900/95 backdrop-blur-2xl border-t border-x border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-3 overflow-y-auto custom-scrollbar text-left">
          
          {/* Banner Ganancia */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-500/20">
            <span className="text-xs font-black uppercase tracking-wider">TU GANANCIA DE ENVÍO:</span>
            <span className="text-lg font-black tracking-tight">+${deliveryFee}</span>
          </div>

          {/* Tarjeta Punto 1: Recogida en Local */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-[10px]">A</span>
                1. RECOGIDA EN LOCAL (RESTAURANTE):
              </span>
              {order.negocio?.direccion && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.negocio.direccion)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-[10px] font-extrabold flex items-center gap-1 transition-all"
                >
                  <span>GPS Local</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="font-extrabold text-slate-100 text-xs pl-6">
              {order.negocio?.direccion || 'Av. Principal 123, Quito'}
            </p>
          </div>

          {/* Tarjeta Punto 2: Entrega a Cliente */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center text-[10px]">B</span>
                2. ENTREGA A DESTINO (CLIENTE):
              </span>
              {order.direccionCliente && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccionCliente)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1 transition-all"
                >
                  <span>GPS Cliente</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="font-extrabold text-slate-100 text-xs pl-6">
              {order.direccionCliente || 'Sin dirección de entrega registrada'}
            </p>
            {order.referenciaCliente && (
              <p className="text-[10px] text-slate-400 font-medium pl-6">Ref: {order.referenciaCliente}</p>
            )}
          </div>

          {/* Desglose de Distancias */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block">Distancia a Recoger:</span>
              <span className="font-black text-amber-300 text-sm">📍 ~1.2 km</span>
            </div>
            <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800 text-center space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block">Distancia a Entregar:</span>
              <span className="font-black text-emerald-400 text-sm">🏁 2.4 km</span>
            </div>
          </div>

          {/* Detalle de Productos en Paquete */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-1 shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              DETALLE DE PRODUCTOS EN PAQUETE:
            </span>
            <p className="font-bold text-slate-200 text-xs leading-relaxed">
              {itemsSummary || 'Sin productos registrados'}
            </p>
          </div>
        </div>

        {/* 4. BARRA DE ACCIÓN FIJA INFERIOR (STICKY FOOTER) */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 sm:p-5 space-y-2.5 z-50 shadow-2xl">
          <button
            onClick={() => onAccept(order.id)}
            disabled={actionLoading || hasActiveOrder}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
          >
            VOLVER A LA BOLSA
          </button>
        </div>
      </div>

    </div>
  );
}
