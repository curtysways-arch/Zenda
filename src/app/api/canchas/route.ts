import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    let negocioId = searchParams.get('negocioId');

    if (!negocioId) {
        const session = await getServerSession(authOptions);
        negocioId = (session?.user as any)?.negocioId;
    }

    if (!negocioId) {
        return NextResponse.json({ error: 'Negocio ID requerido' }, { status: 400 });
    }

    try {
        const servicios = await prisma.service.findMany({
            where: { negocioId, estaActivo: true },
            include: { Imagen: true },
            orderBy: { createdAt: 'desc' },
        });

        const canchas = servicios.map((s: any) => {
            const extra = typeof s.extraInfo === 'string' ? JSON.parse(s.extraInfo || '{}') : (s.extraInfo || {});
            return {
                id: s.id,
                nombre: s.nombre,
                tipo: extra.tipo || 'PÁDEL CRISTAL',
                capacidad: extra.capacidad || 4,
                precioHora: s.precio || 25,
                estaActiva: s.estaActivo ?? true,
                negocioId: s.negocioId,
                imagenes: s.Imagen || []
            };
        });

        return NextResponse.json(canchas);
    } catch (error) {
        console.error('Error fetching canchas:', error);
        return NextResponse.json({ error: 'Error al obtener canchas' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nombre, tipo, capacidad, precioHora, negocioId } = body;

        let realNegocioId = negocioId;
        if (!realNegocioId) {
            const session = await getServerSession(authOptions);
            realNegocioId = (session?.user as any)?.negocioId;
        }

        if (!realNegocioId) {
            return NextResponse.json({ error: 'Negocio ID es requerido' }, { status: 400 });
        }

        const cancha = await prisma.service.create({
            data: {
                id: `cancha-${Date.now()}`,
                negocioId: realNegocioId,
                nombre,
                precio: parseFloat(precioHora || '25'),
                duracion: 90,
                estaActivo: true,
                updatedAt: new Date(),
                extraInfo: {
                    tipo: tipo || 'PÁDEL CRISTAL',
                    capacidad: parseInt(capacidad || '4')
                } as any
            }
        });

        return NextResponse.json(cancha);
    } catch (error: any) {
        console.error('Error creating cancha:', error);
        return NextResponse.json({ error: 'Error al crear cancha: ' + (error?.message || '') }, { status: 500 });
    }
}
