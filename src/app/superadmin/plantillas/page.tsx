import prisma from '@/lib/prisma';
import MarketplaceClient from '@/components/superadmin/MarketplaceClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Marketplace de Plantillas · Citiox Superadmin',
    description: 'Gestiona la Biblioteca Oficial de Plantillas del Marketplace Citiox',
};

export default async function MarketplacePlantillasPage() {
    // Cargar todas las plantillas con sus misiones para el render inicial (SSR)
    const templatesRaw = await prisma.questTemplate.findMany({
        include: {
            Missions: {
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: [
            { featured: 'desc' },
            { installCount: 'desc' },
            { createdAt: 'desc' },
        ]
    });

    // Serializar para Next.js (fechas → strings)
    const templates = templatesRaw.map(t => ({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        icono: t.icono,
        color: t.color,
        categorias: (t.categorias as string[]) || [],
        tags: (t.tags as string[]) || [],
        coupons: (t.coupons as any[]) || [],
        rewards: (t.rewards as any[]) || [],
        versionSemantica: t.versionSemantica || '1.0.0',
        estado: t.estado,
        origenTipo: t.origenTipo,
        esPredeterminada: t.esPredeterminada,
        featured: t.featured,
        gratuito: t.gratuito,
        precio: Number(t.precio) || 0,
        installCount: t.installCount,
        rating: Number(t.rating) || 5.0,
        autor: t.autor || 'Citiox',
        empresa: t.empresa || 'Citiox',
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        Missions: t.Missions.map(m => ({
            id: m.id,
            nombre: m.nombre,
            descripcion: m.descripcion || '',
            triggerEvent: m.triggerEvent,
            difficulty: m.difficulty || 'MEDIUM',
            xp: m.xp || 0,
            cantidadMeta: m.cantidadMeta || 1,
            acciones: (m.acciones as any[]) || [],
        }))
    }));

    return <MarketplaceClient initialTemplates={templates} />;
}
