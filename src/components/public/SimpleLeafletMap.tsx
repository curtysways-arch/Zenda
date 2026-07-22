'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react';

interface SimpleLeafletMapProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function SimpleLeafletMap({
    initialLat = -0.180653,
    initialLng = -78.467838,
    onLocationSelect
}: SimpleLeafletMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);
    const [leafletReady, setLeafletReady] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Intentar geolocalizar al usuario inmediatamente
    useEffect(() => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    setCurrentLat(uLat);
                    setCurrentLng(uLng);
                    onLocationSelect(uLat, uLng);
                    setIsLocating(false);
                },
                () => {
                    setIsLocating(false);
                },
                { timeout: 4000 }
            );
        }
    }, []);

    // Cargar mapa Leaflet en segundo plano si esta disponible
    useEffect(() => {
        let isMounted = true;

        const initMap = () => {
            if (!containerRef.current || !isMounted) return;
            const L = (window as any).L;
            if (!L) return;

            try {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                }

                const map = L.map(containerRef.current, {
                    zoomControl: false,
                    attributionControl: false,
                    tap: false
                }).setView([currentLat, currentLng], 16);

                mapInstanceRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                const markerIcon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                const marker = L.marker([currentLat, currentLng], {
                    draggable: true,
                    icon: markerIcon
                }).addTo(map);

                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    if (isMounted) {
                        setCurrentLat(pos.lat);
                        setCurrentLng(pos.lng);
                        onLocationSelect(pos.lat, pos.lng);
                    }
                });

                map.on('click', (e: any) => {
                    const pos = e.latlng;
                    marker.setLatLng(pos);
                    if (isMounted) {
                        setCurrentLat(pos.lat);
                        setCurrentLng(pos.lng);
                        onLocationSelect(pos.lat, pos.lng);
                    }
                });

                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                    if (isMounted) setLeafletReady(true);
                }, 150);

            } catch (e) {
                console.log("Leaflet map init notice:", e);
            }
        };

        if ((window as any).L) {
            initMap();
        } else {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.async = true;
            script.onload = () => initMap();
            document.head.appendChild(script);
        }

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (err) {}
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const handleGetLocationManually = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    setCurrentLat(uLat);
                    setCurrentLng(uLng);
                    onLocationSelect(uLat, uLng);
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([uLat, uLng], 16);
                    }
                    setIsLocating(false);
                },
                () => {
                    alert("No se pudo obtener la ubicación automáticamente. Asegúrate de otorgar permisos GPS.");
                    setIsLocating(false);
                }
            );
        }
    };

    return (
        <div className="space-y-2">
            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                {/* Contenedor del Mapa Leaflet */}
                <div ref={containerRef} className="w-full h-full z-10" />

                {/* Si Leaflet aun no se ha cargado visualmente, mostrar tarjeta interactiva de mapas */}
                {!leafletReady && (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 flex flex-col justify-between z-20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="size-5 text-orange-500 animate-bounce" />
                                <span className="text-xs font-black uppercase tracking-wider">Ubicación GPS Detectada</span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-bold">
                                GPS Activo
                            </span>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 space-y-1">
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Coordenadas de entrega:</p>
                            <p className="text-xs font-mono font-black text-white">Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleGetLocationManually}
                            disabled={isLocating}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                        >
                            <Navigation className={`size-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                            <span>{isLocating ? 'Obteniendo GPS...' : 'Actualizar Mi Ubicación GPS'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Botón flotante para refrescar GPS en el mapa */}
            {leafletReady && (
                <button
                    type="button"
                    onClick={handleGetLocationManually}
                    disabled={isLocating}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                >
                    <Navigation className={`size-3.5 text-orange-600 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detectando mi GPS...' : 'Centrar en mi ubicación actual'}</span>
                </button>
            )}
        </div>
    );
}
