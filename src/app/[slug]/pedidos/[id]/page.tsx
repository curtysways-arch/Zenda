import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ModuleResolver } from '@/lib/modules/ModuleResolver';
import { PinchoFriendlyCodeService } from '@/modules/pinchos/services/pinchoFriendlyCodeService';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ slug: string; id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
    const { slug, id } = await params;

    // Obtener negocio para detectar tipo
    const negocio = await prisma.negocio.findUnique({
        where: { slug },
        select: { id: true, tipoNegocio: true, configuracion: true, colorPrimario: true, colorSecundario: true, nombre: true, logoUrl: true }
    });

    // Verificar si es módulo Enterprise (Restaurante) o Pinchos legacy
    const cfg = (typeof negocio?.configuracion === 'string'
        ? (() => { try { return JSON.parse(negocio.configuracion as string); } catch { return {}; } })()
        : (negocio?.configuracion as any)) || {};
    const isEnterprise = cfg.useEnterpriseRuntime || cfg.enterpriseRuntime;
    const isPinchos = ModuleResolver.isPinchosModule(slug);

    // Si no es ni pinchos ni enterprise con negocio válido, 404
    if (!isPinchos && !isEnterprise) {
        notFound();
    }

    const order = await (prisma as any).pedido.findUnique({
        where: { id },
        include: {
            items: true,
            payment: {
                include: {
                    evidences: { orderBy: { createdAt: 'desc' }, take: 1 }
                }
            }
        }
    });

    if (!order) {
        notFound();
    }

    // ── Restaurante Enterprise → Página de tracking de restaurante ─────────────
    if (isEnterprise && !isPinchos) {
        const { default: RestaurantOrderTrackingClient } = await import(
            '@/modules/restaurant/components/RestaurantOrderTrackingClient'
        );
        return (
            <RestaurantOrderTrackingClient
                order={order}
                negocio={negocio}
                storeSlug={slug}
            />
        );
    }

    // ── Pinchos legacy ─────────────────────────────────────────────────────────
    let timeline: any[] = [];
    try {
        timeline = await (prisma as any).pinchoOrderTimeline.findMany({
            where: { pedidoId: id },
            orderBy: { createdAt: 'asc' }
        });
    } catch (_) {
        timeline = [];
    }

    const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(order.numeroPedido, 'PIN');

    const { default: PinchoOrderTrackingClient } = await import('@/modules/pinchos/components/PinchoOrderTrackingClient');
    return <PinchoOrderTrackingClient order={{ ...order, friendlyCode }} timeline={timeline} storeSlug={slug} />;
}
