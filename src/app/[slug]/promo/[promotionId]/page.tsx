import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import PromoShareClient from './PromoShareClient';
import { Metadata } from 'next';

type Props = {
    params: Promise<{ slug: string; promotionId: string }>;
};

// Generar metadata dinámicamente para Open Graph
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, promotionId } = await params;

    const rawPromotion = await prisma.promotion.findUnique({
        where: { id: promotionId },
        include: { Negocio: true, PromotionToService: { include: { Service: true } } }
    });

    const promotion = rawPromotion ? {
        ...rawPromotion,
        negocio: rawPromotion.Negocio,
        services: rawPromotion.PromotionToService?.map((pts: any) => pts.Service) || []
    } : null;

    if (!promotion || promotion.negocio.slug !== slug) {
        return { title: 'Promoción no encontrada' };
    }

    const title = `🔥 PROMOCIÓN: ${promotion.titulo} en ${promotion.negocio.nombre}`;
    const desc = `${promotion.descripcion.substring(0, 100)}... Antes: $${promotion.precioAnterior || '-'} | Ahora: $${promotion.precioPromo}. ¡Reserva ya!`;
    const canonical = `/${slug}/promo/${promotionId}`;

    return {
        title: title,
        description: desc,
        openGraph: {
            title: title,
            description: desc,
            url: canonical,
            type: 'website',
            images: [
                {
                    url: promotion.imagenUrl,
                    width: 1200,
                    height: 630,
                    alt: promotion.titulo,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: desc,
            images: [promotion.imagenUrl],
        },
    };
}

export default async function PromotionPage({ params }: Props) {
    const { slug, promotionId } = await params;

    const rawPromotion = await prisma.promotion.findUnique({
        where: { id: promotionId },
        include: { Negocio: true, PromotionToService: { include: { Service: true } } }
    });

    const promotion = rawPromotion ? {
        ...rawPromotion,
        negocio: rawPromotion.Negocio,
        services: rawPromotion.PromotionToService?.map((pts: any) => pts.Service) || []
    } : null;

    if (!promotion || promotion.negocio.slug !== slug) {
        notFound();
    }

    // Asegurarse de armar la URL base
    let host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Fallback if NEXT_PUBLIC_APP_URL is not set but VERCEL_URL is
    if (!process.env.NEXT_PUBLIC_APP_URL && process.env.VERCEL_URL) {
        host = `https://${process.env.VERCEL_URL}`;
    }

    const canonicalUrl = `${host}/${slug}/promo/${promotionId}`;

    const primaryColor = (promotion.negocio as any).colorPrimario || 'var(--primary)';
    const tertiaryColor = (promotion.negocio as any).colorTerciario || '#14B8A6';
    const textColor = (promotion.negocio as any).colorTexto || '#000000';
    const neutralColor = (promotion.negocio as any).colorNeutral || '#FFD1EE';

    return (
        <PromoShareClient
            promotion={promotion}
            negocio={promotion.negocio}
            shareUrl={canonicalUrl}
            slug={slug}
            primaryColor={primaryColor}
            tertiaryColor={tertiaryColor}
            textColor={textColor}
            neutralColor={neutralColor}
        />
    );
}
