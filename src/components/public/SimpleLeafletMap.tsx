'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Touchpad } from 'lucide-react';

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
                    mapInstanceRef.current = null;
                }

                // Crear mapa con tap: false para evitar congelamientos en móviles
                const map = L.map(containerRef.current, {
                    zoomControl: true,
                    attributionControl: false,
                    tap: false
                }).setView([initialLat, initialLng], 16);

                mapInstanceRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                // Icono oficial de marcador
                const customIcon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                // Marcador arrastrable (Draggable)
                const marker = L.marker([initialLat, initialLng], {
                    draggable: true,
                    icon: customIcon
                }).addTo(map);

                markerInstanceRef.current = marker;

                // Evento al arrastrar el pin
                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    if (isMounted) {
                        setCurrentLat(pos.lat);
                        setCurrentLng(pos.lng);
                        onLocationSelect(pos.lat, pos.lng);
                    }
                });

                // Evento al hacer clic o tocar cualquier parte del mapa
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
                        { timeout: 4000 }
                    );
                }

                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 200);

            } catch (err) {
                console.error("Error iniciando mapa interactivo:", err);
            }
        };

        if ((window as any).L) {
            initLeaflet();
        } else {
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
                script.onload = () => initLeaflet();
                document.head.appendChild(script);
            } else {
                const checkInterval = setInterval(() => {
                    if ((window as any).L) {
                        clearInterval(checkInterval);
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
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm z-0">
                {/* Contenedor del Mapa con Pin Arrastrable */}
                <div 
                    ref={containerRef} 
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%', minHeight: '192px' }}
                />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="size-3.5 text-orange-600 shrink-0" />
                    <span>Toca la pantalla o arrastra el marcador</span>
                </div>

                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                >
                    <Navigation className={`size-3 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Buscando...' : 'Mi Ubicación'}</span>
                </button>
            </div>
        </div>
    );
}
