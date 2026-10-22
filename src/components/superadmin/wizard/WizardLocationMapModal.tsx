'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Check, RefreshCw, Search, Crosshair } from 'lucide-react';

interface WizardLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialSearchQuery?: string;
  onConfirm: (data: {
    lat: number;
    lng: number;
    address: string;
    city?: string;
    googleMapsUrl: string;
  }) => void;
}

export default function WizardLocationMapModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialSearchQuery = '',
  onConfirm,
}: WizardLocationMapModalProps) {
  const defaultLat = initialLat && !isNaN(initialLat) ? initialLat : -0.180653;
  const defaultLng = initialLng && !isNaN(initialLng) ? initialLng : -78.467838;

  const [currentLat, setCurrentLat] = useState<number>(defaultLat);
  const [currentLng, setCurrentLng] = useState<number>(defaultLng);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [mapLoading, setMapLoading] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLat && initialLng && !isNaN(initialLat) && !isNaN(initialLng)) {
        setCurrentLat(initialLat);
        setCurrentLng(initialLng);
      }
      if (initialSearchQuery && initialSearchQuery.trim()) {
        setSearchQuery(initialSearchQuery.trim());
      }
    }
  }, [isOpen, initialLat, initialLng, initialSearchQuery]);

  useEffect(() => {
    if (!isOpen || isNaN(currentLat) || isNaN(currentLng)) return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/geocode?reverse=1&lat=${currentLat}&lng=${currentLng}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && data.address) {
            setResolvedAddress(data.address);
          }
        }
      } catch (e) {
        console.warn('Error reverse geocoding en wizard:', e);
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, currentLat, currentLng]);

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
        const res = await fetch(
          `/api/public/geocode?q=${encodeURIComponent(query)}&lat=${currentLat}&lng=${currentLng}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            setSuggestions(data.results);
            setShowSuggestions(true);
          }
        }
      } catch (err) {
        console.warn('Error al buscar sugerencias:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentLat, currentLng]);

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
          script.onload = () => {
            if (!isCancelled) initMap();
          };
          script.onerror = () => {
            if (!isCancelled) setMapLoading(false);
          };
          document.head.appendChild(script);
        } else {
          setTimeout(() => {
            if (!isCancelled) initMap();
          }, 200);
        }
        return;
      }

      if (mapInstanceRef.current || (mapDivRef.current as any)._leaflet_id) {
        try {
          mapInstanceRef.current?.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }

      try {
        const map = L.map(mapDivRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([currentLat, currentLng], 16);

        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        setMapLoading(false);

        map.on('moveend', () => {
          if (isCancelled) return;
          const center = map.getCenter();
          setCurrentLat(center.lat);
          setCurrentLng(center.lng);
        });

        [100, 300, 600].forEach((delay) => {
          setTimeout(() => {
            if (!isCancelled && mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, delay);
        });
      } catch (err) {
        console.error('Error al inicializar mapa en wizard:', err);
        setMapLoading(false);
      }
    };

    const timer = setTimeout(initMap, 60);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

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

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/public/geocode?q=${encodeURIComponent(query)}&lat=${currentLat}&lng=${currentLng}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          setSuggestions(data.results);
          setShowSuggestions(true);
          if (data.results.length > 0) {
            handleSelectSuggestion(data.results[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error al buscar dirección:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
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
          try {
            mapInstanceRef.current.flyTo([uLat, uLng], 17, { duration: 0.8 });
          } catch (e) {
            mapInstanceRef.current.setView([uLat, uLng], 17);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        alert('No se pudo obtener la ubicación GPS automática. Puedes buscarla manualmente en el mapa.');
      },
      { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    const lat = Number(currentLat.toFixed(6));
    const lng = Number(currentLng.toFixed(6));
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

    let city: string | undefined = undefined;
    if (resolvedAddress) {
      const parts = resolvedAddress.split(',').map((p) => p.trim());
      if (parts.length > 1) {
        city = parts[parts.length - 1];
      }
    }

    onConfirm({
      lat,
      lng,
      address: resolvedAddress || `${lat}, ${lng}`,
      city,
      googleMapsUrl,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dark fixed inset-0 z-[9999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-3xl h-[90vh] max-h-[720px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 text-white font-sans">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">
                  Ubicación GPS del Negocio
                </h3>
                <span className="text-xs font-bold uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                  Mapa Interactivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mueve el mapa o busca la dirección para fijar el local comercial.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Buscador de Dirección y Autocompletado */}
        <div className="relative px-5 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0 z-30">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full relative">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10 flex items-center justify-center">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar calle, barrio, avenida o referencia (ej: Real Audiencia, Quito)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                style={{ color: '#ffffff', paddingLeft: '40px', paddingRight: searchQuery ? '36px' : '14px' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 text-xs font-bold !text-white caret-emerald-400 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}

              {/* Menú de Sugerencias */}
              {showSuggestions && (searchQuery.trim().length >= 2 || isSearching) && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-4 py-3 flex items-center gap-2 text-xs text-slate-400 font-semibold">
                        <RefreshCw size={14} className="animate-spin text-emerald-400 shrink-0" />
                        <span>Buscando &ldquo;{searchQuery}&rdquo;...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="divide-y divide-slate-800">
                        <div className="px-3.5 py-1.5 bg-slate-900 text-xs font-bold uppercase text-slate-400 tracking-wider">
                          Resultados ({suggestions.length})
                        </div>
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-900 transition flex items-start gap-3 cursor-pointer group"
                          >
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                              <MapPin size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate group-hover:text-emerald-300">
                                {item.mainText}
                              </p>
                              {item.secondaryText && (
                                <p className="text-xs text-slate-400 truncate">{item.secondaryText}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 text-center">
                        No se encontraron lugares para &ldquo;
                        <span className="font-bold text-slate-200">{searchQuery}</span>&rdquo;.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Buscar'}
            </button>
          </form>
        </div>

        {/* Contenedor del Mapa */}
        <div className="relative w-full flex-1 bg-slate-950 overflow-hidden">
          {mapLoading && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <RefreshCw size={18} className="animate-spin text-emerald-400" />
              <span>Cargando mapa interactivo...</span>
            </div>
          )}

          {/* Div Leaflet */}
          <div ref={mapDivRef} className="w-full h-full z-10" />

          {/* Pin Central Fijo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex flex-col items-center drop-shadow-2xl pb-1">
            <div className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full mb-1 border-2 border-white shadow-xl whitespace-nowrap">
              🏪 Ubicación del Negocio
            </div>
            <MapPin className="size-10 text-emerald-500 fill-emerald-500 stroke-white stroke-2" />
          </div>

          {/* Botón Flotante GPS */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isLocating}
            className="absolute bottom-4 right-4 z-20 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-xl flex items-center gap-2 active:scale-95 transition cursor-pointer backdrop-blur-sm"
          >
            {isLocating ? (
              <RefreshCw size={14} className="animate-spin text-emerald-400" />
            ) : (
              <Crosshair size={14} className="text-emerald-400" />
            )}
            <span>Mi ubicación actual</span>
          </button>
        </div>

        {/* Footer con Dirección Resuelta y Confirmar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/95 shrink-0 space-y-3">
          <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between text-xs gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase text-slate-400 block leading-none mb-1">
                Dirección detectada en el mapa
              </span>
              <span className="font-bold text-white truncate block text-xs sm:text-sm">
                {resolvedAddress ? `📍 ${resolvedAddress}` : 'Mueve el mapa para centrar la ubicación exacta...'}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-emerald-400 text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 block">
                {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} strokeWidth={3} />
              <span>Confirmar Esta Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
