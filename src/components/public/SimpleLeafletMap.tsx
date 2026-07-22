'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';

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
    const markerInstanceRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);

    useEffect(() => {
        let isMounted = true;

        const initLeafletMap = () => {
            if (!containerRef.current || !isMounted) return;

            const L = (window as any).L;
            if (!L) {
                setLoadError(true);
                setLoading(false);
                return;
            }

            try {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                    mapInstanceRef.current = null;
                }

                const map = L.map(containerRef.current, {
                    zoomControl: true,
                    attributionControl: false,
                    tap: false
                }).setView([initialLat, initialLng], 15);

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

                const marker = L.marker([initialLat, initialLng], {
                    draggable: true,
                    icon: markerIcon
                }).addTo(map);

                markerInstanceRef.current = marker;

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

                // Auto geolocalización suave
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (!isMounted) return;
                            const uLat = pos.coords.latitude;
                            const uLng = pos.coords.longitude;
                            map.setView([uLat, uLng], 16);
                            marker.setLatLng([uLat, uLng]);
                            setCurrentLat(uLat);
                            setCurrentLng(uLng);
                            onLocationSelect(uLat, uLng);
                        },
                        () => {},
                        { timeout: 5000 }
                    );
                }

                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                    if (isMounted) setLoading(false);
                }, 200);

            } catch (err) {
                console.error("Error iniciando Leaflet:", err);
                if (isMounted) {
                    setLoadError(true);
                    setLoading(false);
                }
            }
        };

        // Cargar CSS y JS de Leaflet si no están presentes
        if ((window as any).L) {
            initLeafletMap();
        } else {
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (!document.getElementById('leaflet-js')) {
                const script = document.createElement('script');
                script.id = 'leaflet-js';
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                script.onload = () => initLeafletMap();
                script.onerror = () => {
                    if (isMounted) {
                        setLoadError(true);
                        setLoading(false);
                    }
                };
                document.head.appendChild(script);
            } else {
                const checkL = setInterval(() => {
                    if ((window as any).L) {
                        clearInterval(checkL);
                        initLeafletMap();
                    }
                }, 100);
            }
        }

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {}
                mapInstanceRef.current = null;
            }
        };
    }, [initialLat, initialLng]);

    if (loadError) {
        return (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2">
                <MapPin className="size-6 text-orange-600 mx-auto" />
                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Ubicación GPS por Defecto</p>
                <p className="text-[11px] text-slate-500 font-medium">Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}</p>
                <p className="text-[10px] text-slate-400">Introduce la referencia detallada de tu domicilio en el campo de texto.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
            {loading && (
                <div className="absolute inset-0 bg-slate-100/90 z-20 flex flex-col items-center justify-center text-slate-500 text-xs font-bold gap-2">
                    <RefreshCw className="size-5 animate-spin text-orange-600" />
                    <span>Cargando Mapa GPS...</span>
                </div>
            )}
            <div ref={containerRef} className="w-full h-full z-10" />
        </div>
    );
}
