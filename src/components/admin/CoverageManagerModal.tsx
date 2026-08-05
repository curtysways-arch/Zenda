'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Check, RefreshCw, Trash2, ShieldCheck, AlertTriangle, Layers, Save, Plus } from 'lucide-react';
import { generateDefaultCoveragePolygon } from '@/lib/geoUtils';

interface CoverageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  negocioId?: string;
}

export default function CoverageManagerModal({
  isOpen,
  onClose,
  negocioId
}: CoverageManagerModalProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [poligono, setPoligono] = useState<Array<[number, number]>>([]);
  const [activa, setActiva] = useState<boolean>(true);
  const [mensaje, setMensaje] = useState<string>('Cobertura activa dentro del perímetro configurado.');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const businessLat = -0.180653;
  const businessLng = -78.467838;

  // 1. Cargar la configuración actual desde el API
  useEffect(() => {
    if (!isOpen) return;

    const fetchCoverage = async () => {
      setLoading(true);
      try {
        const url = negocioId ? `/api/shoe-care/coverage?negocioId=${negocioId}` : '/api/shoe-care/coverage';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setActiva(data.activa ?? true);
          setMensaje(data.mensaje || 'Cobertura activa en toda la ciudad.');
          if (Array.isArray(data.poligono) && data.poligono.length > 0) {
            setPoligono(data.poligono);
          } else {
            // Polígono por defecto
            setPoligono(generateDefaultCoveragePolygon(businessLat, businessLng, 5));
          }
        }
      } catch (err) {
        console.error('Error fetching coverage config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoverage();
  }, [isOpen, negocioId]);

  // 2. Inicializar Mapa Leaflet
  useEffect(() => {
    if (!isOpen || loading || !mapDivRef.current) return;

    // Cargar Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Cargar Leaflet JS
    const loadLeaflet = () => {
      const L = (window as any).L;
      if (!L) return;

      if (!mapInstanceRef.current && mapDivRef.current) {
        const center = poligono.length > 0 ? poligono[0] : [businessLat, businessLng];
        const map = L.map(mapDivRef.current, {
          center: center,
          zoom: 13,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19
        }).addTo(map);

        // Click en el mapa para añadir vértices
        map.on('click', (e: any) => {
          const newPoint: [number, number] = [Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))];
          setPoligono((prev) => [...prev, newPoint]);
        });

        mapInstanceRef.current = map;
      }
    };

    if ((window as any).L) {
      loadLeaflet();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = loadLeaflet;
      document.body.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, loading]);

  // 3. Renderizar o actualizar polígono y marcadores cuando cambia `poligono`
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Limpiar capa de polígono anterior
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    // Limpiar marcadores anteriores
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (poligono.length > 0) {
      // Dibujar Polígono
      const polyLayer = L.polygon(poligono, {
        color: '#7C3AED',
        fillColor: '#8B5CF6',
        fillOpacity: 0.35,
        weight: 3,
        dashArray: '6, 6'
      }).addTo(map);

      polygonLayerRef.current = polyLayer;

      // Dibujar puntos/marcadores de vértice manejables
      poligono.forEach((pt, index) => {
        const marker = L.circleMarker(pt, {
          radius: 7,
          color: '#ffffff',
          fillColor: '#6D28D9',
          fillOpacity: 1,
          weight: 2
        }).addTo(map);

        marker.bindTooltip(`Vértice ${index + 1} (Clic para eliminar)`, { direction: 'top' });

        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          setPoligono((prev) => prev.filter((_, i) => i !== index));
        });

        markersRef.current.push(marker);
      });
    }
  }, [poligono]);

  const handleGenerateDefault = () => {
    const defaultPoly = generateDefaultCoveragePolygon(businessLat, businessLng, 5);
    setPoligono(defaultPoly);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([businessLat, businessLng], 13);
    }
  };

  const handleClear = () => {
    setPoligono([]);
  };

  const handleSave = async () => {
    setSaving(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/shoe-care/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          activa,
          mensaje,
          poligono
        })
      });

      if (res.ok) {
        setToastMessage({ type: 'success', text: '✅ Polígono y zona de cobertura guardados exitosamente.' });
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setToastMessage({ type: 'error', text: '❌ Error al guardar la cobertura.' });
      }
    } catch (err) {
      console.error(err);
      setToastMessage({ type: 'error', text: '❌ Error de conexión al servidor.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Gestión de Cobertura (Polígono GPS)</h2>
              <p className="text-xs text-slate-400 font-medium">Haz clic en el mapa para definir o ajustar el perímetro de retiro a domicilio.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast Notificación */}
        {toastMessage && (
          <div className={`px-6 py-3 text-xs font-black text-white ${toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {toastMessage.text}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200/80">
            {/* Activo / Inactivo */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Estado del Servicio</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiva(true)}
                  className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all ${
                    activa ? 'bg-purple-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  🟢 Cobertura Activa
                </button>
                <button
                  type="button"
                  onClick={() => setActiva(false)}
                  className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all ${
                    !activa ? 'bg-rose-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  🔴 Pausada
                </button>
              </div>
            </div>

            {/* Mensaje Informativo */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Mensaje de Cobertura</label>
              <input
                type="text"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Ej: Cobertura activa en el perímetro urbano de la ciudad."
                className="w-full text-xs font-bold p-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Quick Actions for Polygon */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <MapPin size={14} className="text-purple-600" />
              Puntos definidos: <span className="font-black text-purple-700">{poligono.length} vértices</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateDefault}
                className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-xl border border-purple-200 transition-all flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                Zona 5km Automática
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Limpiar Polígono
              </button>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="relative w-full h-[360px] rounded-3xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-100">
            {loading && (
              <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-500 font-bold text-sm">
                Cargando mapa interactivo...
              </div>
            )}
            <div ref={mapDivRef} className="w-full h-full" />
            <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-slate-700 border border-slate-200 shadow-sm pointer-events-none">
              💡 Haz clic en el mapa para agregar puntos
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar Cobertura'}
          </button>
        </div>
      </div>
    </div>
  );
}
