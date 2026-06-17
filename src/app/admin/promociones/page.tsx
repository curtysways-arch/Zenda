import { getPromotions } from '@/app/actions/promotionActions';
import PromotionClient from './PromotionClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function PromocionesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    const negocioId = (session.user as any).negocioId;

    if (!negocioId) {
        redirect('/login');
    }

    const rawNegocio = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: {
            slug: true,
            nombre: true,
            isDemo: true,
            Service: { where: { estaActivo: true }, select: { id: true, nombre: true } },
            Suscripcion: {
                select: {
                    estado: true,
                    Plan: {
                        select: {
                            automatic_discounts_enabled: true
                        }
                    }
                }
            }
        }
    });

    const negocio = rawNegocio ? {
        ...rawNegocio,
        services: rawNegocio.Service || []
    } : null;

    if (!negocio) {
        redirect('/login');
    }

    const isPromotionsEnabled = !!(rawNegocio?.isDemo || rawNegocio?.Suscripcion?.Plan?.automatic_discounts_enabled);

    // Fetch initial data
    const promociones = await getPromotions();

    return <PromotionClient initialPromotions={promociones} negocio={negocio} isPromotionsEnabled={isPromotionsEnabled} />;
}
