'use client';

import React, { useEffect, useState } from 'react';
import { X, MapPin, Check, ExternalLink, RefreshCw, Search } from 'lucide-react';

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
    const startLat = initialLat || businessLat;
    const startLng = initialLng || businessLng;

    const [currentLat, setCurrentLat] = useState<number>(startLat);
    const [currentLng, setCurrentLng] = useState<number>(startLng);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentLat(initialLat || businessLat);
            setCurrentLng(initialLng || businessLng);
            setSearchQuery('');
        }
    }, [isOpen, initialLat, initialLng, businessLat, businessLng]);

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
                setCurrentLat(pos.coords.latitude);
                setCurrentLng(pos.coords.longitude);
            },
            (err) => {
                setIsLocating(false);
                alert("No se pudo obtener la ubicación automáticamente. Puedes buscar tu dirección arriba.");
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
                    }
                } else {
                    alert("No se encontraron resultados para esa dirección. Intenta con otra referencia o ciudad.");
                }
            }
        } catch (err) {
            console.error("Error al buscar dirección:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&z=16&output=embed`;
    const googleMapsExternalUrl = `https://www.google.com/maps?q=${currentLat},${currentLng}`;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Ubicación GPS</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Busca tu dirección o confirma con GPS</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Buscador de Dirección / Sector */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <form onSubmit={handleSearchAddress} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar dirección o sector (ej: Av. Shyris, Quito)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white rounded-xl pl-9 pr-3 py-2 border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-400 text-slate-900"
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

                {/* Body - Google Maps Embed Oficial (100% aislado, 0% riesgo de cuelgue) */}
                <div className="relative w-full h-72 bg-slate-100">
                    <iframe
                        key={`${currentLat}-${currentLng}`}
                        src={googleMapsEmbedUrl}
                        className="w-full h-full border-0"
                        title="Mapa de Ubicación Google Maps"
                        loading="lazy"
                        allowFullScreen
                    />
                </div>

                {/* Controles de Ubicación */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleUseGPS}
                            disabled={isLocating}
                            className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 text-xs font-black rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        >
                            {isLocating ? <RefreshCw className="size-3.5 animate-spin text-emerald-600" /> : <MapPin className="size-3.5 text-emerald-600" />}
                            <span>{isLocating ? "Obteniendo GPS..." : "📍 Usar mi GPS Actual"}</span>
                        </button>

                        <a
                            href={googleMapsExternalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <ExternalLink className="size-3.5 text-slate-500" />
                            <span>Abrir App Mapa</span>
                        </a>
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-slate-500 font-bold px-1">
                        <span>Latitud: {currentLat.toFixed(6)}</span>
                        <span>Longitud: {currentLng.toFixed(6)}</span>
                    </div>
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
