import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import OrderTrackingClient from '@/components/public/OrderTrackingClient';
import { getNegocioBySlug } from '@/lib/services';

export const dynamic = 'force-dynamic';

export default async function OrderTrackingPage({
    params
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { slug, id } = await params;
    
    // Obtener negocio
    const negocio = await getNegocioBySlug(slug);
    if (!negocio) {
        notFound();
    }

    // Obtener pedido con sus items
    const pedido = await (prisma as any).pedido.findUnique({
        where: { id },
        include: {
            items: true
        }
    });

    if (!pedido || pedido.negocioId !== negocio.id) {
        notFound();
    }

    // Formatear el pedido para serialización limpia
    const formattedOrder = {
        id: pedido.id,
        numeroPedido: pedido.numeroPedido,
        tipoEntrega: pedido.tipoEntrega,
        nombreCliente: pedido.nombreCliente,
        telefonoCliente: pedido.telefonoCliente,
        direccionCliente: pedido.direccionCliente,
        referenciaCliente: pedido.referenciaCliente,
        fechaEntrega: pedido.fechaEntrega instanceof Date 
            ? pedido.fechaEntrega.toISOString() 
            : (pedido.fechaEntrega ? String(pedido.fechaEntrega) : null),
        franjaHoraria: pedido.franjaHoraria,
        subtotal: pedido.subtotal,
        costoEnvio: pedido.costoEnvio,
        total: pedido.total,
        estado: pedido.estado,
        notas: pedido.notas,
        createdAt: pedido.createdAt instanceof Date ? pedido.createdAt.toISOString() : String(pedido.createdAt),
        items: (pedido.items || []).map((item: any) => ({
            id: item.id,
            nombreProducto: item.nombreProducto,
            precioUnitario: item.precioUnitario,
            cantidad: item.cantidad
        }))
    };

    return (
        <OrderTrackingClient 
            order={formattedOrder} 
            negocio={{
                nombre: negocio.nombre,
                slug: negocio.slug,
                whatsapp: negocio.whatsapp,
                colorPrimario: negocio.colorPrimario
            }} 
        />
    );
}
