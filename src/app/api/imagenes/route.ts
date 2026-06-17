import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from 'crypto';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { searchParams } = new URL(req.url);
        const tipo = searchParams.get('tipo');
        const serviceId = searchParams.get('serviceId');

        const imagenes = await prisma.imagen.findMany({
            where: {
                negocioId,
                tipo: tipo || undefined,
                serviceId: serviceId || undefined
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(imagenes);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener imágenes' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { url, tipo, serviceId, esBanner } = await req.json();

        const imagen = await prisma.imagen.create({
            data: {
                id: crypto.randomUUID(),
                url,
                tipo: tipo || 'GALERIA',
                negocioId,
                serviceId: serviceId || null,
                esBanner: !!esBanner
            }
        });

        return NextResponse.json(imagen);
    } catch (error) {
        console.error('Error creating image:', error);
        return NextResponse.json({ error: 'Error al guardar imagen' }, { status: 500 });
    }
}
