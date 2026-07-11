import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
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
        <main className="min-h-screen bg-slate-50/60 pb-24 select-none">
            {/* Listado de misiones interactivo con diseño premium unificado */}
            <QuestList 
                slug={slug} 
                primaryColor={primaryColor} 
                textColor={textColor} 
                negocioNombre={negocio.nombre}
            />
        </main>
    );
}
