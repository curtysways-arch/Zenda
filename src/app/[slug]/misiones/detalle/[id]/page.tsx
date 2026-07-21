import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import QuestDetalleClient from './QuestDetalleClient';

export const dynamic = 'force-dynamic';

export default async function QuestDetallePage({
    params
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const resolvedParams = await params;
    const { slug, id } = resolvedParams;
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    const primaryColor = (negocio as any).colorPrimario || '#ec4899';
    const textColor = (negocio as any).colorTexto || '#1e293b';

    return (
        <main className="min-h-screen bg-slate-50/60 pb-24 select-none">
            {/* Header de navegación */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100/50 px-[5px] py-4 flex items-center justify-between z-30">
                <Link 
                    href={`/${slug}/misiones/estado`}
                    className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-95 transition-transform border-0 cursor-pointer"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">CLUB {negocio.nombre.toUpperCase()}</span>
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800 mt-0.5">
                        {negocio.nombre}
                    </h2>
                </div>
                <div className="w-9 h-9" />
            </header>

            {/* Contenido interactivo */}
            <div className="max-w-md mx-auto px-[5px] pt-4">
                <QuestDetalleClient 
                    slug={slug}
                    id={id}
                    primaryColor={primaryColor} 
                    textColor={textColor}
                    negocioNombre={negocio.nombre}
                />
            </div>
        </main>
    );
}
