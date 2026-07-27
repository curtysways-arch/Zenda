'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';

interface CarouselProps {
    banners: string[];
    deliveryTime?: string;
    storeName?: string;
}

const FALLBACK_BANNERS = [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80'
];

export default function PinchoBannerCarousel({
    banners = [],
    deliveryTime = '30-45 min',
    storeName = 'PinchoListo'
}: CarouselProps) {
    const displayBanners = banners.length > 0 ? banners : FALLBACK_BANNERS;
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance every 4 seconds
    useEffect(() => {
        if (displayBanners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % displayBanners.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [displayBanners.length]);

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + displayBanners.length) % displayBanners.length);
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % displayBanners.length);
    };

    return (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-lg aspect-[21/9] sm:aspect-[24/9] bg-slate-900 group">
            {/* Banner Slides */}
            {displayBanners.map((url, idx) => (
                <div
                    key={url + idx}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                        idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={url}
                        alt={`Banner ${idx + 1}`}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                </div>
            ))}

            {/* Overlaid Information */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between pointer-events-none">
                <div className="space-y-1 text-left">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-600/90 text-white text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">
                        <Sparkles className="size-3" />
                        <span>Especialidad de la Casa</span>
                    </span>
                    <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-md tracking-tight">
                        {storeName}
                    </h2>
                </div>

                {/* Delivery Time Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 text-amber-400 text-xs font-black rounded-2xl backdrop-blur-md shadow-lg shrink-0">
                    <Clock className="size-3.5 text-orange-500 animate-pulse" />
                    <span>⏱️ {deliveryTime}</span>
                </div>
            </div>

            {/* Carousel Arrow Controls (Visible on hover/touch if multiple banners) */}
            {displayBanners.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 size-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Anterior"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 size-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Siguiente"
                    >
                        <ChevronRight className="size-5" />
                    </button>

                    {/* Dots Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 pointer-events-auto">
                        {displayBanners.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                    idx === currentIndex ? 'w-6 bg-orange-500' : 'w-1.5 bg-white/50 hover:bg-white'
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
