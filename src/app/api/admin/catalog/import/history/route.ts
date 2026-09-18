import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }

    try {
        const rawImports = await (prisma as any).catalogImport.findMany({
            where: { businessId: negocioId },
            orderBy: { createdAt: 'desc' },
            take: 30
        });

        const imports = rawImports.map((imp: any) => ({
            ...imp,
            sourceName: imp.sourceFileName || imp.sourceName || 'Archivo de Catálogo'
        }));

        return NextResponse.json({
            success: true,
            imports
        });
    } catch (e: any) {
        console.error('[API_CATALOG_IMPORT_HISTORY_ERROR]', e);
        return NextResponse.json({ error: e?.message || 'Error al obtener historial de importaciones.' }, { status: 500 });
    }
}
