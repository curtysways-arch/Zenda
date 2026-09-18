'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, RefreshCw, X, Check, Compass, Crosshair, ChevronDown, ChevronUp } from 'lucide-react';

interface BusinessLocationPickerProps {
    lat: number | string;
    lng: number | string;
    onChange: (lat: string, lng: string, addressName?: string) => void;
    onApplyAddress?: (address: string) => void;
    currentAddress?: string;
    primaryColor?: string;
}

export default function BusinessLocationPicker({
    lat,
    lng,
    onChange,
    onApplyAddress,
    currentAddress = '',
    primaryColor = '#06b6d4'
}: BusinessLocationPickerProps) {
    const numLat = parseFloat(String(lat)) || -0.180653;
    const numLng = parseFloat(String(lng)) || -78.467838;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLat, setCurrentLat] = useState<number>(numLat);
    const [currentLng, setCurrentLng] = useState<number>(numLng);
    const [resolvedAddress, setResolvedAddress] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [mapLoading, setMapLoading] = useState<boolean>(true);
    const [showManualInputs, setShowManualInputs] = useState<boolean>(false);

    const mapDivRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    // Mantener sincronizado si cambian las props
    useEffect(() => {
        const pLat = parseFloat(String(lat));
        const pLng = parseFloat(String(lng));
        if (!isNaN(pLat) && !isNaN(pLng)) {
            setCurrentLat(pLat);
            setCurrentLng(pLng);
        }
    }, [lat, lng]);

    // Reverse geocoding de la posición actual del negocio
    useEffect(() => {
        let isCancelled = false;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!isCancelled && data && data.display_name) {
                        const parts = data.display_name.split(',');
                        const shortName = parts.slice(0, 4).join(',').trim();
                        setResolvedAddress(shortName || data.display_name);
                    }
                }
            } catch (e) {
                console.warn('Error reverse geocoding:', e);
            }
        }, 500);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [currentLat, currentLng]);

    // Inicializar mapa cuando se abre el modal
    useEffect(() => {
        if (!isModalOpen) return;

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
                const map = L.map(mapDivRef.current, {
                    zoomControl: true,
                    attributionControl: false
                }).setView([currentLat, currentLng], 16);

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
                console.error("Error al inicializar mapa interactivo del negocio:", err);
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
    }, [isModalOpen]);

    // Usar geolocalización GPS del dispositivo
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
                    mapInstanceRef.current.setView([uLat, uLng], 17);
                }
            },
            (err) => {
                setIsLocating(false);
                alert("No se pudo obtener la ubicación GPS automática. Puedes buscarla manualmente en el mapa.");
            },
            { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
        );
    };

    // Buscar dirección mediante OpenStreetMap Nominatim
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
                            mapInstanceRef.current.setView([newLat, newLng], 17);
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

    // Guardar selección desde el modal
    const handleConfirmModal = () => {
        onChange(currentLat.toFixed(6), currentLng.toFixed(6), resolvedAddress);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-3">
            {/* Tarjeta Visual de Ubicación del Local */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div 
                            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                            className="p-3 rounded-2xl shrink-0 mt-0.5 border border-slate-200"
                        >
                            <MapPin className="size-5" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                Ubicación GPS del Local Comercial
                            </span>
                            <p className="text-xs font-black text-slate-900 leading-snug">
                                {resolvedAddress || (currentAddress ? currentAddress : 'Ubicación aún sin fijar en el mapa')}
                            </p>
                            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                                    Lat: {Number(currentLat).toFixed(6)}
                                </span>
                                <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                                    Lng: {Number(currentLng).toFixed(6)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            style={{ backgroundColor: primaryColor }}
                            className="px-4 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Compass className="size-4" />
                            <span>Abrir Mapa GPS</span>
                        </button>
                    </div>
                </div>

                {/* Alternador para ajustar manualmente números si es necesario */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setShowManualInputs(!showManualInputs)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                        <span>{showManualInputs ? 'Ocultar coordenadas numéricas' : 'Ajustar coordenadas manualmente'}</span>
                        {showManualInputs ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>

                    {resolvedAddress && onApplyAddress && (
                        <button
                            type="button"
                            onClick={() => onApplyAddress(resolvedAddress)}
                            className="text-[10px] font-black text-slate-700 hover:underline cursor-pointer flex items-center gap-1"
                        >
                            <span>Copiar dirección al campo de Dirección Física</span>
                        </button>
                    )}
                </div>

                {showManualInputs && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2 border-t border-slate-100">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                Latitud
                            </label>
                            <input
                                type="text"
                                value={String(lat)}
                                onChange={e => onChange(e.target.value, String(lng))}
                                placeholder="-0.180653"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                Longitud
                            </label>
                            <input
                                type="text"
                                value={String(lng)}
                                onChange={e => onChange(String(lat), e.target.value)}
                                placeholder="-78.467838"
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODAL DEL MAPA INTERACTIVO ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-3xl h-[88vh] max-h-[720px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                        
                        {/* Cabecera del Modal */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center gap-3">
                                <div 
                                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                                    className="p-2 rounded-xl"
                                >
                                    <MapPin className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                        Fijar Ubicación del Local Comercial
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        Mueve el mapa para centrar el pin en tu tienda o negocio
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Buscador de Dirección */}
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                            <form onSubmit={handleSearchAddress} className="flex gap-2 w-full">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar calle, avenida, barrio, centro comercial o ciudad..."
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
                                    {isSearching ? <RefreshCw className="size-4 animate-spin" /> : "Buscar"}
                                </button>
                            </form>
                        </div>

                        {/* Contenedor del Mapa con Pin Central */}
                        <div className="relative w-full flex-1 bg-slate-100 overflow-hidden">
                            {mapLoading && (
                                <div className="absolute inset-0 z-20 bg-slate-100/90 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                                    <RefreshCw className="size-5 animate-spin text-slate-700" />
                                    <span>Cargando mapa interactivo...</span>
                                </div>
                            )}

                            {/* Div del Mapa Leaflet */}
                            <div ref={mapDivRef} className="w-full h-full z-10" />

                            {/* Pin Central Fijo */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none flex flex-col items-center drop-shadow-xl pb-1">
                                <div 
                                    style={{ backgroundColor: primaryColor }}
                                    className="text-white text-[10px] font-black px-3 py-1 rounded-full mb-1 border-2 border-white shadow-lg whitespace-nowrap"
                                >
                                    Tu Local Comercial 🏪
                                </div>
                                <MapPin 
                                    style={{ color: primaryColor, fill: primaryColor }}
                                    className="size-10 stroke-white stroke-2" 
                                />
                            </div>

                            {/* Botón flotante GPS */}
                            <button
                                type="button"
                                onClick={handleUseGPS}
                                disabled={isLocating}
                                className="absolute bottom-4 right-4 z-20 bg-white text-slate-900 text-xs font-black px-4 py-2.5 rounded-xl border border-slate-200 shadow-xl flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                            >
                                {isLocating ? <RefreshCw className="size-4 animate-spin text-slate-700" /> : <Crosshair className="size-4 text-emerald-600" />}
                                <span>Mi ubicación actual (GPS)</span>
                            </button>
                        </div>

                        {/* Pie del Modal con Confirmación */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 space-y-3">
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between text-xs gap-3">
                                <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-1">
                                        Dirección aproximada detectada
                                    </span>
                                    <span className="font-extrabold text-slate-900 truncate block text-xs">
                                        {resolvedAddress ? `📍 ${resolvedAddress}` : 'Mueve el mapa para centrar la ubicación...'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="font-mono text-slate-500 text-[11px] font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 block">
                                        {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmModal}
                                    style={{ backgroundColor: primaryColor }}
                                    className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <Check className="size-4" />
                                    <span>Confirmar Esta Ubicación</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
