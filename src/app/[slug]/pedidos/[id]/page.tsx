import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ModuleResolver } from '@/lib/modules/ModuleResolver';
import { PinchoFriendlyCodeService } from '@/modules/pinchos/services/pinchoFriendlyCodeService';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ slug: string; id: string }>;
}

export default async function PinchoOrderDetailPage({ params }: Props) {
    const { slug, id } = await params;

    // Guard: only allow pinchos module
    if (!ModuleResolver.isPinchosModule(slug)) {
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

    const timeline = await (prisma as any).pinchoOrderTimeline.findMany({
        where: { pedidoId: id },
        orderBy: { createdAt: 'asc' }
    });

    const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(order.numeroPedido, 'PIN');

    // Dynamically import the tracking client
    const { default: PinchoOrderTrackingClient } = await import('@/modules/pinchos/components/PinchoOrderTrackingClient');

    return <PinchoOrderTrackingClient order={{ ...order, friendlyCode }} timeline={timeline} storeSlug={slug} />;
}
