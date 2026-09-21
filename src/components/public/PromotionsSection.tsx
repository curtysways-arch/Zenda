'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Calendar, X, Check, Sparkles, Flame, Info } from 'lucide-react';
import { useState, useRef } from 'react';
import { getServicePrimaryImage } from '../../lib/serviceImageHelper';

interface PromotionsSectionProps {
    promociones: any[];
    slug: string;
    primaryColor?: string;
    tertiaryColor?: string;
    textColor?: string;
    showPrices?: boolean;
    totalServicesCount?: number;
    isGym?: boolean;
}

export default function PromotionsSection({ 
    promociones, 
    slug, 
    primaryColor = '#e21d6e',
    tertiaryColor = '#7B68EE',
    textColor = '#000000',
    showPrices = true,
    totalServicesCount = 0,
    isGym = false
}: PromotionsSectionProps) {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedPromoServices, setSelectedPromoServices] = useState<any | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!promociones || promociones.length === 0) return null;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const scrollLeft = container.scrollLeft;
        const width = container.offsetWidth;
        
        const cardElement = container.querySelector('.snap-center');
        const cardWidth = cardElement?.getBoundingClientRect().width || width;
        const gap = 16;
        const step = cardWidth + gap;
        
        const newIndex = Math.round(scrollLeft / step);
        if (newIndex >= 0 && newIndex < promociones.length && newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    };

    // Obtener badge dinámico según la fecha de creación y expiración de la promoción
    const getPromoTag = (promo: any, index: number) => {
        const now = new Date();
        const created = new Date(promo.createdAt || now);
        const ends = new Date(promo.fechaFin);
        const diffCreatedDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        const diffEndsDays = (ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (diffCreatedDays <= 3) return 'Nuevo';
        if (diffEndsDays > 0 && diffEndsDays <= 3) return 'Últimos días';
        if (promo.tipoPromo === '2x1' || promo.tipoPromo === '3x1') return 'Oferta limitada';
        if (promo.tipoPromo === 'INSCRIPCION_GRATIS') return 'Regalo';
        if (promo.tipoPromo === 'MATRICULA_GRATIS') return 'Sin matrícula';
        
        const staticTags = ["Oferta limitada", "Más reservado", "Exclusivo", "Popular"];
        return staticTags[index % staticTags.length];
    };

    // Obtener imagen de la promoción (prioriza configurada, fallback a la primera del servicio)
    const getPromoImage = (promo: any) => {
        if (promo.imagenUrl) return promo.imagenUrl;
        if (promo.imageMedia?.url) return promo.imageMedia.url;
        if (promo.services && promo.services.length > 0) {
            return getServicePrimaryImage(promo.services[0]);
        }
        return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800';
    };

    return (
        <div className="space-y-4 select-none relative">
            {/* Animaciones CSS personalizadas integradas para mantener el dinamismo premium */}
            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes soft-pulse {
                    0%, 100% {
                        transform: scale(1);
                        filter: drop-shadow(0 2px 6px rgba(226, 29, 110, 0.15));
                    }
                    50% {
                        transform: scale(1.04);
                        filter: drop-shadow(0 4px 12px rgba(226, 29, 110, 0.35));
                    }
                }
                .animate-shimmer {
                    position: relative;
                    overflow: hidden;
                }
                .animate-shimmer::after {
                    position: absolute;
                    top: 0; right: 0; bottom: 0; left: 0;
                    transform: translateX(-100%);
                    background-image: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.25) 20%,
                        rgba(255, 255, 255, 0.6) 60%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    animation: shimmer 3s infinite;
                    content: '';
                }
                .animate-soft-pulse {
                    animation: soft-pulse 2.2s infinite ease-in-out;
                    display: inline-block;
                }
            `}</style>

            {/* Cabecera con padding lateral de 24px */}
            <div className="flex items-center justify-between px-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-1.5">
                    ✨ PROMOCIONES DESTACADAS
                </span>
            </div>
            
            {/* Carrusel snap scroll horizontal */}
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none px-6 pb-4"
                style={{
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {promociones.map((promo: any, index: number) => {
                    const servicesList = promo.services || [];
                    const promoServicesCount = servicesList.length;

                    // Parsear descripción y metadatos de CITIOX_META
                    let cleanDescription = promo.descripcion || '';
                    let meta: any = null;
                    if (cleanDescription.includes('<!-- CITIOX_META:')) {
                        const parts = cleanDescription.split('<!-- CITIOX_META:');
                        cleanDescription = parts[0].trim();
                        try {
                            meta = JSON.parse(parts[1].split('-->')[0].trim());
                        } catch (_) {}
                    }

                    const promoIsGym = isGym || 
                        promo.tipoPromo?.includes('MEMBRESIA') || 
                        promo.tipoPromo === 'MATRICULA_GRATIS' || 
                        promo.tipoPromo === 'INSCRIPCION_GRATIS' ||
                        Boolean(meta?.membershipPlanId) ||
                        Boolean(meta?.benefitType);

                    // 1. Resolver etiqueta dinámica "Aplica para"
                    let appliesToText = '';
                    let showVerServiciosLink = false;

                    if (promoIsGym) {
                        if (meta?.benefitType === 'INSCRIPCION_GRATIS') {
                            appliesToText = 'Cualquier Membresía';
                        } else if (meta?.benefitType === 'MATRICULA_GRATIS') {
                            appliesToText = 'Plan Trimestral';
                        } else if (meta?.membershipPlanId) {
                            appliesToText = 'Plan de Membresía';
                        } else {
                            appliesToText = 'Planes de Gimnasio';
                        }
                    } else {
                        const isAll = totalServicesCount > 0 && promoServicesCount === totalServicesCount;
                        if (isAll || promoServicesCount === 0) {
                            appliesToText = 'Todos los servicios';
                        } else if (promoServicesCount === 1) {
                            appliesToText = servicesList[0]?.nombre || '1 servicio incluido';
                        } else if (promoServicesCount === 2) {
                            appliesToText = `${servicesList[0]?.nombre} + ${servicesList[1]?.nombre}`;
                        } else {
                            appliesToText = `${promoServicesCount} servicios seleccionados`;
                            showVerServiciosLink = true;
                        }
                    }

                    // 2. Resolver porcentaje o tipo de descuento sin errores de 30% en $0
                    const numPromoPrice = promo.precioPromo !== null && promo.precioPromo !== undefined ? Number(promo.precioPromo) : null;
                    const precioAnteriorBase = promo.precioAnterior || (promoServicesCount > 0 ? servicesList.reduce((acc: number, s: any) => acc + (s.precio || 0), 0) : 0);

                    let discountNumber = 'PROMO';
                    let discountSublabel = 'ESPECIAL';

                    if (
                        meta?.benefitType === 'INSCRIPCION_GRATIS' || 
                        meta?.benefitType === 'MATRICULA_GRATIS' || 
                        promo.tipoPromo === 'INSCRIPCION_GRATIS' || 
                        promo.tipoPromo === 'MATRICULA_GRATIS' || 
                        (numPromoPrice === 0 && precioAnteriorBase > 0)
                    ) {
                        discountNumber = '100%';
                        discountSublabel = meta?.benefitType === 'MATRICULA_GRATIS' ? 'MATRÍCULA GRATIS' : 'DE REGALO';
                    } else if (meta?.benefitType === 'DESCUENTO_PORCENTAJE' && meta?.discountValue) {
                        discountNumber = `${meta.discountValue}%`;
                        discountSublabel = 'DESCUENTO';
                    } else if (precioAnteriorBase > 0 && numPromoPrice !== null) {
                        const calculatedDiscount = Math.round(((precioAnteriorBase - numPromoPrice) / precioAnteriorBase) * 100);
                        if (calculatedDiscount >= 100) {
                            discountNumber = '100%';
                            discountSublabel = 'DE REGALO';
                        } else if (calculatedDiscount > 0) {
                            discountNumber = `${calculatedDiscount}%`;
                            discountSublabel = 'DESCUENTO';
                        } else {
                            discountNumber = 'OFERTA';
                            discountSublabel = 'ESPECIAL';
                        }
                    } else if (meta?.benefitType === 'DESCUENTO_FIJO' && meta?.discountValue) {
                        discountNumber = `$${meta.discountValue}`;
                        discountSublabel = 'DE AHORRO';
                    } else if (promo.tipoPromo === '2x1' || promo.tipoPromo === '3x1') {
                        discountNumber = promo.tipoPromo;
                        discountSublabel = 'OFERTA';
                    }

                    // 3. Calcular Ahorro real
                    let ahorroVal = 0;
                    if (precioAnteriorBase > 0 && numPromoPrice !== null && precioAnteriorBase > numPromoPrice) {
                        ahorroVal = precioAnteriorBase - numPromoPrice;
                    }

                    // 4. Formatear vigencia
                    const dateStr = promo.fechaFin 
                        ? `${new Date(promo.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` 
                        : 'Limitado';

                    const currentTag = getPromoTag(promo, index);
                    const promoImg = getPromoImage(promo);

                    return (
                        <div
                            key={promo.id}
                            onClick={() => router.push(`/${slug}/promo/${promo.id}`)}
                            className="group bg-white border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-5 flex cursor-pointer snap-center w-[85vw] sm:w-[500px] shrink-0 min-h-[220px] sm:min-h-[240px] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] active:scale-[0.99] transition-all duration-500 gap-4 relative overflow-hidden"
                        >
                            {/* LADO IZQUIERDO: Información y Descuento (Aprox. 55% - 60% de la tarjeta) */}
                            <div className="flex-1 flex flex-col justify-between min-w-0 pr-1 select-none">
                                <div className="space-y-2">
                                    {/* Badge Superior */}
                                    <div className="flex items-center">
                                        <span 
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider shadow-sm border border-slate-200/60"
                                            style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                                        >
                                            <Flame size={9} className="fill-current animate-bounce" />
                                            {promoIsGym ? 'BENEFICIO FITNESS' : 'PROMOCIÓN ESPECIAL'}
                                        </span>
                                    </div>

                                    {/* Descuento Enorme (Protagonista) */}
                                    <div className="animate-soft-pulse" style={{ '--pulse-color': `${primaryColor}40` } as any}>
                                        <div className="flex items-baseline gap-1.5">
                                            <span 
                                                className="text-4xl sm:text-5xl font-black tracking-tighter leading-none"
                                                style={{ color: primaryColor }}
                                            >
                                                {discountNumber}
                                            </span>
                                            <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-[0.15em] text-slate-800">
                                                {discountSublabel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Título y descripción limpia */}
                                    <div className="space-y-1 pt-0.5">
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug uppercase tracking-tight line-clamp-1">
                                            {promo.titulo}
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-600 font-semibold leading-snug line-clamp-2 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-lg mt-1">
                                            {cleanDescription || 'Promoción especial por tiempo limitado para nuevos miembros.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Precio Promocional */}
                                {showPrices && numPromoPrice !== null && (
                                    <div className="flex items-baseline gap-2 pt-1">
                                        <span className="text-xl sm:text-2xl font-black italic tracking-tighter" style={{ color: primaryColor }}>
                                            {numPromoPrice === 0 ? '¡GRATIS!' : `$${numPromoPrice.toFixed(0)}`}
                                        </span>
                                        {precioAnteriorBase > numPromoPrice && (
                                            <span className="text-xs font-bold text-slate-400 line-through">
                                                ${precioAnteriorBase.toFixed(0)}
                                            </span>
                                        )}
                                        {numPromoPrice === 0 && precioAnteriorBase > 0 && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 tracking-wider">
                                                Ahorro 100%
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Servicio o Plan Resaltado */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 max-w-full">
                                        <Sparkles size={10} className="text-amber-500 shrink-0" />
                                        <span className="text-[9.5px] sm:text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                                            {appliesToText}
                                        </span>
                                    </div>
                                    {!promoIsGym && showVerServiciosLink && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPromoServices(promo);
                                            }}
                                            className="text-[9px] sm:text-[9.5px] font-black underline hover:opacity-80 transition-all cursor-pointer border-0 bg-transparent p-0 leading-none shrink-0"
                                            style={{ color: primaryColor }}
                                        >
                                            + Ver más
                                        </button>
                                    )}
                                </div>

                                {/* Bottom Info y Botón de reserva */}
                                <div className="flex items-center justify-between border-t border-slate-100/80 pt-2.5 mt-2">
                                    {/* Vigencia */}
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Calendar size={11} className="shrink-0" />
                                        <span className="text-[9px] sm:text-[9.5px] font-bold">
                                            Hasta {dateStr}
                                        </span>
                                    </div>

                                    {/* Botón Reservar / Ver Membresía */}
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (promoIsGym) {
                                                router.push(`/${slug}?promo=${promo.id}#planes`);
                                            } else {
                                                router.push(`/${slug}/promo/${promo.id}`);
                                            }
                                        }}
                                        className="inline-flex items-center justify-center gap-1 px-4.5 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest text-white shadow-md active:scale-105 hover:scale-[1.02] transition-all duration-300 border-0 cursor-pointer"
                                        style={{ 
                                            backgroundColor: primaryColor,
                                            boxShadow: `0 8px 16px ${primaryColor}25`
                                        }}
                                    >
                                        {promoIsGym ? 'Ver Membresía' : 'Reservar ahora'}
                                        <ChevronRight size={10} strokeWidth={3.5} />
                                    </button>
                                </div>
                            </div>

                            {/* LADO DERECHO: Imagen del servicio promocionado con curva premium (Aprox. 40%) */}
                            <div className="w-[38%] sm:w-[40%] shrink-0 relative rounded-[20px] overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                                <img
                                    src={promoImg}
                                    alt={promo.titulo}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none"
                                />

                                {/* Gradiente oscuro abajo para contraste */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

                                {/* Badge Dinámico con Brillo Sutil */}
                                <span className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/95 text-slate-800 rounded-lg text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest shadow-md border border-white/80 animate-shimmer leading-none">
                                    {currentTag}
                                </span>

                                {/* Badge de Ahorro Real Dinámico si corresponde */}
                                {ahorroVal > 0 && showPrices && (
                                    <span 
                                        className="absolute bottom-2.5 left-2.5 right-2.5 text-center py-1.5 rounded-xl text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-white shadow-lg backdrop-blur-[2px] leading-none"
                                        style={{ 
                                            background: `linear-gradient(135deg, ${primaryColor}E0 0%, color-mix(in srgb, ${primaryColor}, #000 15%)E0 100%)`
                                        }}
                                    >
                                        Ahorra ${ahorroVal.toFixed(0)}
                                    </span>
                                )}
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
                                const cardWidth = cardElement?.getBoundingClientRect().width || container.offsetWidth;
                                const gap = 16;
                                container.scrollTo({
                                    left: idx * (cardWidth + gap),
                                    behavior: 'smooth'
                                });
                                setActiveIndex(idx);
                            }
                        }}
                        className="size-2 rounded-full transition-all duration-300 border-0 p-0 cursor-pointer"
                        style={{
                            width: idx === activeIndex ? '16px' : '8px',
                            backgroundColor: idx === activeIndex ? primaryColor : '#cbd5e1'
                        }}
                    />
                ))}
            </div>

            {/* MODAL: Listar servicios de la promoción */}
            {selectedPromoServices && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedPromoServices(null)}>
                    <div 
                        className="bg-white rounded-[2rem] border border-slate-100 w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <div>
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    Servicios Incluidos
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 line-clamp-1">
                                    {selectedPromoServices.titulo}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPromoServices(null)}
                                className="size-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border-0 cursor-pointer"
                            >
                                <X size={14} className="stroke-[3]" />
                            </button>
                        </div>

                        {/* Listado */}
                        <div className="max-h-60 overflow-y-auto pr-1 scrollbar-thin space-y-2">
                            {selectedPromoServices.services?.map((service: any) => {
                                const svcImg = getServicePrimaryImage(service);
                                return (
                                    <div 
                                        key={service.id} 
                                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-50"
                                    >
                                        <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                                            <img src={svcImg} alt={service.nombre} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[11px] font-black text-slate-800 truncate uppercase">
                                                {service.nombre}
                                            </h4>
                                            <p className="text-[9px] text-slate-400 font-medium">
                                                ⏳ {service.duracion || 60} mins
                                            </p>
                                        </div>
                                        {showPrices && service.precio !== undefined && (
                                            <span className="text-[11px] font-black text-slate-800">
                                                ${service.precio}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer / CTA */}
                        <div className="pt-2 border-t border-slate-50 flex justify-end">
                            <button
                                onClick={() => {
                                    const id = selectedPromoServices.id;
                                    setSelectedPromoServices(null);
                                    router.push(`/${slug}/promo/${id}`);
                                }}
                                className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-0"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Reservar promoción
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
