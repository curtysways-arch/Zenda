import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
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
        <PremiosCatalogoClient 
            slug={slug} 
            primaryColor={primaryColor} 
            textColor={textColor}
            negocioNombre={negocio.nombre}
        />
    );
}
