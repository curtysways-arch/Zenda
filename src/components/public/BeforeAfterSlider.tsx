'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
    beforeImg: string;
    afterImg: string;
    beforeLabel?: string;
    afterLabel?: string;
}

export default function BeforeAfterSlider({ 
    beforeImg, 
    afterImg, 
    beforeLabel = 'Antes', 
    afterLabel = 'Después' 
}: BeforeAfterSliderProps) {
    const [sliderPos, setSliderPos] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        
        setSliderPos(percent);
    }, []);

    const handleMouseDown = () => setIsResizing(true);
    const handleMouseUp = () => setIsResizing(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isResizing) handleMove(e.clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isResizing) handleMove(e.touches[0].clientX);
    };

    useEffect(() => {
        const up = () => setIsResizing(false);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchend', up);
        return () => {
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchend', up);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className="relative w-full aspect-square sm:aspect-[4/3] rounded-[2rem] overflow-hidden cursor-ew-resize select-none border border-slate-100 shadow-2xl"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            {/* After Image (Background) */}
            <img 
                src={afterImg} 
                alt="Después"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />

            {/* Before Image (Clipping) */}
            <div 
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ width: `${sliderPos}%` }}
            >
                <img 
                    src={beforeImg} 
                    alt="Antes"
                    className="absolute inset-0 w-full h-full object-cover max-w-none shadow-xl"
                    style={{ width: containerRef.current?.offsetWidth }}
                    draggable={false}
                />
            </div>

            {/* Drag Handle */}
            <div 
                className="absolute inset-y-0 w-1 bg-white shadow-[0_0_20px_rgba(0,0,0,0.3)] z-20 flex items-center justify-center p-1"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="size-10 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-emerald-500 overflow-hidden relative">
                   <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                   <Sparkles className="text-emerald-500 animate-bounce transition-all" size={18} />
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 z-30">
                <span className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                    {beforeLabel}
                </span>
            </div>
            <div className="absolute top-4 right-4 z-30 text-right">
                <span className="px-4 py-2 bg-emerald-500/80 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-emerald-400/20">
                    {afterLabel}
                </span>
            </div>
        </div>
    );
}
