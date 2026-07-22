'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

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
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const initLeaflet = () => {
            if (!containerRef.current || !isMounted) return;
            const L = (window as any).L;
            if (!L) return;

            try {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
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

                // Auto geolocalizar
                if (navigator.geolocation) {
                    setIsLocating(true);
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
                            setIsLocating(false);
                        },
                        () => {
                            if (isMounted) setIsLocating(false);
                        },
                        { timeout: 5000 }
                    );
                }

                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 200);

            } catch (err) {
                console.error("Error iniciando Leaflet:", err);
            }
        };

        if ((window as any).L) {
            initLeaflet();
        } else {
            if (!document.getElementById('leaflet-css-pkg')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css-pkg';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (!document.getElementById('leaflet-js-pkg')) {
                const script = document.createElement('script');
                script.id = 'leaflet-js-pkg';
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                script.onload = () => initLeaflet();
                document.head.appendChild(script);
            } else {
                const interval = setInterval(() => {
                    if ((window as any).L) {
                        clearInterval(interval);
                        initLeaflet();
                    }
                }, 100);
            }
        }

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (e) {}
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    setCurrentLat(uLat);
                    setCurrentLng(uLng);
                    onLocationSelect(uLat, uLng);
                    if (mapInstanceRef.current && markerInstanceRef.current) {
                        mapInstanceRef.current.setView([uLat, uLng], 16);
                        markerInstanceRef.current.setLatLng([uLat, uLng]);
                    }
                    setIsLocating(false);
                },
                () => {
                    alert("Por favor permite el acceso al GPS en tu navegador.");
                    setIsLocating(false);
                }
            );
        }
    };

    return (
        <div className="space-y-2">
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                {/* Contenedor Real del Mapa Interactivo */}
                <div ref={containerRef} className="w-full h-full z-10" />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                <span>GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                >
                    <Navigation className={`size-3 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Buscando GPS...' : 'Mi Ubicación'}</span>
                </button>
            </div>
        </div>
    );
}
