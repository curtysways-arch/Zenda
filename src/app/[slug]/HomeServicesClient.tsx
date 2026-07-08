'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Star, Heart } from 'lucide-react';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';

interface HomeServicesClientProps {
    filteredCanchas: any[];
    slug: string;
    primaryColor: string;
    textColor: string;
}

export default function HomeServicesClient({
    filteredCanchas,
    slug,
    primaryColor,
    textColor,
}: HomeServicesClientProps) {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    // Cargar favoritos del localStorage
    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem(`fav_services_${slug}`);
        if (stored) {
            try {
                setFavorites(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing stored favorites in Home:", e);
            }
        }
    }, [slug]);

    // Función para alternar favorito
    const toggleFavorite = (serviceId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Evitar redirección general de la tarjeta
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

    return (
        <section id="servicios" className="px-6 mb-6">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-2xl font-black leading-none text-slate-900">Nuestros Servicios</h3>
                </div>
                {filteredCanchas.length > 0 && (
                    <Link 
                        href={`/${slug}/servicios`}
                        className="text-[10px] font-black uppercase tracking-widest" 
                        style={{ color: primaryColor }}
                    >
                        VER TODOS
                    </Link>
                )}
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none px-1">
                {filteredCanchas.slice(0, 4).map((service: any, index: number) => {
                    const mockRating = (4.7 + (index * 0.1) % 0.3).toFixed(1);
                    const mockReviews = 180 + (index * 35);
                    
                    const tags = ["Más reservado", "Nuevo", "Popular", "Favorito"];
                    const currentTag = tags[index % tags.length];
                    const isFavorite = favorites.includes(service.id);

                    return (
                        <div 
                            key={service.id} 
                            className="relative bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-w-[280px] max-w-[280px] shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                        >
                            {/* Link invisible absoluto que cubre todo el contenedor */}
                            <Link 
                                href={`/${slug}/servicio/${service.id}`}
                                className="absolute inset-0 z-10 rounded-[2.5rem]"
                            />

                            {/* Imagen del servicio */}
                            <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden mb-4 bg-slate-50">
                                <img 
                                    src={getServicePrimaryImage(service, 'medium')} 
                                    className="w-full h-full object-cover" 
                                    alt={service.nombre} 
                                />
                                {/* Badge con la etiqueta dinámica */}
                                <div className="absolute top-3 left-3 bg-pink-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-20">
                                    {currentTag}
                                </div>
                                {/* Icono Corazón (Favoritos) */}
                                <button 
                                    onClick={(e) => toggleFavorite(service.id, e)}
                                    className="absolute top-3 right-3 size-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-100 flex items-center justify-center active:scale-95 transition-all z-20"
                                    style={{ color: isFavorite ? primaryColor : '#94a3b8' }}
                                >
                                    <Heart 
                                        size={14} 
                                        fill={isFavorite ? primaryColor : "none"} 
                                        strokeWidth={2.5} 
                                    />
                                </button>
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 flex flex-col justify-between px-1">
                                <div>
                                    <h4 className="font-black text-[17px] leading-snug line-clamp-2" style={{ color: textColor }}>
                                        {service.nombre}
                                    </h4>
                                    
                                    {/* Info line */}
                                    <div className="flex items-center gap-4 mt-2.5 mb-3 text-slate-400 text-[11px] font-bold">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} className="text-slate-400" />
                                            {service.duracionMinutos || 60} min
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Star size={12} className="text-amber-400" fill="currentColor" />
                                            {mockRating} ({mockReviews})
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    {/* Precio */}
                                    <div className="text-2xl font-black mb-3" style={{ color: primaryColor }}>
                                        ${service.precio}
                                    </div>

                                    {/* Botón Ver detalles (Visual, no enlace anidado) */}
                                    <div 
                                        className="block w-full text-center py-3 rounded-2xl border text-xs font-black uppercase tracking-widest bg-white shadow-sm"
                                        style={{ 
                                            borderColor: `${primaryColor}26`, 
                                            color: primaryColor 
                                        }}
                                    >
                                        Ver detalles
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
