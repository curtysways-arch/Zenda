'use client';

import React from 'react';
import { Loader2, Flame, Sparkles } from 'lucide-react';

interface SuperLoaderProps {
    show: boolean;
    title?: string;
    subtitle?: string;
}

export default function PinchoSuperLoader({
    show,
    title = 'Procesando...',
    subtitle = 'Por favor espera un momento, estamos procesando tu solicitud.'
}: SuperLoaderProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[999] bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 text-center animate-fade-in font-sans">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 relative overflow-hidden animate-scale-up">
                {/* Glow & Radial Lights */}
                <div className="absolute -top-12 -left-12 size-36 bg-orange-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute -bottom-12 -right-12 size-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

                {/* Central Icon Container */}
                <div className="relative size-24 mx-auto flex items-center justify-center">
                    {/* Outer Rotating Ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-amber-500 border-b-orange-600 border-l-transparent animate-spin" />
                    
                    {/* Inner Glowing Badge */}
                    <div className="size-16 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-600/40 text-white animate-pulse">
                        <span className="text-3xl select-none">🍢</span>
                    </div>

                    <div className="absolute -bottom-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-full shadow-md">
                        <Sparkles className="size-3.5 fill-current" />
                    </div>
                </div>

                {/* Message Section */}
                <div className="space-y-2 relative z-10">
                    <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest rounded-full">
                        PinchoListo System
                    </span>
                    <h3 className="text-lg font-black text-white tracking-tight leading-snug">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                        {subtitle}
                    </p>
                </div>

                {/* Progress bar simulation */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                    <div className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 h-full w-2/3 rounded-full animate-pulse" />
                </div>
            </div>
        </div>
    );
}
