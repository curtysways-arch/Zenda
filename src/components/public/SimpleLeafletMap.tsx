'use client';

import React, { useEffect, useState } from 'react';
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
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);
    const [isLocating, setIsLocating] = useState(false);

    // Auto geolocalización al cargar
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
                    setIsLocating(false);
                },
                () => {
                    alert("Por favor habilita el acceso GPS en las configuraciones de tu navegador.");
                    setIsLocating(false);
                }
            );
        }
    };

    const mapEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&z=16&output=embed`;

    return (
        <div className="space-y-2">
            {/* Visor de Mapa Interactivo Directo */}
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                <iframe
                    title="Mapa GPS de Entrega"
                    src={mapEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                />
            </div>

            {/* Barra de Coordenadas y Botón de Ubicación Actual */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="size-3.5 text-orange-600 shrink-0" />
                    <span>GPS: {currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
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
