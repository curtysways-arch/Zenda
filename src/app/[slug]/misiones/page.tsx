import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import QuestList from './QuestList';

export const dynamic = 'force-dynamic';

export default async function PublicMisionesPage({
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
        <main className="min-h-screen bg-slate-50/50 pb-20 select-none">
            {/* Header de navegación */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100/50 px-6 py-4 flex items-center justify-between z-30">
                <Link 
                    href={`/${slug}`}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-95 transition-transform border-0 cursor-pointer"
                >
                    <ChevronLeft size={20} />
                </Link>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    Aventuras y Misiones
                </h2>
                <div className="w-10 h-10" /> {/* Espaciador */}
            </header>

            {/* Contenido principal */}
            <div className="max-w-md mx-auto px-6 pt-6">
                <div className="space-y-4 mb-6">
                    <h3 className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tight">
                        Growth Quests
                    </h3>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase tracking-wider">
                        Completa misiones exclusivas de {negocio.nombre} y desbloquea recompensas premium al instante.
                    </p>
                </div>

                {/* Listado de misiones interactivo */}
                <QuestList 
                    slug={slug} 
                    primaryColor={primaryColor} 
                    textColor={textColor} 
                />
            </div>
        </main>
    );
}
