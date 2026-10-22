import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: Promise<{ businessId: string }> }) {
    try {
        const { businessId } = await params;
        if (!businessId) {
            return NextResponse.json({ error: 'businessId requerido' }, { status: 400 });
        }

        // Usar queryRawUnsafe para garantizar todos los resultados en SQLite
        const safeId = businessId.replace(/'/g, "''");
        const pages = await prisma.$queryRawUnsafe(
            `SELECT id, businessId, title, slug, status, contentHtml, featuredImage, buttonText, buttonUrl, posicion, orden, updatedAt FROM Page WHERE businessId = '${safeId}' ORDER BY orden ASC, updatedAt DESC`
        ) as any[];

        const formatted = (pages || []).map((p: any) => ({
            ...p,
            posicion: p.posicion || (p.slug === 'como-funciona' ? 'top' : 'bottom'),
            orden: p.orden ?? 1
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error('[PUBLIC_PAGES_ERROR]', error?.message);
        return NextResponse.json([], { status: 200 }); // Devolver array vacío en caso de error, no 500
    }
}
