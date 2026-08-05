import React from 'react';
import prisma from '@/lib/prisma';
import ClientOrdersClient from '@/components/public/ClientOrdersClient';

export const metadata = {
    title: 'Mis Pedidos de Lavado | BubbleWash',
    description: 'Consulta el estado de tus pedidos de lavado y restauración de calzado.'
};

export default async function LavadoPedidosPage() {
    let negocio = await prisma.negocio.findFirst({
        where: { tipoNegocio: 'SHOE_CARE' }
    });

    if (!negocio) {
        negocio = {
            id: 'sneaker-wash-id',
            nombre: 'BubbleWash',
            slug: 'lavado',
            tipoNegocio: 'SHOE_CARE',
            logoUrl: '/images/bubblewash/hero_sneakers.jpg',
            colorPrimario: '#7c3aed',
            colorSecundario: '#4c1d95',
            whatsapp: '0991234567',
            mostrarPrecios: true
        } as any;
    }

    return <ClientOrdersClient negocio={negocio} />;
}
