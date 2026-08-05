import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import ClientOrdersClient from '@/components/public/ClientOrdersClient';
import { hasModule } from '@/lib/business/BusinessModuleResolver';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params;
    return {
        title: `Mis Pedidos - ${slug.toUpperCase()}`,
        description: 'Consulta el estado de tus pedidos y la verificación de tus pagos.'
    };
}

export default async function MisPedidosPage(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params;

    let negocio = await prisma.negocio.findUnique({
        where: { slug }
    });

    if (!negocio && (slug === 'lavado' || slug === 'demo-lavado')) {
        negocio = await prisma.negocio.findFirst({
            where: { tipoNegocio: 'SHOE_CARE' }
        });
        if (!negocio) {
            negocio = {
                id: 'sneaker-wash-id',
                nombre: 'BubbleWash',
                slug: slug,
                tipoNegocio: 'SHOE_CARE'
            } as any;
        }
    }

    if (!negocio) {
        notFound();
    }

    // 🟢 Protección de Módulo: Si el negocio no cuenta con módulo de Pedidos, redirigir a mis-reservas
    if (!hasModule(negocio.tipoNegocio, 'ORDERS')) {
        redirect(`/${slug}/mis-reservas`);
    }

    return <ClientOrdersClient negocio={negocio} />;
}
