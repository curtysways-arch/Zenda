'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Check, RefreshCw, Search, Navigation } from 'lucide-react';

interface MapSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLat?: number | null;
    initialLng?: number | null;
    businessLat?: number;
    businessLng?: number;
    initialReference?: string;
    onConfirmLocation: (lat: number, lng: number, addressName?: string, reference?: string) => void;
}

export default function MapSelectionModal({
    isOpen,
    onClose,
    initialLat,
    initialLng,
    businessLat = -0.180653,
    businessLng = -78.467838,
    initialReference = '',
    onConfirmLocation
}: MapSelectionModalProps) {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    // Guardar coordenadas iniciales en ref para evitar re-renderizados innecesarios
    const initLatRef = useRef<number>(initialLat || businessLat);
    const initLngRef = useRef<number>(initialLng || businessLng);

    const [currentLat, setCurrentLat] = useState<number>(initLatRef.current);
    const [currentLng, setCurrentLng] = useState<number>(initLngRef.current);
    const [resolvedAddress, setResolvedAddress] = useState<string>('');
    const [reference, setReference] = useState<string>(initialReference || '');
    const [refError, setRefError] = useState<boolean>(false);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [mapLoading, setMapLoading] = useState<boolean>(true);

    // Reverse Geocoding automático al desplazar el mapa
    useEffect(() => {
        if (!isOpen || !currentLat || !currentLng) return;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.display_name) {
                        const parts = data.display_name.split(',');
                        const shortName = parts.slice(0, 3).join(',').trim();
                        setResolvedAddress(shortName || data.display_name);
                    }
                }
            } catch (e) {
                console.warn('Error reverse geocoding:', e);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [isOpen, currentLat, currentLng]);

    // Actualizar refs y auto-obtener GPS al abrir el modal
    useEffect(() => {
        if (isOpen) {
            const startLat = initialLat || businessLat;
            const startLng = initialLng || businessLng;
            initLatRef.current = startLat;
            initLngRef.current = startLng;
            setCurrentLat(startLat);
            setCurrentLng(startLng);
            setReference(initialReference || '');
            setRefError(false);
            setSearchQuery('');

            // Auto-detectar GPS si no había ubicación guardada previa
            if (!initialLat && typeof window !== 'undefined' && navigator.geolocation) {
                setIsLocating(true);
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setIsLocating(false);
                        const uLat = pos.coords.latitude;
                        const uLng = pos.coords.longitude;
                        setCurrentLat(uLat);
                        setCurrentLng(uLng);
                        initLatRef.current = uLat;
                        initLngRef.current = uLng;
                        if (mapInstanceRef.current) {
                            mapInstanceRef.current.setView([uLat, uLng], 16);
                        }
                    },
                    () => { setIsLocating(false); },
                    { timeout: 6000, maximumAge: 30000 }
                );
            }
        }
    }, [isOpen, initialLat, initialLng, businessLat, businessLng, initialReference]);

    // Inicializar el mapa interactivo en pantalla completa
    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        setMapLoading(true);

        const initMap = () => {
            if (isCancelled || !mapDivRef.current) return;

            const L = (window as any).L;
            if (!L) {
                if (!document.getElementById('leaflet-css-v2')) {
                    const link = document.createElement('link');
                    link.id = 'leaflet-css-v2';
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }
                if (!document.getElementById('leaflet-js-v2')) {
                    const script = document.createElement('script');
                    script.id = 'leaflet-js-v2';
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.async = true;
                    script.onload = () => { if (!isCancelled) initMap(); };
                    script.onerror = () => { if (!isCancelled) setMapLoading(false); };
                    document.head.appendChild(script);
                } else {
                    setTimeout(() => { if (!isCancelled) initMap(); }, 200);
                }
                return;
            }

            if (mapInstanceRef.current || (mapDivRef.current as any)._leaflet_id) {
                try { mapInstanceRef.current?.remove(); } catch (e) {}
                mapInstanceRef.current = null;
            }

            try {
                const sLat = initLatRef.current;
                const sLng = initLngRef.current;

                const map = L.map(mapDivRef.current, {
                    zoomControl: true,
                    attributionControl: false
                }).setView([sLat, sLng], 16);

                mapInstanceRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                setMapLoading(false);

                map.on('moveend', () => {
                    if (isCancelled) return;
                    const center = map.getCenter();
                    setCurrentLat(center.lat);
                    setCurrentLng(center.lng);
                });

                [100, 300, 600].forEach(delay => {
                    setTimeout(() => {
                        if (!isCancelled && mapInstanceRef.current) {
                            mapInstanceRef.current.invalidateSize();
                        }
                    }, delay);
                });

            } catch (err) {
                console.error("Error al inicializar mapa interactivo:", err);
                setMapLoading(false);
            }
        };

        const timer = setTimeout(initMap, 60);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (e) {}
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUseGPS = () => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización GPS.");
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setIsLocating(false);
                const uLat = pos.coords.latitude;
                const uLng = pos.coords.longitude;
                setCurrentLat(uLat);
                setCurrentLng(uLng);

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([uLat, uLng], 16);
                }
            },
            (err) => {
                setIsLocating(false);
                alert("No se pudo obtener la ubicación automática.");
            },
            { timeout: 8000, maximumAge: 30000 }
        );
    };

    const handleSearchAddress = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const newLat = parseFloat(data[0].lat);
                    const newLng = parseFloat(data[0].lon);
                    if (!isNaN(newLat) && !isNaN(newLng)) {
                        setCurrentLat(newLat);
                        setCurrentLng(newLng);
                        if (mapInstanceRef.current) {
                            mapInstanceRef.current.setView([newLat, newLng], 16);
                        }
                    }
                } else {
                    alert("No se encontraron resultados para esa dirección.");
                }
            }
        } catch (err) {
            console.error("Error al buscar dirección:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirm = () => {
        if (!reference || !reference.trim()) {
            setRefError(true);
            return;
        }
        setRefError(false);
        onConfirmLocation(currentLat, currentLng, resolvedAddress, reference.trim());
        onClose();
    };

    return (
      <div className="fixed inset-0 z-[100000] bg-white flex flex-col w-full h-full animate-in fade-in duration-200">
        {/* Cabecera Principal */}
        <div className="px-4 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 text-emerald-600">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Fijar Ubicación de Entrega</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mueve el mapa para ubicar la puerta de tu casa</p>
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

        {/* Buscador de Dirección */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <form onSubmit={handleSearchAddress} className="flex gap-2 max-w-4xl mx-auto w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar calle, avenida, barrio o sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl pl-10 pr-3 py-2.5 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-xs"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Buscar"}
            </button>
          </form>
        </div>

        {/* MAPA GRANDE PANTALLA COMPLETA (Flex-1) */}
        <div className="relative w-full flex-1 min-h-[280px] bg-slate-100 overflow-hidden">
          {mapLoading && (
            <div className="absolute inset-0 z-20 bg-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Cargando mapa interactivo...</span>
            </div>
          )}

          {/* Div Contenedor del Mapa */}
          <div ref={mapDivRef} className="w-full h-full z-10" />

          {/* Pin de Mapa Fijo en el Centro Exacto (Estilo Uber/Rappi) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex flex-col items-center drop-shadow-lg pb-1">
            <div className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full mb-1 border border-slate-700 shadow-md">
              Punto de Entrega
            </div>
            <MapPin className="w-10 h-10 text-emerald-600 fill-emerald-600 stroke-white stroke-2" />
          </div>

          {/* Botón Flotante GPS */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isLocating}
            className="absolute bottom-4 right-4 z-20 bg-white text-slate-900 text-xs font-black px-4 py-2.5 rounded-xl border border-slate-200 shadow-xl flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            {isLocating ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <Navigation className="w-4 h-4 text-emerald-600" />}
            <span>Usar mi GPS</span>
          </button>
        </div>

        {/* Panel Inferior: Dirección Resuelta + Campo de Referencia OBLIGATORIO + Botones */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3 max-w-4xl mx-auto w-full shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
          {/* Dirección Detectada */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Dirección detectada</span>
              <span className="font-extrabold text-slate-900 truncate block text-xs">
                {resolvedAddress ? `📍 ${resolvedAddress}` : 'Mueve el mapa para fijar la dirección...'}
              </span>
            </div>
            <span className="font-mono text-slate-400 text-[10px] shrink-0 font-bold bg-white px-2 py-1 rounded-lg border border-slate-200">
              {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
            </span>
          </div>

          {/* CAMPO DE REFERENCIA OBLIGATORIO */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Referencia de Ubicación <span className="text-rose-500 font-bold">* (Obligatorio)</span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Ej: Casa blanca de 2 pisos, portón negro junto a la farmacia..."
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                if (e.target.value.trim()) setRefError(false);
              }}
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all ${
                refError ? 'border-rose-500 bg-rose-50/50 focus:border-rose-600' : 'border-slate-200 focus:bg-white focus:border-slate-400'
              }`}
            />
            {refError && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1 animate-pulse">
                <span>⚠️ Por favor escribe una referencia de tu entrega para poder confirmar.</span>
              </p>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Confirmar Ubicación
            </button>
          </div>
        </div>
      </div>
    );
}
