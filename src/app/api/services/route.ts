import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { planLimitValidator } from '@/lib/services/planLimitValidator';
import { checkDemoRestriction } from '@/lib/demo-protection';

export async function GET(req: Request) {
    const session = await getEffectiveAdminSession();
    const sessionNegocioId = (session?.user as any)?.negocioId;
    const isDelegated = (session?.user as any)?.isDelegated === true;
    const isSuperAdmin = (session?.user as any)?.role === 'SUPERADMIN' || (session?.user as any)?.roles?.includes('SUPERADMIN');

    const { searchParams } = new URL(req.url);
    const paramNegocioId = searchParams.get('negocioId');

    // En sesión delegada o admin normal, el negocioId de la sesión efectiva manda
    let negocioId = sessionNegocioId;
    if (!negocioId || (isSuperAdmin && !isDelegated && paramNegocioId)) {
        negocioId = paramNegocioId || sessionNegocioId;
    }

    if (!negocioId || negocioId === 'undefined') {
        return NextResponse.json({ error: 'Negocio ID requerido' }, { status: 400 });
    }

    try {
        const rawServices = await prisma.service.findMany({
            where: { negocioId },
            include: { Imagen: true, imageMedia: true, Staff: true },
            orderBy: { createdAt: 'desc' },
        });

        const result = rawServices.map(s => {
            const extra = (s.extraInfo as any) || {};
            return {
                ...s,
                descripcion: extra.descripcion || '',
                imagenUrl: extra.imagenUrl || '',
                categoryId: extra.categoryId || null,
                tipo: extra.tipo || null,
                imagenes: s.Imagen || [],
                imageMedia: s.imageMedia || null,
                ubicacionId: s.ubicacionId || null
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        const sessionNegocioId = (session?.user as any)?.negocioId;

        const body = await req.json();
        const { nombre, categoryId, tipo, duracion, precio, ubicacionId, extraInfo, imageMediaId, staffIds } = body;
        const negocioId = sessionNegocioId || body.negocioId;

        if (!negocioId) {
            return NextResponse.json({ error: 'Negocio ID requerido' }, { status: 400 });
        }

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
                updatedAt: new Date(),
                Staff: staffIds && Array.isArray(staffIds) && staffIds.length > 0 ? {
                    connect: staffIds.map((id: string) => ({ id }))
                } : undefined
            } as any,
        });

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
    }
}
