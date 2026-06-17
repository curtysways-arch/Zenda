'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { FeatureFlag } from '@/lib/features';
import Link from 'next/link';

interface FeatureGateProps {
    feature: FeatureFlag;
    children: React.ReactNode;
    fallbackMessage?: string;
}

export default function FeatureGate({ feature, children, fallbackMessage }: FeatureGateProps) {
    const [hasFeature, setHasFeature] = useState<boolean | null>(null);

    useEffect(() => {
        // Cache the features in session storage to avoid spamming the API
        const cached = sessionStorage.getItem('business_features');
        if (cached) {
            const features = JSON.parse(cached);
            setHasFeature(!!features[feature]);
            return;
        }

        fetch('/api/features')
            .then(res => res.json())
            .then(data => {
                sessionStorage.setItem('business_features', JSON.stringify(data));
                setHasFeature(!!data[feature]);
            })
            .catch(() => {
                setHasFeature(false);
            });
    }, [feature]);

    if (hasFeature === null) {
        return (
            <div className="relative animate-pulse opacity-50 pointer-events-none">
                {children}
            </div>
        );
    }

    if (hasFeature) {
        return <>{children}</>;
    }

    return (
        <div className="relative group rounded-3xl overflow-hidden">
            <div className="opacity-40 grayscale pointer-events-none transition-all duration-300">
                {children}
            </div>
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center text-center gap-3 transform transition-transform group-hover:scale-105">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-1">
                        <Lock size={20} className="stroke-[2.5px]" />
                    </div>
                    <div>
                        <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">
                            Función Premium
                        </h4>
                        <p className="text-gray-400 text-xs mt-1 max-w-[200px]">
                            {fallbackMessage || "Actualiza a un plan superior para desbloquear esta funcionalidad."}
                        </p>
                    </div>
                    <Link href="/admin/plan" className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest transition-colors shadow-lg shadow-amber-500/30">
                        Mejorar Plan
                    </Link>
                </div>
            </div>
        </div>
    );
}
