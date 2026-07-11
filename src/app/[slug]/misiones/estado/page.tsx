import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import QuestEstadoClient from './QuestEstadoClient';

export const dynamic = 'force-dynamic';

export default async function QuestEstadoPage({
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
            {/* Header de navegación */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100/50 px-6 py-4 flex items-center justify-between z-30">
                <Link 
                    href={`/${slug}/misiones`}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-95 transition-transform border-0 cursor-pointer"
                >
                    <ChevronLeft size={20} />
                </Link>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    Mis Desafíos
                </h2>
                <div className="w-10 h-10" />
            </header>

            {/* Contenido interactivo */}
            <div className="max-w-md mx-auto px-6 pt-6">
                <QuestEstadoClient 
                    slug={slug} 
                    primaryColor={primaryColor} 
                    textColor={textColor}
                    negocioNombre={negocio.nombre}
                />
            </div>
        </main>
    );
}
