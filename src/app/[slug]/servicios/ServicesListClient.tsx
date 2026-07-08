'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Heart, Clock, Star, Droplet, Sparkles } from 'lucide-react';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';

interface ServicesListClientProps {
    services: any[];
    slug: string;
    primaryColor: string;
    textColor: string;
    neutralColor: string;
    nextAppointment?: any;
}

export default function ServicesListClient({
    services,
    slug,
    primaryColor,
    textColor,
    neutralColor,
    nextAppointment,
}: ServicesListClientProps) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [filterOnlyFavorites, setFilterOnlyFavorites] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Cargar favoritos de localStorage en el montaje
    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem(`fav_services_${slug}`);
        if (stored) {
            try {
                setFavorites(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing stored favorites:", e);
            }
        }
    }, [slug]);

    // Función para alternar favorito
    const toggleFavorite = (serviceId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Evitar que el clic active la redirección del contenedor
        event.preventDefault();

        let updated: string[];
        if (favorites.includes(serviceId)) {
            updated = favorites.filter(id => id !== serviceId);
        } else {
            updated = [...favorites, serviceId];
        }

        setFavorites(updated);
        localStorage.setItem(`fav_services_${slug}`, JSON.stringify(updated));
    };

    // Helper para calificar el beneficio del servicio
    const getServiceBenefit = (nombre: string) => {
        const lower = nombre.toLowerCase();
        if (lower.includes('hidratación') || lower.includes('gel')) {
            return 'Ideal para piel seca y deshidratada';
        }
        if (lower.includes('facial') || lower.includes('limpieza') || lower.includes('cutis')) {
            return 'Piel más limpia, fresca y luminosa';
        }
        if (lower.includes('masaje') || lower.includes('relax') || lower.includes('piedras')) {
            return 'Reduce el estrés y mejora la circulación';
        }
        if (lower.includes('exfoliación') || lower.includes('corporal')) {
            return 'Estimula la renovación celular de la piel';
        }
        if (lower.includes('barba') || lower.includes('corte')) {
            return 'Corte y perfilado con acabado premium';
        }
        if (lower.includes('manicura') || lower.includes('uñas') || lower.includes('pedicura')) {
            return 'Cuidado e hidratación profunda para tus manos';
        }
        return 'Tratamiento diseñado para tu bienestar integral';
    };

    // Filtrar los servicios
    const displayedServices = filterOnlyFavorites
        ? services.filter(service => favorites.includes(service.id))
        : services;

    return (
        <>
            {/* Cabecera de Navegación */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100/80">
                <Link 
                    href={`/${slug}`} 
                    className="flex items-center justify-center size-9 rounded-full bg-white border border-slate-100 shadow-sm text-slate-600 hover:text-slate-900 transition-all active:scale-90" 
                    style={{ color: primaryColor }}
                >
                    <ChevronLeft size={18} strokeWidth={3} />
                </Link>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">
                    Servicios
                </h1>
                
                {/* Botón del corazón en la cabecera (Filtro) */}
                <button 
                    onClick={() => setFilterOnlyFavorites(!filterOnlyFavorites)}
                    className="flex items-center justify-center size-9 rounded-full bg-white border border-slate-100 shadow-sm transition-all active:scale-90 relative" 
                    style={{ 
                        color: primaryColor,
                        borderColor: filterOnlyFavorites ? primaryColor : undefined 
                    }}
                    title={filterOnlyFavorites ? "Ver todos los servicios" : "Filtrar por favoritos"}
                >
                    <Heart 
                        size={16} 
                        fill={filterOnlyFavorites ? primaryColor : "none"} 
                        strokeWidth={2.5} 
                    />
                    {isMounted && favorites.length > 0 && !filterOnlyFavorites && (
                        <span 
                            className="absolute -top-1 -right-1 size-4 rounded-full text-[8px] font-black text-white flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {favorites.length}
                        </span>
                    )}
                </button>
            </header>

            {/* Espaciador Superior para compensar la cabecera fija */}
            <div className="pt-20"></div>

            {/* PRÓXIMA CITA ALERT BANNER */}
            {nextAppointment && (
                <div className="px-6 mb-5">
                    <NextAppointmentBanner 
                        appointment={nextAppointment}
                        slug={slug}
                        primaryColor={primaryColor}
                    />
                </div>
            )}

            {/* LISTA DE SERVICIOS */}
            <section className="px-6 pb-12">
                <div className="flex flex-col gap-4">
                    {displayedServices.length === 0 ? (
                        <div className="text-center py-16 space-y-4">
                            <p className="text-slate-400 font-semibold text-sm">
                                {filterOnlyFavorites 
                                    ? "No has agregado ningún servicio a favoritos todavía."
                                    : "No se encontraron servicios."}
                            </p>
                            {filterOnlyFavorites ? (
                                <button 
                                    onClick={() => setFilterOnlyFavorites(false)}
                                    className="text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                    style={{ color: primaryColor }}
                                >
                                    Ver todos los servicios
                                </button>
                            ) : (
                                <Link 
                                    href={`/${slug}/servicios`} 
                                    className="inline-block text-xs font-black uppercase tracking-widest" 
                                    style={{ color: primaryColor }}
                                >
                                    Ver todos los servicios
                                </Link>
                            )}
                        </div>
                    ) : (
                        displayedServices.map((service: any, index: number) => {
                            const mockRating = (4.7 + (index * 0.1) % 0.3).toFixed(1);
                            const mockReviews = 180 + (index * 35);
                            const tagLabel = index === 0 ? "MÁS RESERVADO" : (index === 1 ? "POPULAR" : (index === 2 ? "NUEVO" : ""));
                            const benefitText = getServiceBenefit(service.nombre);
                            const isFavorite = favorites.includes(service.id);
                            
                            return (
                                <div 
                                    key={service.id} 
                                    className="relative bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-3 flex gap-3 h-[165px] transition-all hover:scale-[1.01] active:scale-[0.99] duration-300 animate-in fade-in-40 duration-200"
                                >
                                    {/* Link invisible absoluto que cubre todo el contenedor */}
                                    <Link 
                                        href={`/${slug}/servicio/${service.id}`}
                                        className="absolute inset-0 z-10 rounded-[24px]"
                                    />

                                    {/* Lado Izquierdo: Imagen del servicio (38%) */}
                                    <div className="relative w-[38%] h-full rounded-[20px] overflow-hidden bg-slate-50 shrink-0 select-none">
                                        <img 
                                            src={getServicePrimaryImage(service, 'medium')} 
                                            className="w-full h-full object-cover" 
                                            alt={service.nombre} 
                                        />
                                        
                                        {/* Tag de popularidad/novedad */}
                                        {tagLabel && (
                                            <div className="absolute top-2 left-2 bg-pink-500 text-white text-[6px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md select-none z-20" style={{ backgroundColor: primaryColor }}>
                                                {tagLabel}
                                            </div>
                                        )}
                                        
                                        {/* Corazón favoritos sobre la imagen */}
                                        <button 
                                            onClick={(e) => toggleFavorite(service.id, e)}
                                            className="absolute top-2 right-2 size-6 rounded-full bg-white/95 border border-slate-100/50 flex items-center justify-center active:scale-90 transition-all shadow-sm z-20"
                                            style={{ color: isFavorite ? primaryColor : '#94a3b8' }}
                                        >
                                            <Heart 
                                                size={10} 
                                                fill={isFavorite ? primaryColor : "none"} 
                                                strokeWidth={2.5} 
                                            />
                                        </button>
                                        
                                        {/* Duración abajo */}
                                        <div className="absolute bottom-2 left-2 bg-black/45 backdrop-blur-[1px] text-white px-2 py-0.5 rounded-md text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 select-none">
                                            <Clock size={8} />
                                            {service.duracion || 60} min
                                        </div>
                                    </div>

                                    {/* Lado Derecho: Textos, Beneficios, Precio y Botón */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pr-1">
                                        <div className="space-y-0.5">
                                            <h2 className="font-black text-[13px] uppercase text-slate-850 tracking-tight leading-snug truncate">
                                                {service.nombre}
                                            </h2>
                                            <p className="text-[10px] text-slate-400 font-semibold line-clamp-1 leading-normal">
                                                {service.extraInfo?.descripcion || service.descripcion || 'Tratamiento diseñado exclusivamente para tu bienestar.'}
                                            </p>
                                            
                                            {/* Calificación y opiniones */}
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 leading-none pt-0.5">
                                                <Star size={10} className="text-pink-500" fill="currentColor" style={{ color: primaryColor }} />
                                                <span className="text-slate-700">{mockRating}</span>
                                                <span className="text-slate-200">|</span>
                                                <span>({mockReviews} opiniones)</span>
                                            </div>
                                        </div>

                                        {/* Caja de Beneficio Destacado */}
                                        <div className="rounded-xl p-2 flex items-center gap-1.5 select-none" style={{ backgroundColor: `${primaryColor}0a` }}>
                                            <Droplet size={11} className="text-pink-500 shrink-0" style={{ color: primaryColor }} />
                                            <span className="text-[8.5px] text-slate-600 font-semibold truncate leading-none">
                                                {benefitText}
                                            </span>
                                        </div>

                                        {/* Precio y Botón Reservar */}
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                            <div className="text-sm font-black" style={{ color: primaryColor }}>
                                                ${service.precio || 30}
                                            </div>

                                            {/* Botón Reservar (Visual, no enlace anidado) */}
                                            <div 
                                                className="px-4 py-2 rounded-[14px] font-black text-[9px] uppercase tracking-widest text-white shadow-sm flex items-center gap-0.5"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                Reservar
                                                <ChevronRight size={9} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </>
    );
}
