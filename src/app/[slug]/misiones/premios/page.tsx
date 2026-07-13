import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import PremiosCatalogoClient from './PremiosCatalogoClient';

export const dynamic = 'force-dynamic';

export default async function PremiosCatalogoPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    const primaryColor = (negocio as any).colorPrimario || '#ec4899'; // fucsia por defecto
    const textColor = (negocio as any).colorTexto || '#1e293b';

    return (
        <main className="min-h-screen bg-slate-50/60 pb-24 select-none">
            {/* Header de navegación - Diseño Premium */}
            <header 
                className="relative px-6 pt-7 pb-8 text-center text-white"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="flex justify-between items-center max-w-md mx-auto relative z-10">
                    <Link 
                        href={`/${slug}/misiones`}
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center active:scale-95 transition-all shadow-sm border-0 cursor-pointer shrink-0"
                        style={{ color: primaryColor }}
                    >
                        <ChevronLeft size={18} strokeWidth={3} />
                    </Link>
                    <div className="flex-1 px-4">
                        <h2 className="text-[17px] font-black tracking-tight leading-none">
                            Catálogo de Premios
                        </h2>
                        <p className="text-[10px] text-white/80 font-medium mt-1 leading-none">
                            Canjea tus puntos por beneficios increíbles
                        </p>
                    </div>
                    {/* Botón de Ayuda "?" */}
                    <button 
                        onClick={() => alert('¡Consigue puntos reservando servicios y cumpliendo misiones en el club! Luego, canjéalos por fabulosos cupones y regalos.')}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all border border-white/10 cursor-pointer shrink-0"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </button>
                </div>
                
                {/* Efecto de curva decorativa en el fondo */}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-50/60 rounded-t-[1.5rem]" />
            </header>

            {/* Contenido interactivo */}
            <div className="max-w-md mx-auto px-4 -mt-4 relative z-20">
                <PremiosCatalogoClient 
                    slug={slug} 
                    primaryColor={primaryColor} 
                    textColor={textColor}
                    negocioNombre={negocio.nombre}
                />
            </div>
        </main>
    );
}
