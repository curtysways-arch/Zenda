import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from 'crypto';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    let negocioId = searchParams.get('negocioId');

    // Si no está en params, intentar obtener de la sesión
    if (!negocioId) {
        const session = await getServerSession(authOptions);
        negocioId = (session?.user as any)?.negocioId;
    }

    if (!negocioId || negocioId === 'undefined') {
        return NextResponse.json({ error: 'Negocio ID requerido' }, { status: 400 });
    }

    try {
        const rawServices = await prisma.service.findMany({
            where: { negocioId },
            include: { Imagen: true, imageMedia: true },
            orderBy: { createdAt: 'desc' },
        });

        // Traer ubicacionId via SQL (bypass caché de Prisma)
        const extServices: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, ubicacionId FROM Cancha WHERE negocioId = ?`,
            negocioId
        );
        const extMap = new Map(extServices.map(s => [s.id, s.ubicacionId]));

        const result = rawServices.map(s => {
            const extra = (s.extraInfo as any) || {};
            return {
                ...s,
                categoryId: extra.categoryId || null,
                tipo: extra.tipo || null,
                imagenes: s.Imagen || [],
                imageMedia: s.imageMedia || null,
                ubicacionId: extMap.get(s.id) || null
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
    }
}

import { planLimitValidator } from '@/lib/services/planLimitValidator';
import { checkDemoRestriction } from '@/lib/demo-protection';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nombre, categoryId, tipo, duracion, precio, negocioId, ubicacionId, extraInfo, imageMediaId } = body;

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction(negocioId);
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        // Validar límites del plan
        const validation = await planLimitValidator.canCreateField(negocioId);
        if (!validation.allowed) {
            return NextResponse.json({ error: validation.message }, { status: 403 });
        }

        const service = await prisma.service.create({
            data: {
                id: crypto.randomUUID(),
                nombre,
                duracion: parseInt(duracion),
                precio: parseFloat(precio),
                negocioId,
                ubicacionId: ubicacionId || null,
                imageMediaId: imageMediaId || null,
                extraInfo: {
                    ...(extraInfo || {}),
                    categoryId: categoryId || null,
                    tipo: tipo || null
                },
                updatedAt: new Date()
            } as any,
        });

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
    }
}
