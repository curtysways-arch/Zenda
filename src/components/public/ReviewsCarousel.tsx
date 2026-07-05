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
        <div className="bg-[#FFF8F6] rounded-[2.5rem] p-8 relative overflow-hidden border border-pink-500/5 shadow-sm text-center">
            {/* Quote Icon */}
            <div className="text-left mb-2">
                <span className="text-6xl font-serif font-black leading-none select-none opacity-20 block h-6" style={{ color: primaryColor }}>
                    “
                </span>
            </div>

            {/* Testimonial Text */}
            <p className="text-sm font-medium text-slate-700 leading-relaxed italic px-4 min-h-[60px]">
                "{currentReview.comment}"
            </p>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mt-6 mb-5">
                {reviews.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === activeIndex ? 'w-6' : 'w-1.5'
                        }`}
                        style={{
                            backgroundColor: idx === activeIndex ? primaryColor : '#cbd5e1'
                        }}
                    />
                ))}
            </div>

            {/* Author info */}
            <div className="flex items-center justify-center gap-3.5 pt-2">
                {clientAvatar ? (
                    <img 
                        src={clientAvatar} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                        alt={clientName}
                    />
                ) : (
                    <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm border-2 border-white shadow-md"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {clientName.substring(0, 1)}
                    </div>
                )}
                <div className="text-left">
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                                key={i}
                                size={12}
                                className={i < currentReview.stars ? "text-amber-400" : "text-slate-200"}
                                fill={i < currentReview.stars ? "currentColor" : "none"}
                            />
                        ))}
                    </div>
                    <p className="text-xs font-black text-slate-800 tracking-tight leading-none">
                        {clientName}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
                        Cliente feliz
                    </p>
                </div>
            </div>
        </div>
    );
}
