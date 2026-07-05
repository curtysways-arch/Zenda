'use client';

import Link from 'next/link';
import { Share2, Calendar, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
    primaryColor = '#1dc95c',
    tertiaryColor = '#7B68EE',
    textColor = '#000000',
    showPrices = true
}: PromotionsSectionProps) {
    const router = useRouter();

    if (!promociones || promociones.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>PROMOCIONES DESTACADAS</span>
            </div>
            
            <div className="flex flex-col gap-4">
                {promociones.map((promo: any) => {
                    let discountText = 'OFERTA';
                    if (promo.precioAnterior && promo.precioPromo) {
                        const desc = Math.round(((Number(promo.precioAnterior) - Number(promo.precioPromo)) / Number(promo.precioAnterior)) * 100);
                        if (desc > 0) discountText = `${desc}% OFF`;
                    }

                    const dateStr = promo.fechaFin 
                        ? `Válido hasta el ${new Date(promo.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` 
                        : 'Promoción por tiempo limitado';

                    return (
                        <div
                            key={promo.id}
                            onClick={() => router.push(`/${slug}/promo/${promo.id}`)}
                            className="group bg-[#FFF5F8] border border-pink-100/50 rounded-[2.2rem] shadow-sm overflow-hidden flex items-center justify-between cursor-pointer relative transition-all active:scale-[0.98] p-4 gap-4"
                        >
                            {/* Lado izquierdo: Imagen redonda con badge de descuento */}
                            <div className="relative size-20 shrink-0 rounded-2xl overflow-hidden">
                                <img
                                    src={promo.imagenUrl}
                                    alt={promo.titulo}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-pink-500/10" />
                                
                                {/* Badge circular de descuento encimado */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                                    <span className="text-[10px] font-black text-white bg-pink-500 px-2 py-1 rounded-full shadow-md whitespace-nowrap">
                                        {discountText}
                                    </span>
                                </div>
                            </div>

                            {/* Lado medio: Títulos y validez */}
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 text-pink-500 text-[8px] font-black uppercase tracking-widest">
                                    <Sparkles size={10} fill="currentColor" />
                                    PROMOCIÓN DE LA SEMANA
                                </div>
                                <h4 className="text-base font-black truncate leading-snug" style={{ color: textColor }}>
                                    {promo.titulo}
                                </h4>
                                <p className="text-slate-400 text-[10px] font-bold">
                                    {dateStr}
                                </p>
                            </div>

                            {/* Lado derecho: Botón */}
                            <button 
                                className="shrink-0 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-white shadow-sm transition-all group-hover:brightness-110 active:scale-95"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Reservar promoción
                                <ArrowRight size={10} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
