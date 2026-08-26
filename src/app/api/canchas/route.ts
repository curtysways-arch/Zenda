import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import crypto from 'crypto';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    let negocioId = searchParams.get('negocioId');

    if (!negocioId) {
        const session = await getServerSession();
        negocioId = (session?.user as any)?.negocioId;
    }

    if (!negocioId) {
        return NextResponse.json({ error: 'Negocio ID requerido' }, { status: 400 });
    }

    try {
        const servicios = await (prisma as any).service.findMany({
            where: { negocioId },
            include: { Imagen: true },
            orderBy: { createdAt: 'desc' },
        });

        const canchas = servicios.map((s: any) => {
            const extra = typeof s.extraInfo === 'string' ? JSON.parse(s.extraInfo || '{}') : (s.extraInfo || {});
            return {
                id: s.id,
                nombre: s.nombre,
                tipo: extra.tipo || 'Fútbol 5',
                tipoId: extra.tipoId || '',
                capacidad: extra.capacidad || 10,
                precioHora: s.precio || 0,
                estaActiva: s.estaActivo ?? true,
                ubicacionId: s.ubicacionId || null,
                negocioId: s.negocioId,
                extraInfo: extra,
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
        const { nombre, tipo, tipoId, capacidad, precioHora, estaActiva, ubicacionId, extraInfo, imagenes, negocioId } = body;

        let realNegocioId = negocioId;
        if (!realNegocioId) {
            const session = await getServerSession();
            realNegocioId = (session?.user as any)?.negocioId;
        }

        if (!realNegocioId) {
            return NextResponse.json({ error: 'Negocio ID es requerido' }, { status: 400 });
        }

        const canchaId = `cancha-${Date.now()}`;

        const cancha = await (prisma as any).service.create({
            data: {
                id: canchaId,
                negocioId: realNegocioId,
                nombre,
                precio: parseFloat(precioHora || '0'),
                duracion: 60,
                estaActivo: estaActiva ?? true,
                ubicacionId: ubicacionId || null,
                updatedAt: new Date(),
                extraInfo: {
                    tipo: tipo || 'Fútbol 5',
                    tipoId: tipoId || null,
                    capacidad: parseInt(capacidad || '10'),
                    features: extraInfo?.features || []
                },
                ...(Array.isArray(imagenes) && imagenes.length > 0 ? {
                    Imagen: {
                        create: imagenes.map((img: any) => ({
                            id: crypto.randomUUID(),
                            url: typeof img === 'string' ? img : img.url,
                            tipo: 'CANCHA',
                            negocioId: realNegocioId,
                            updatedAt: new Date()
                        }))
                    }
                } : {})
            },
            include: { Imagen: true }
        });

        return NextResponse.json(cancha);
    } catch (error: any) {
        console.error('Error creating cancha:', error);
        return NextResponse.json({ error: 'Error al crear cancha: ' + (error?.message || '') }, { status: 500 });
    }
}
