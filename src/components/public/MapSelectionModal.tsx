'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Check, RefreshCw, Search } from 'lucide-react';

interface MapSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLat?: number | null;
    initialLng?: number | null;
    businessLat?: number;
    businessLng?: number;
    onConfirmLocation: (lat: number, lng: number) => void;
}

export default function MapSelectionModal({
    isOpen,
    onClose,
    initialLat,
    initialLng,
    businessLat = -0.180653,
    businessLng = -78.467838,
    onConfirmLocation
}: MapSelectionModalProps) {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    // Guardar coordenadas iniciales en ref para que el efecto NO se re-ejecute al cambiar estados
    const initLatRef = useRef<number>(initialLat || businessLat);
    const initLngRef = useRef<number>(initialLng || businessLng);

    const [currentLat, setCurrentLat] = useState<number>(initLatRef.current);
    const [currentLng, setCurrentLng] = useState<number>(initLngRef.current);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [mapLoading, setMapLoading] = useState<boolean>(true);

    // Actualizar refs cuando el modal se abre
    useEffect(() => {
        if (isOpen) {
            const startLat = initialLat || businessLat;
            const startLng = initialLng || businessLng;
            initLatRef.current = startLat;
            initLngRef.current = startLng;
            setCurrentLat(startLat);
            setCurrentLng(startLng);
            setSearchQuery('');
        }
    }, [isOpen, initialLat, initialLng, businessLat, businessLng]);

    // Inicializar el mapa UNA SOLA VEZ cuando el modal se abre
    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        setMapLoading(true);

        const initMap = () => {
            if (isCancelled || !mapDivRef.current) return;

            const L = (window as any).L;
            if (!L) {
                // Cargar CSS si no existe
                if (!document.getElementById('leaflet-css-v2')) {
                    const link = document.createElement('link');
                    link.id = 'leaflet-css-v2';
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }
                // Cargar JS si no existe
                if (!document.getElementById('leaflet-js-v2')) {
                    const script = document.createElement('script');
                    script.id = 'leaflet-js-v2';
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.async = true;
                    script.onload = () => { if (!isCancelled) initMap(); };
                    script.onerror = () => { if (!isCancelled) setMapLoading(false); };
                    document.head.appendChild(script);
                } else {
                    // Si el script ya se está cargando, reintentar una sola vez en 200ms
                    setTimeout(() => { if (!isCancelled) initMap(); }, 200);
                }
                return;
            }

            // Destruir mapa previo si existe en el contenedor DOM
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

                // Escuchar el evento 'moveend' al desplazar el mapa (Patrón Uber/Rappi)
                map.on('moveend', () => {
                    if (isCancelled) return;
                    const center = map.getCenter();
                    setCurrentLat(center.lat);
                    setCurrentLng(center.lng);
                });

                // Invalidate size en varios ticks para asegurar renderizado perfecto en modal
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

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Ubicación en el Mapa</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mueve el mapa para fijar el pin en tu entrega</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Buscador de Dirección */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <form onSubmit={handleSearchAddress} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar calle, dirección o sector..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white rounded-xl pl-9 pr-3 py-2 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
                        >
                            {isSearching ? <RefreshCw className="size-3.5 animate-spin" /> : "Buscar"}
                        </button>
                    </form>
                </div>

                {/* Body - Mapa Interactivo con Pin Central Fijo (Uber/Rappi Style - 0% riesgo de reinicialización) */}
                <div className="relative w-full h-80 bg-slate-100 overflow-hidden">
                    {mapLoading && (
                        <div className="absolute inset-0 z-20 bg-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                            <RefreshCw className="size-5 animate-spin text-emerald-600" />
                            <span>Cargando mapa interactivo...</span>
                        </div>
                    )}

                    {/* Div Contenedor del Mapa */}
                    <div ref={mapDivRef} className="w-full h-full z-10" />

                    {/* Pin de Mapa Fijo en el Centro Exacto (Estilo Uber/Rappi) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex flex-col items-center drop-shadow-md pb-1">
                        <div className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full mb-1 border border-slate-700 shadow-xs">
                            Punto de Entrega
                        </div>
                        <MapPin className="size-9 text-emerald-600 fill-emerald-600 stroke-white stroke-2" />
                    </div>

                    {/* Botón Flotante GPS */}
                    <button
                        type="button"
                        onClick={handleUseGPS}
                        disabled={isLocating}
                        className="absolute bottom-3 right-3 z-20 bg-white/95 text-slate-900 text-[11px] font-black px-3.5 py-2 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 hover:bg-white active:scale-95 transition-all cursor-pointer"
                    >
                        {isLocating ? <RefreshCw className="size-4 animate-spin text-emerald-600" /> : <MapPin className="size-4 text-emerald-600" />}
                        <span>Usar mi GPS</span>
                    </button>
                </div>

                {/* Coordenadas */}
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between text-[10px] font-mono text-slate-500 font-bold">
                    <span>Latitud: {currentLat.toFixed(6)}</span>
                    <span>Longitud: {currentLng.toFixed(6)}</span>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl uppercase tracking-wider transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirmLocation(currentLat, currentLng);
                            onClose();
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                        <Check className="size-4 stroke-[3]" />
                        Confirmar Ubicación
                    </button>
                </div>
            </div>
        </div>
    );
}
