'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PromotionsSectionProps {
    promociones: any[];
    slug: string;
    primaryColor?: string;
    tertiaryColor?: string;
    textColor?: string;
    showPrices?: boolean;
}

export default function PromotionsSection({ 
    promociones, 
    slug, 
    primaryColor = '#e21d6e',
    tertiaryColor = '#7B68EE',
    textColor = '#000000',
    showPrices = true
}: PromotionsSectionProps) {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!promociones || promociones.length === 0) return null;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const scrollLeft = container.scrollLeft;
        const width = container.offsetWidth;
        
        // Ajustamos la estimación de índice basado en el ancho visible de la tarjeta + gap
        // Cada tarjeta es w-[84%] de la pantalla, más gap-4 (16px)
        const cardWidth = container.querySelector('.snap-center')?.getBoundingClientRect().width || (width * 0.84);
        const gap = 16;
        const step = cardWidth + gap;
        
        const newIndex = Math.round(scrollLeft / step);
        if (newIndex >= 0 && newIndex < promociones.length && newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    };

    return (
        <div className="space-y-3.5 select-none">
            {/* Cabecera con padding lateral de 24px (px-6) */}
            <div className="flex items-center justify-between px-6">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>PROMOCIONES DESTACADAS</span>
            </div>
            
            {/* Carrusel de desplazamiento horizontal con Snap Scroll */}
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none px-6 pb-2"
                style={{
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {promociones.map((promo: any, index: number) => {
                    let discountText = '30%';
                    if (promo.precioAnterior && promo.precioPromo) {
                        const desc = Math.round(((Number(promo.precioAnterior) - Number(promo.precioPromo)) / Number(promo.precioAnterior)) * 100);
                        if (desc > 0) discountText = `${desc}%`;
                    }

                    const dateStr = promo.fechaFin 
                        ? `Válido hasta el ${new Date(promo.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` 
                        : 'Promoción por tiempo limitado';

                    const tags = ["Nuevo", "Popular", "Últimos días", "Exclusivo"];
                    const currentTag = tags[index % tags.length];

                    return (
                        <div
                            key={promo.id}
                            onClick={() => router.push(`/${slug}/promo/${promo.id}`)}
                            className="group bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[24px] p-3 flex items-center cursor-pointer snap-center w-[84%] shrink-0 h-[120px] hover:scale-[1.01] hover:shadow-[0_6px_25px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all duration-300 gap-3"
                        >
                            {/* Lado izquierdo: Imagen fija tamaño 20 (size-20) */}
                            <div className="relative size-20 shrink-0 rounded-2xl overflow-hidden bg-slate-50">
                                <img
                                    src={promo.imagenUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                                    alt={promo.titulo}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                
                                {/* Badge circular rosa */}
                                <div className="absolute top-1 left-1 bg-pink-500 text-white rounded-full size-8 flex flex-col items-center justify-center shadow-md border border-white/80 select-none">
                                    <span className="text-[9px] font-black leading-none">{discountText}</span>
                                    <span className="text-[5.5px] font-black leading-none mt-0.5">OFF</span>
                                </div>
                            </div>

                            {/* Lado derecho: Contenido en formato de columna compacta vertical */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                                <div className="flex items-center gap-1">
                                    {currentTag && (
                                        <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-md text-[7.5px] font-black uppercase tracking-widest border border-pink-100/20 leading-none">
                                            {currentTag}
                                        </span>
                                    )}
                                </div>
                                
                                <h4 className="text-[13px] font-black text-slate-800 leading-tight uppercase tracking-tight truncate">
                                    {promo.titulo}
                                </h4>
                                
                                <p className="text-slate-400 text-[9.5px] font-bold leading-none">
                                    {dateStr}
                                </p>

                                <div className="pt-0.5">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/${slug}/promo/${promo.id}`);
                                        }}
                                        className="inline-flex items-center justify-center gap-1 px-4.5 py-1.5 rounded-full font-black text-[8px] uppercase tracking-widest text-white shadow-sm transition-all duration-300 hover:brightness-110 active:scale-95 leading-none"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Reservar ahora
                                        <ChevronRight size={8} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Indicador del carrusel (dots) */}
            <div className="flex justify-center gap-2 mt-1 select-none">
                {promociones.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            if (scrollRef.current) {
                                const container = scrollRef.current;
                                const cardElement = container.querySelector('.snap-center');
                                const cardWidth = cardElement?.getBoundingClientRect().width || (container.offsetWidth * 0.84);
                                const gap = 16;
                                container.scrollTo({
                                    left: idx * (cardWidth + gap),
                                    behavior: 'smooth'
                                });
                                setActiveIndex(idx);
                            }
                        }}
                        className="size-2 rounded-full transition-all duration-300"
                        style={{
                            width: idx === activeIndex ? '16px' : '8px',
                            backgroundColor: idx === activeIndex ? primaryColor : '#cbd5e1'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
