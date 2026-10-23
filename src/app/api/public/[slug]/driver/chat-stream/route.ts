import prisma from '@/lib/prisma';
import { streamDeChat } from '@/lib/orders/chatBus';
import { getDriverSession, driverResources } from '@/lib/logistics/driverSession';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Avisos en vivo del chat para el repartidor: solo de un pedido que tenga asignado. */
export async function GET(request: Request) {
    const orderId = new URL(request.url).searchParams.get('orderId') || '';
    const ses = await getDriverSession();
    if (!ses || !orderId) return new Response('No autorizado', { status: 401 });
    const own = (await driverResources(ses)).map((r: any) => r.id);
    const ord = await (prisma as any).pedido.findUnique({ where: { id: orderId }, select: { id: true, extraInfo: true } });
    const ex: any = ord ? (typeof ord.extraInfo === 'string' ? JSON.parse(ord.extraInfo || '{}') : (ord.extraInfo || {})) : {};
    if (!ord || !ex.assignedDriverId || !own.includes(ex.assignedDriverId)) return new Response('No autorizado', { status: 403 });
    return streamDeChat(ord.id, request.signal);
}
