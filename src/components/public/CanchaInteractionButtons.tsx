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
        <div className="flex items-center gap-1 relative">
            <button 
                type="button"
                onClick={handleShare}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95 cursor-pointer"
                title="Compartir"
            >
                <Share2 size={20} />
            </button>
            {justCopied && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-max bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    Enlace copiado!
                </div>
            )}
            <button 
                type="button"
                onClick={toggleFavorite}
                className={`p-2 rounded-xl transition-colors active:scale-95 cursor-pointer ${
                    isFavorite 
                        ? 'text-rose-500 hover:bg-rose-500/10' 
                        : 'text-white/50 hover:text-rose-400 hover:bg-white/10'
                }`}
                title="Favorito"
            >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "scale-110 transition-transform" : "scale-100 transition-transform"} />
            </button>
        </div>
    );
}
