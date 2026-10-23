import prisma from '@/lib/prisma';
import { streamDeChat } from '@/lib/orders/chatBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Avisos en vivo del chat para la página del pedido (enlace privado: id exacto del pedido). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    const negocio = await prisma.negocio.findUnique({ where: { slug }, select: { id: true } });
    const ord = negocio ? await (prisma as any).pedido.findUnique({ where: { id }, select: { id: true, negocioId: true } }) : null;
    if (!ord || ord.negocioId !== negocio!.id) return new Response('No encontrado', { status: 404 });
    return streamDeChat(ord.id, request.signal);
}
