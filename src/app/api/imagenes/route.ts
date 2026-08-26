import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import crypto from 'crypto';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        const negocioId = (session?.user as any)?.negocioId;
        const { searchParams } = new URL(req.url);
        const tipo = searchParams.get('tipo');
        const canchaId = searchParams.get('canchaId') || searchParams.get('serviceId');

        const imagenes = await (prisma as any).imagen.findMany({
            where: {
                ...(negocioId ? { negocioId } : {}),
                ...(tipo ? { tipo } : {}),
                ...(canchaId ? { serviceId: canchaId } : {})
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(imagenes);
    } catch (error) {
        return NextResponse.json([]);
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        const negocioId = (session?.user as any)?.negocioId;
        const { url, tipo, canchaId, serviceId, esBanner } = await req.json();

        const sId = canchaId || serviceId || null;

        const imagen = await (prisma as any).imagen.create({
            data: {
                id: crypto.randomUUID(),
                url,
                tipo: tipo || 'GALERIA',
                negocioId: negocioId || 'default',
                serviceId: sId,
                esBanner: !!esBanner,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(imagen);
    } catch (error) {
        console.error('Error creating image:', error);
        return NextResponse.json({ error: 'Error al guardar imagen' }, { status: 500 });
    }
}
