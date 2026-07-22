'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    
    // Guardar referencia estable del callback para evitar re-renders en cascada
    const onLocationSelectRef = useRef(onLocationSelect);
    useEffect(() => {
        onLocationSelectRef.current = onLocationSelect;
    }, [onLocationSelect]);

    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);
    const [isLocating, setIsLocating] = useState(false);

    // Inicializar mapa de Leaflet UNA SOLA VEZ al montar
    useEffect(() => {
        let isMounted = true;

        const initLeaflet = () => {
            if (!containerRef.current || !isMounted || mapInstanceRef.current) return;
            const L = (window as any).L;
            if (!L) return;

            try {
                // Crear instancia unica del mapa
                const map = L.map(containerRef.current, {
                    zoomControl: true,
                    attributionControl: false,
                    tap: false
                }).setView([initialLat, initialLng], 15);

                mapInstanceRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                const customIcon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                const marker = L.marker([initialLat, initialLng], {
                    draggable: true,
                    icon: customIcon
                }).addTo(map);

                markerInstanceRef.current = marker;

                // Actualizar posicion de forma segura
                const updatePos = (lat: number, lng: number) => {
                    if (!isMounted) return;
                    setCurrentLat(lat);
                    setCurrentLng(lng);
                    if (onLocationSelectRef.current) {
                        onLocationSelectRef.current(lat, lng);
                    }
                };

                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    updatePos(pos.lat, pos.lng);
                });

                map.on('click', (e: any) => {
                    const pos = e.latlng;
                    marker.setLatLng(pos);
                    updatePos(pos.lat, pos.lng);
                });

                // Auto geolocalización inicial suave
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (!isMounted) return;
                            const uLat = pos.coords.latitude;
                            const uLng = pos.coords.longitude;
                            if (mapInstanceRef.current && markerInstanceRef.current) {
                                mapInstanceRef.current.setView([uLat, uLng], 16);
                                markerInstanceRef.current.setLatLng([uLat, uLng]);
                            }
                            updatePos(uLat, uLng);
                        },
                        () => {},
                        { timeout: 4000 }
                    );
                }

                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 300);

            } catch (err) {
                console.error("Error iniciando Leaflet:", err);
            }
        };

        let checkInterval: any = null;

        if ((window as any).L) {
            initLeaflet();
        } else {
            if (!document.getElementById('leaflet-css-v3')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css-v3';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (!document.getElementById('leaflet-js-v3')) {
                const script = document.createElement('script');
                script.id = 'leaflet-js-v3';
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                script.onload = () => initLeaflet();
                document.head.appendChild(script);
            } else {
                checkInterval = setInterval(() => {
                    if ((window as any).L) {
                        clearInterval(checkInterval);
                        initLeaflet();
                    }
                }, 100);
            }
        }

        return () => {
            isMounted = false;
            if (checkInterval) clearInterval(checkInterval);
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (e) {}
                mapInstanceRef.current = null;
            }
        };
    }, []); // Array vacio para garantizar inicialización única

    const handleLocateMe = useCallback(() => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const uLat = pos.coords.latitude;
                    const uLng = pos.coords.longitude;
                    setCurrentLat(uLat);
                    setCurrentLng(uLng);
                    if (mapInstanceRef.current && markerInstanceRef.current) {
                        mapInstanceRef.current.setView([uLat, uLng], 16);
                        markerInstanceRef.current.setLatLng([uLat, uLng]);
                    }
                    if (onLocationSelectRef.current) {
                        onLocationSelectRef.current(uLat, uLng);
                    }
                    setIsLocating(false);
                },
                () => {
                    alert("Por favor permite el acceso al GPS en tu navegador.");
                    setIsLocating(false);
                }
            );
        }
    }, []);

    return (
        <div className="space-y-2">
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm z-0">
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
