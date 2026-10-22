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
    requireReference?: boolean;
    title?: string;
    subtitle?: string;
    pinLabel?: string;
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
    requireReference = true,
    title = 'Fijar Ubicación de Entrega',
    subtitle = 'Mueve el mapa para ubicar la puerta de tu casa',
    pinLabel = 'Punto de Entrega',
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
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

    // Reverse Geocoding automático al desplazar el mapa
    useEffect(() => {
        if (!isOpen || !currentLat || !currentLng) return;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/public/geocode?reverse=1&lat=${currentLat}&lng=${currentLng}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.address) {
                        setResolvedAddress(data.address);
                    }
                }
            } catch (e) {
                console.warn('Error reverse geocoding:', e);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [isOpen, currentLat, currentLng]);

    // Búsqueda predictiva con autocompletado en tiempo real mientras el usuario escribe
    useEffect(() => {
        const query = searchQuery.trim();
        if (!query || query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const bLat = currentLat || businessLat;
                const bLng = currentLng || businessLng;
                const res = await fetch(`/api/public/geocode?q=${encodeURIComponent(query)}&lat=${bLat}&lng=${bLng}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.results)) {
                        setSuggestions(data.results);
                        setShowSuggestions(true);
                    }
                }
            } catch (err) {
                console.warn('Error en búsqueda de direcciones:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, currentLat, currentLng, businessLat, businessLng]);

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

    const handleSelectSuggestion = (item: any) => {
        const newLat = Number(item.lat);
        const newLng = Number(item.lng);
        if (!isNaN(newLat) && !isNaN(newLng)) {
            setCurrentLat(newLat);
            setCurrentLng(newLng);
            const fullLabel = item.secondaryText ? `${item.mainText}, ${item.secondaryText}` : item.mainText;
            setResolvedAddress(fullLabel);
            setSearchQuery(item.mainText);
            setShowSuggestions(false);

            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.flyTo([newLat, newLng], 17, { duration: 0.8 });
                } catch (e) {
                    mapInstanceRef.current.setView([newLat, newLng], 17);
                }
            }
        }
    };

    const handleSearchAddress = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        setIsSearching(true);
        try {
            const bLat = currentLat || businessLat;
            const bLng = currentLng || businessLng;
            const res = await fetch(`/api/public/geocode?q=${encodeURIComponent(query)}&lat=${bLat}&lng=${bLng}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.results) && data.results.length > 0) {
                    setSuggestions(data.results);
                    setShowSuggestions(true);
                    // Si se presionó Buscar explícitamente, centrar en la primera mejor coincidencia
                    handleSelectSuggestion(data.results[0]);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(true);
                }
            }
        } catch (err) {
            console.error("Error al buscar dirección:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirm = () => {
        if (requireReference && (!reference || !reference.trim())) {
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
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{subtitle}</p>
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

        {/* Buscador de Dirección con Sugerencias en Tiempo Real */}
        <div className="relative px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 z-30">
          <form onSubmit={handleSearchAddress} className="flex gap-2 max-w-4xl mx-auto w-full relative">
            <div className="relative flex-1">
              {/* Icono de Lupa con posición fija y sin interferencia de click */}
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                <Search className="w-4 h-4 text-slate-400" />
              </div>

              {/* Input con padding izquierdo explícito para evitar sobremontarse en cualquier navegador */}
              <input
                type="text"
                placeholder="Escribe tu sector, barrio o calle (ej: Carapungo)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                style={{ paddingLeft: '42px', paddingRight: searchQuery ? '36px' : '14px' }}
                className="w-full bg-white rounded-xl py-2.5 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
              />

              {/* Botón para limpiar campo */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* DROPDOWN DE COINCIDENCIAS / SUGERENCIAS */}
              {showSuggestions && (searchQuery.trim().length >= 2 || isSearching) && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSuggestions(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in duration-150">
                    {isSearching ? (
                      <div className="px-4 py-3 flex items-center gap-2 text-xs text-slate-500 font-semibold">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                        <span>Buscando coincidencias para &ldquo;{searchQuery}&rdquo;...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        <div className="px-3.5 py-1.5 bg-slate-50 text-xs font-bold uppercase text-slate-400 tracking-wider">
                          Lugares encontrados ({suggestions.length})
                        </div>
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/70 transition-colors flex items-start gap-3 cursor-pointer group"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 shrink-0 mt-0.5 transition-colors">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                                {item.mainText}
                              </p>
                              {item.secondaryText && (
                                <p className="text-xs text-slate-500 truncate">
                                  {item.secondaryText}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-500 font-medium text-center">
                        No encontramos coincidencias para &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;. Puedes mover el mapa con el dedo o mouse para ubicar tu casa.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
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

          {/* Pin de Mapa Fijo en el Centro Exacto */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex flex-col items-center drop-shadow-lg pb-1">
            <div className="bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-1 border border-slate-700 shadow-md">
              {pinLabel}
            </div>
            <MapPin className="w-10 h-10 text-emerald-600 fill-emerald-600 stroke-white stroke-2" />
          </div>

          {/* Botón Flotante GPS */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isLocating}
            className="absolute bottom-4 right-4 z-20 bg-white text-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 shadow-xl flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            {isLocating ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <Navigation className="w-4 h-4 text-emerald-600" />}
            <span>Usar mi GPS</span>
          </button>
        </div>

        {/* Panel Inferior: Dirección Resuelta + Campo de Referencia + Botones */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3 max-w-4xl mx-auto w-full shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
          {/* Dirección Detectada */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-xs font-bold uppercase text-slate-400 block leading-none mb-0.5">Dirección detectada</span>
              <span className="font-extrabold text-slate-900 truncate block text-xs">
                {resolvedAddress ? `📍 ${resolvedAddress}` : 'Mueve el mapa para fijar la dirección...'}
              </span>
            </div>
            <span className="font-mono text-slate-400 text-xs shrink-0 font-bold bg-white px-2 py-1 rounded-lg border border-slate-200">
              {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
            </span>
          </div>

          {/* CAMPO DE REFERENCIA */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                Referencia de Ubicación {requireReference ? (
                  <span className="text-rose-500 font-bold">* (Obligatorio)</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Opcional)</span>
                )}
              </label>
            </div>
            <input
              type="text"
              placeholder={requireReference ? "Ej: Casa blanca de 2 pisos, portón negro junto a la farmacia..." : "Ej: Frente al retén de policía, junto al Koko Rico..."}
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
              <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1 animate-pulse">
                <span>⚠️ Por favor escribe una referencia de tu ubicación para poder confirmar.</span>
              </p>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Confirmar Ubicación
            </button>
          </div>
        </div>
      </div>
    );
}
