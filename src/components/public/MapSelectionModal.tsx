'use client';

import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';

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

    useEffect(() => {
        if (!isOpen) return;

        // Resetear coordenadas al abrir
        setCurrentLat(startLat);
        setCurrentLng(startLng);

        // Escuchar mensajes de geolocalización desde el iframe totalmente aislado
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'LOCATION_UPDATED') {
                if (typeof event.data.lat === 'number' && typeof event.data.lng === 'number') {
                    setCurrentLat(event.data.lat);
                    setCurrentLng(event.data.lng);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isOpen, startLat, startLng]);

    if (!isOpen) return null;

    const mapUrl = `/map-picker.html?lat=${startLat}&lng=${startLng}`;

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
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body - Mapa aislado en Iframe (Sandbox total, 0% riesgo de congelar la App) */}
                <div className="relative w-full h-80 bg-slate-100">
                    <iframe
                        src={mapUrl}
                        className="w-full h-full border-0"
                        title="Seleccionador de Ubicación Mapa"
                        loading="lazy"
                    />
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
