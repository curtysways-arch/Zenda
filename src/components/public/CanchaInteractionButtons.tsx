"use client";

import { Share2, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
    canchaId: string;
    canchaNombre: string;
    negocioNombre: string;
}

export default function CanchaInteractionButtons({ canchaId, canchaNombre, negocioNombre }: Props) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [justCopied, setJustCopied] = useState(false);

    useEffect(() => {
        const favorites = JSON.parse(localStorage.getItem('favorite_canchas') || '[]');
        if (favorites.includes(canchaId)) {
            setIsFavorite(true);
        }
    }, [canchaId]);

    const handleShare = async () => {
        const shareData = {
            title: `${canchaNombre} en ${negocioNombre}`,
            text: `¡Mira esta cancha: ${canchaNombre} en ${negocioNombre}!`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setJustCopied(true);
                setTimeout(() => setJustCopied(false), 2000);
            }
        } catch (err) {
            console.error('Error al compartir:', err);
        }
    };

    const toggleFavorite = () => {
        const favorites = JSON.parse(localStorage.getItem('favorite_canchas') || '[]');
        let newFavorites;
        
        if (isFavorite) {
            newFavorites = favorites.filter((id: string) => id !== canchaId);
        } else {
            newFavorites = [...favorites, canchaId];
        }
        
        localStorage.setItem('favorite_canchas', JSON.stringify(newFavorites));
        setIsFavorite(!isFavorite);
    };

    return (
        <div className="flex items-center gap-2 relative">
            <button 
                type="button"
                onClick={handleShare}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center border border-white/10 transition-all cursor-pointer shadow-sm"
                title="Compartir"
            >
                <Share2 size={18} className="text-white" />
            </button>
            {justCopied && (
                <div className="absolute top-11 right-0 w-max bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    Enlace copiado!
                </div>
            )}
            <button 
                type="button"
                onClick={toggleFavorite}
                className={`size-9 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isFavorite 
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' 
                        : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
                title="Favorito"
            >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "scale-110 text-rose-500 transition-transform" : "text-white transition-transform"} />
            </button>
        </div>
    );
}
