import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ClientOrdersClient from '@/components/public/ClientOrdersClient';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params;
    return {
        title: `Mis Pedidos - ${slug.toUpperCase()}`,
        description: 'Consulta el estado de tus pedidos y la verificación de tus pagos.'
    };
}

export default async function MisPedidosPage(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params;

    const negocio = await prisma.negocio.findUnique({
        where: { slug }
    });

    if (!negocio) {
        notFound();
    }

    return <ClientOrdersClient negocio={negocio} />;
}
