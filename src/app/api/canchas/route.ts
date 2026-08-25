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
        let servicios = await prisma.service.findMany({
            where: { negocioId, estaActivo: true },
            include: { Imagen: true },
            orderBy: { createdAt: 'desc' },
        });

        // Si el negocio de canchas no tiene canchas registradas en la DB, sembrar automáticamente las 5 canchas iniciales
        if (servicios.length === 0) {
            const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
            if (negocio && (negocio.slug === 'demo-canchas' || negocio.tipoNegocio === 'SPORTS_COURTS')) {
                const canchasDefecto = [
                    { nombre: 'CANCHA ELITE', duracion: 60, precio: 25.00, extraInfo: { tipo: 'FÚTBOL 7', capacidad: 14 }, imagenUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=800' },
                    { nombre: 'CANCHA PREMIUM', duracion: 60, precio: 45.00, extraInfo: { tipo: 'FÚTBOL 7', capacidad: 14 }, imagenUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&q=80&w=800' },
                    { nombre: 'CANCHA BASQUET', duracion: 60, precio: 35.00, extraInfo: { tipo: 'BÁSQUET', capacidad: 10 }, imagenUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800' },
                    { nombre: 'CANCHA 01 - PÁDEL CRISTAL', duracion: 60, precio: 25.00, extraInfo: { tipo: 'PÁDEL CRISTAL', capacidad: 4 }, imagenUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=800' },
                    { nombre: 'CANCHA 02 - TENIS ARCILLA', duracion: 60, precio: 20.00, extraInfo: { tipo: 'TENIS', capacidad: 2 }, imagenUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=800' }
                ];

                for (const c of canchasDefecto) {
                    const created = await prisma.service.create({
                        data: {
                            id: `cancha-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                            negocioId,
                            nombre: c.nombre,
                            duracion: c.duracion,
                            precio: c.precio,
                            estaActivo: true,
                            updatedAt: new Date(),
                            extraInfo: c.extraInfo
                        }
                    });
                    await prisma.imagen.create({
                        data: {
                            id: `img-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                            url: c.imagenUrl,
                            tipo: 'GALERIA',
                            negocioId,
                            serviceId: created.id
                        }
                    });
                }

                servicios = await prisma.service.findMany({
                    where: { negocioId, estaActivo: true },
                    include: { Imagen: true },
                    orderBy: { createdAt: 'desc' },
                });
            }
        }

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
