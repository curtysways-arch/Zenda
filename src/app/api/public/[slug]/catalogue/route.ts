import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        // Buscar negocio por slug
        const negocio = await prisma.negocio.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!negocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        // Obtener categorías activas
        const categories = await (prisma as any).categoriaProducto.findMany({
            where: { negocioId: negocio.id, activo: true },
            orderBy: { orden: 'asc' }
        });

        // Obtener productos activos
        const products = await (prisma as any).producto.findMany({
            where: { negocioId: negocio.id, activo: true },
            orderBy: { orden: 'asc' }
        });

        return NextResponse.json({ categories, products });
    } catch (error) {
        console.error('[CATALOGUE_API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
