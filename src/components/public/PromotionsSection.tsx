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
        <div className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-8 rounded-full" style={{ backgroundColor: tertiaryColor }}></div>
                 <h3 className="text-2xl font-black tracking-tight italic" style={{ color: textColor }}>Ofertas Especiales</h3>
            </div>
            
            <div className="flex flex-col gap-4">
                {promociones.map((promo: any) => (
                    <div
                        key={promo.id}
                        onClick={() => router.push(`/${slug}/promo/${promo.id}`)}
                        className="group bg-card-dynamic rounded-[2rem] shadow-sm overflow-hidden flex flex-row cursor-pointer relative transition-all active:scale-[0.98] h-32"
                    >
                        {/* Imagen Container - Lado Izquierdo */}
                        <div className="relative w-32 shrink-0 overflow-hidden">
                            <img
                                src={promo.imagenUrl}
                                alt={promo.titulo}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                        </div>

                        {/* Contenido - Lado Derecho */}
                        <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                            <div className="space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-sm font-black uppercase tracking-tight truncate flex-1" style={{ color: textColor }}>
                                        {promo.titulo}
                                    </h4>
                                    {showPrices && (
                                        <div className="text-right shrink-0 flex flex-col items-end">
                                            <span className="text-3xl font-black tracking-tighter" style={{ color: primaryColor }}>${promo.precioPromo}</span>
                                            {promo.precioAnterior && (
                                                <span className="text-xs font-bold text-gray-400 line-through leading-none decoration-gray-400/50">${promo.precioAnterior}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-400 text-[10px] font-bold line-clamp-2 leading-tight uppercase tracking-wide">
                                    {promo.descripcion}
                                </p>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <div className="flex gap-2">
                                    {((promo.diasValidos && promo.diasValidos.split(',').length < 7) || (promo.horaInicioValida || promo.horaFinValida)) && (
                                        <div className="bg-amber-50 text-amber-600 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-100 flex items-center gap-1">
                                            <Clock size={10} /> Horario Especial
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: primaryColor }}>
                                    RESERVAR <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
