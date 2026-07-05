'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface Review {
    id: string;
    comment: string | null;
    stars: number;
    appointment?: {
        cliente?: {
            nombre?: string;
            avatar?: string;
        } | null;
    } | null;
}

interface ReviewsCarouselProps {
    reviews: Review[];
    primaryColor: string;
    textColor: string;
}

export default function ReviewsCarousel({ reviews, primaryColor, textColor }: ReviewsCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    if (reviews.length === 0) return null;

    const currentReview = reviews[activeIndex];
    const clientName = currentReview.appointment?.cliente?.nombre || 'Cliente feliz';
    const clientAvatar = currentReview.appointment?.cliente?.avatar || '';

    return (
        <div className="select-none">
            {/* Testimonial Card */}
            <div className="bg-[#FFF2F6] border border-pink-100/30 rounded-[2rem] p-5 flex flex-row items-center justify-between shadow-sm relative gap-4">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Icono de Comillas Rosa */}
                    <span className="text-3xl font-serif font-black leading-none select-none text-pink-500 block shrink-0 pt-0.5">
                        “
                    </span>
                    {/* Comentario */}
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed italic pr-1">
                        {currentReview.comment}
                    </p>
                </div>

                {/* Sección Derecha: Autor e Información */}
                <div className="flex items-center gap-3 shrink-0 pl-3 border-l border-slate-200/50">
                    <div className="text-right">
                        {/* Estrellas doradas */}
                        <div className="flex gap-0.5 mb-1 justify-end">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                    key={i}
                                    size={10}
                                    className={i < currentReview.stars ? "text-amber-400" : "text-slate-200"}
                                    fill={i < currentReview.stars ? "currentColor" : "none"}
                                />
                            ))}
                        </div>
                        <p className="text-xs font-black text-slate-800 leading-none">
                            {clientName}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider leading-none">
                            Cliente feliz
                        </p>
                    </div>
                    
                    {/* Avatar del cliente */}
                    {clientAvatar ? (
                        <img 
                            src={clientAvatar} 
                            className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                            alt={clientName}
                        />
                    ) : (
                        <div 
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-xs border-2 border-white shadow-sm shrink-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {clientName.substring(0, 1)}
                        </div>
                    )}
                </div>
            </div>

            {/* Puntos Indicadores */}
            {reviews.length > 1 && (
                <div className="flex justify-center gap-2 mt-3 select-none">
                    {reviews.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className="size-1.5 rounded-full transition-all duration-300"
                            style={{
                                width: idx === activeIndex ? '12px' : '6px',
                                backgroundColor: idx === activeIndex ? primaryColor : '#cbd5e1'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
