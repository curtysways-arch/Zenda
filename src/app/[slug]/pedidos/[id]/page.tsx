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

    const isPinchos = ModuleResolver.isPinchosModule(slug);

    // Para módulos Pinchos → flujo legacy
    if (isPinchos) {
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
        if (!order) notFound();

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

    // Para cualquier otro módulo (Enterprise, Restaurante, etc.)
    const negocio = await prisma.negocio.findUnique({
        where: { slug },
        select: { id: true, nombre: true, logoUrl: true, colorPrimario: true, colorSecundario: true }
    });
    if (!negocio) notFound();

    const order = await (prisma as any).pedido.findFirst({
        where: { id, negocioId: negocio.id },
        include: { items: true }
    });
    if (!order) notFound();

    const { default: RestaurantOrderTrackingClient } = await import(
        '@/modules/restaurant/components/RestaurantOrderTrackingClient'
    );
    return <RestaurantOrderTrackingClient order={order} negocio={negocio} storeSlug={slug} />;
}
