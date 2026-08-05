'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ShieldCheck, CheckCircle2, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { isPointInPolygon } from '@/lib/geoUtils';

interface CoverageMapPublicProps {
  negocioId?: string;
  onCheckLocation?: () => void;
}

export default function CoverageMapPublic({ negocioId, onCheckLocation }: CoverageMapPublicProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [cobertura, setCobertura] = useState<{
    activa: boolean;
    mensaje: string;
    poligono: Array<[number, number]>;
  }>({
    activa: true,
    mensaje: 'Retiramos y entregamos tus zapatos dentro de nuestra zona de cobertura.',
    poligono: [
      [-0.170, -78.485],
      [-0.150, -78.470],
      [-0.160, -78.440],
      [-0.200, -78.450],
      [-0.220, -78.480],
      [-0.190, -78.500]
    ]
  });

  const [userResult, setUserResult] = useState<{
    checked: boolean;
    isInside: boolean;
    addressName?: string;
  } | null>(null);

  const [verifying, setVerifying] = useState<boolean>(false);

  // 1. Cargar la cobertura oficial del negocio
  useEffect(() => {
    const fetchCoverage = async () => {
      try {
        const url = negocioId ? `/api/shoe-care/coverage?negocioId=${negocioId}` : '/api/shoe-care/coverage';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCobertura(data);
        }
      } catch (err) {
        console.error('Error loading public coverage:', err);
      }
    };

    fetchCoverage();
  }, [negocioId]);

  // 2. Inicializar Mapa con Leaflet
  useEffect(() => {
    if (!mapDivRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapDivRef.current) return;

      if (!mapInstanceRef.current) {
        const center = cobertura.poligono.length > 0 ? cobertura.poligono[0] : [-0.180653, -78.467838];
        const map = L.map(mapDivRef.current, {
          center: center,
          zoom: 12,
          zoomControl: false,
          dragging: true,
          scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (cobertura.poligono.length > 0) {
        const polyLayer = L.polygon(cobertura.poligono, {
          color: '#7C3AED',
          fillColor: '#8B5CF6',
          fillOpacity: 0.3,
          weight: 3
        }).addTo(map);

        try {
          const bounds = polyLayer.getBounds();
          if (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch (e) {
          console.warn('Leaflet fitBounds skipped:', e);
        }
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.body.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [cobertura]);

  const handleVerifyMyGPS = () => {
    if (onCheckLocation) {
      onCheckLocation();
      return;
    }

    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador.');
      return;
    }

    setVerifying(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVerifying(false);
        const userPoint: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const inside = isPointInPolygon(userPoint, cobertura.poligono);

        setUserResult({
          checked: true,
          isInside: inside
        });

        if (mapInstanceRef.current && (window as any).L) {
          const L = (window as any).L;
          L.marker(userPoint).addTo(mapInstanceRef.current)
            .bindPopup(inside ? '📍 ¡Estás dentro de la cobertura!' : '📍 Estás fuera de la zona habitual').openPopup();
          mapInstanceRef.current.setView(userPoint, 14);
        }
      },
      () => {
        setVerifying(false);
        alert('No se pudo obtener tu ubicación de GPS. Por favor permite el acceso.');
      }
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-black rounded-full uppercase tracking-wider">
            Zona de Servicio
          </span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Nuestra Cobertura</h3>
        <p className="text-slate-600 font-medium text-sm mt-1">{cobertura.mensaje}</p>
      </div>

      {/* Mapa Interactivo con Polígono — aislado con isolate z-0 para evitar superposición con modales */}
      <div className="relative w-full h-[280px] sm:h-[340px] rounded-3xl overflow-hidden border-2 border-slate-100 shadow-inner bg-purple-50 isolate z-0">
        <div ref={mapDivRef} className="w-full h-full relative z-0" style={{ zIndex: 0 }} />

        {/* Badge Flotante sobre el Mapa */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-purple-600/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-black shadow-lg border border-white/20 flex items-center gap-2 pointer-events-none">
          <MapPin size={14} className="text-purple-200" />
          <span>📍 Cobertura Activa en el Perímetro Ilustrado</span>
        </div>
      </div>

      {/* Resultado de Verificación */}
      {userResult && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 animate-in fade-in duration-300 ${
          userResult.isInside
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {userResult.isInside ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-black text-sm">
              {userResult.isInside
                ? '¡Genial! Tu ubicación está dentro de nuestra cobertura'
                : 'Ubicación fuera del perímetro habitual'}
            </p>
            <p className="mt-0.5 opacity-90">
              {userResult.isInside
                ? 'Puedes solicitar retiro y entrega a domicilio sin costo adicional de zona.'
                : 'Te ofrecemos envío express personalizado. Escríbenos por WhatsApp para coordinar.'}
            </p>
          </div>
        </div>
      )}

      {/* Botón de Acción */}
      <button
        onClick={handleVerifyMyGPS}
        disabled={verifying}
        className="w-full py-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Search size={18} />
        {verifying ? 'Verificando tu ubicación GPS...' : 'Consultar cobertura con mi ubicación'}
      </button>
    </div>
  );
}
