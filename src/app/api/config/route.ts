import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const configs = await prisma.configuracion.findMany({
            where: { negocioId }
        });

        return NextResponse.json(configs);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const { clave, valor } = body;

        const config = await prisma.configuracion.upsert({
            where: {
                clave_negocioId: {
                    clave,
                    negocioId
                }
            },
            update: { valor },
            create: {
                clave,
                valor,
                negocioId
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error saving config:', error);
        return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
    }
}
