import prisma from '@/lib/prisma';
import TemplateCatalogClient, { CatalogVertical } from '@/components/superadmin/TemplateCatalogClient';
import { VERTICALS, templateVariants, verticalOf, variantOf } from '@/lib/templateCatalog';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Plantillas · Citiox Superadmin',
    description: 'Las páginas públicas reales de cada tipo de negocio, con vista previa en vivo',
};

/**
 * Plantillas de página pública por tipo de negocio.
 * Cada plantilla se previsualiza en vivo sobre un negocio de ese tipo (de preferencia un demo),
 * forzando el diseño con ?diseno=<id> cuando corresponde.
 */
export default async function PlantillasPage() {
    const negocios = await prisma.negocio.findMany({
        select: {
            id: true, nombre: true, slug: true, tipoNegocio: true, configuracion: true, isDemo: true, estado: true,
            logoUrl: true, businessTypeId: true, BusinessType: { select: { name: true, slug: true } },
        },
        orderBy: [{ isDemo: 'desc' }, { nombre: 'asc' }],
    });

    const variants = templateVariants();
    const rows = negocios.map((n) => {
        const vertical = verticalOf(n as any);
        return {
            id: n.id, nombre: n.nombre, slug: n.slug, isDemo: n.isDemo, activo: String(n.estado || 'ACTIVO').toUpperCase() === 'ACTIVO',
            logoUrl: n.logoUrl, vertical, variant: variantOf(n as any, vertical), pinchos: (n.slug || '').toLowerCase().includes('pincho'),
        };
    });

    const verticals: CatalogVertical[] = VERTICALS.map((v) => {
        const mine = rows.filter((r) => r.vertical === v.id);
        return {
            ...v,
            negocios: mine.length,
            demos: mine.filter((r) => r.isDemo).length,
            variants: variants.filter((t) => t.verticalId === v.id).map((t) => ({
                ...t,
                enUso: mine.filter((r) => r.variant === t.id && !r.isDemo).length,
                // Negocios donde se puede previsualizar: demos primero, luego activos.
                vistaPrevia: mine
                    .filter((r) => (t.soloPinchos ? r.pinchos : !r.pinchos || v.id !== 'tienda'))
                    .sort((a, b) => Number(b.isDemo) - Number(a.isDemo) || Number(b.variant === t.id) - Number(a.variant === t.id) || Number(b.activo) - Number(a.activo))
                    .slice(0, 12)
                    .map((r) => ({ slug: r.slug, nombre: r.nombre, isDemo: r.isDemo, usaEsta: r.variant === t.id })),
            })),
        };
    });

    return <TemplateCatalogClient verticals={verticals} totalNegocios={rows.length} />;
}
