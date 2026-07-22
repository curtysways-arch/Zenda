'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Loader2, Check } from 'lucide-react';

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
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerInstanceRef = useRef<any>(null);

    // Almacenar coordenadas iniciales en ref para evitar re-renderizados del efecto
    const startLatRef = useRef<number>(initialLat || businessLat);
    const startLngRef = useRef<number>(initialLng || businessLng);

    useEffect(() => {
        startLatRef.current = initialLat || businessLat;
        startLngRef.current = initialLng || businessLng;
    }, [initialLat, initialLng, businessLat, businessLng]);

    const [currentLat, setCurrentLat] = useState<number>(startLatRef.current);
    const [currentLng, setCurrentLng] = useState<number>(startLngRef.current);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [mapLoading, setMapLoading] = useState<boolean>(true);

    // Inicializar mapa de Leaflet solo cuando el Modal está abierto
    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        let checkInterval: any = null;

        setCurrentLat(startLatRef.current);
        setCurrentLng(startLngRef.current);
        setMapLoading(true);

        const initLeaflet = () => {
            if (isCancelled || !mapContainerRef.current) return;

            const L = (window as any).L;
            if (!L) return;

            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }

            // Si ya existe instancia previa en el div, destruirla limpiamente
            if ((mapContainerRef.current as any)._leaflet_id || mapInstanceRef.current) {
                try { mapInstanceRef.current?.remove(); } catch (e) {}
                mapInstanceRef.current = null;
            }

            try {
                const sLat = startLatRef.current;
                const sLng = startLngRef.current;

                const map = L.map(mapContainerRef.current, {
                    zoomControl: true,
                    attributionControl: false
                }).setView([sLat, sLng], 15);

                mapInstanceRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                const icon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                const marker = L.marker([sLat, sLng], {
                    draggable: true,
                    icon: icon
                }).addTo(map);

                markerInstanceRef.current = marker;
                setMapLoading(false);

                const updateCoords = (latVal: number, lngVal: number) => {
                    if (isCancelled) return;
                    setCurrentLat(latVal);
                    setCurrentLng(lngVal);
                };

                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    updateCoords(pos.lat, pos.lng);
                });

                map.on('click', (e: any) => {
                    const pos = e.latlng;
                    marker.setLatLng(pos);
                    updateCoords(pos.lat, pos.lng);
                });

                // Re-calcular tamaño del mapa al abrir el modal en varios ticks
                [100, 300, 600].forEach(delay => {
                    setTimeout(() => {
                        if (!isCancelled && mapInstanceRef.current) {
                            mapInstanceRef.current.invalidateSize();
                        }
                    }, delay);
                });

            } catch (err) {
                console.error("Error al inicializar mapa en modal:", err);
                setMapLoading(false);
            }
        };

        const loadScriptAndInit = () => {
            if ((window as any).L) {
                initLeaflet();
                return;
            }

            if (!document.getElementById('leaflet-css-modal')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css-modal';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (!document.getElementById('leaflet-js-modal')) {
                const script = document.createElement('script');
                script.id = 'leaflet-js-modal';
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                script.onload = () => {
                    if (!isCancelled) initLeaflet();
                };
                script.onerror = () => {
                    if (!isCancelled) setMapLoading(false);
                };
                document.head.appendChild(script);
            } else {
                let retries = 0;
                checkInterval = setInterval(() => {
                    retries++;
                    if ((window as any).L) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                        if (!isCancelled) initLeaflet();
                    } else if (retries > 30) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                        if (!isCancelled) setMapLoading(false);
                    }
                }, 100);
            }
        };

        const timer = setTimeout(loadScriptAndInit, 50);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            if (checkInterval) clearInterval(checkInterval);
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (e) {}
                mapInstanceRef.current = null;
            }
            markerInstanceRef.current = null;
        };
    }, [isOpen]);

    // Función para obtener la ubicación actual por GPS
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("La geolocalización no está soportada en tu navegador.");
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

                if (markerInstanceRef.current) {
                    markerInstanceRef.current.setLatLng([uLat, uLng]);
                }
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([uLat, uLng], 16);
                }
            },
            (err) => {
                setIsLocating(false);
                alert("No se pudo obtener tu ubicación automática. Puedes mover el pin manualmente en el mapa.");
            },
            { timeout: 8000, maximumAge: 30000 }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Ubicación en el Mapa</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mueve el marcador o toca la ubicación exacta</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body - Mapa */}
                <div className="relative w-full h-80 bg-slate-100">
                    {mapLoading && (
                        <div className="absolute inset-0 z-20 bg-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                            <Loader2 className="size-5 animate-spin text-emerald-600" />
                            <span>Cargando mapa...</span>
                        </div>
                    )}
                    <div ref={mapContainerRef} className="w-full h-full z-10" />

                    {/* Botón Flotante GPS */}
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        className="absolute bottom-3 right-3 z-20 bg-white/95 text-slate-800 text-[11px] font-black px-3.5 py-2 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 hover:bg-white active:scale-95 transition-all"
                    >
                        {isLocating ? <Loader2 className="size-4 animate-spin text-emerald-600" /> : <MapPin className="size-4 text-emerald-600" />}
                        <span>Usar mi GPS</span>
                    </button>
                </div>

                {/* Coordenadas de visualización */}
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between text-[10px] font-mono text-slate-500 font-bold">
                    <span>Lat: {currentLat.toFixed(6)}</span>
                    <span>Long: {currentLng.toFixed(6)}</span>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl uppercase tracking-wider transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onConfirmLocation(currentLat, currentLng);
                            onClose();
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Check className="size-4 stroke-[3]" />
                        Confirmar Ubicación
                    </button>
                </div>
            </div>
        </div>
    );
}
