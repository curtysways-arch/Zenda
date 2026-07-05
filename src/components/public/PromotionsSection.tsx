'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

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
    primaryColor = '#e21d6e', // Color predeterminado (rosado/fucsia de spa)
    tertiaryColor = '#7B68EE',
    textColor = '#000000',
    showPrices = true
}: PromotionsSectionProps) {
    const router = useRouter();

    if (!promociones || promociones.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            {promociones.map((promo: any) => {
                let discountText = '30%';
                if (promo.precioAnterior && promo.precioPromo) {
                    const desc = Math.round(((Number(promo.precioAnterior) - Number(promo.precioPromo)) / Number(promo.precioAnterior)) * 100);
                    if (desc > 0) discountText = `${desc}%`;
                }

                const dateStr = promo.fechaFin 
                    ? `Válido hasta el ${new Date(promo.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` 
                    : 'Promoción por tiempo limitado';

                return (
                    <div
                        key={promo.id}
                        onClick={() => router.push(`/${slug}/promo/${promo.id}`)}
                        className="group bg-[#FFF2F6] border border-pink-100/30 rounded-[2.2rem] p-5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] gap-4"
                    >
                        {/* Lado izquierdo: Imagen redonda con badge circular encima */}
                        <div className="relative shrink-0 flex items-center">
                            <img
                                src={promo.imagenUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                                alt={promo.titulo}
                                className="w-16 h-16 rounded-full object-cover border border-pink-100/50 shadow-sm bg-white"
                            />
                            {/* Badge circular rosa que sobresale */}
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 bg-pink-500 text-white rounded-full w-12 h-12 flex flex-col items-center justify-center shadow-md border-2 border-white select-none">
                                <span className="text-[12px] font-black leading-none">{discountText}</span>
                                <span className="text-[8px] font-black leading-none mt-0.5">OFF</span>
                            </div>
                        </div>

                        {/* Lado medio: Títulos y validez */}
                        <div className="flex-1 min-w-0 space-y-0.5 ml-2">
                            <div className="flex items-center gap-1 text-pink-500 text-[9px] font-black uppercase tracking-widest">
                                <span>*</span>
                                <span>PROMOCIÓN DE ESTA SEMANA</span>
                            </div>
                            <h4 className="text-base font-black truncate leading-snug text-slate-800">
                                {promo.titulo}
                            </h4>
                            <p className="text-slate-400 text-[10px] font-semibold">
                                {dateStr}
                            </p>
                        </div>

                        {/* Lado derecho: Botón */}
                        <button 
                            className="shrink-0 flex items-center justify-center gap-1 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-sm transition-all group-hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Reservar ahora
                            <ChevronRight size={12} strokeWidth={3} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
