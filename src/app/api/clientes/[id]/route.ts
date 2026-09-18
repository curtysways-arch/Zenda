import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        let negocioId = (session.user as any).negocioId;
        if (!negocioId && session.user.email) {
            const u = await prisma.usuario.findUnique({ where: { email: session.user.email } });
            negocioId = u?.negocioId;
        }

        const { id } = await params;

        const cliente = await prisma.cliente.findUnique({
            where: { id },
            include: {
                Appointment: {
                    orderBy: { fecha: 'desc' },
                    include: {
                        service: { select: { id: true, nombre: true, precio: true } },
                        staff: { select: { id: true, name: true, role: true } }
                    }
                },
                clinicalRecord: true
            }
        });

        if (!cliente) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
        }

        // Multi-tenant check
        if (negocioId && cliente.negocioId !== negocioId) {
            return NextResponse.json({ error: 'Acceso no autorizado a este cliente' }, { status: 403 });
        }

        return NextResponse.json(cliente);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        let negocioId = (session.user as any).negocioId;
        if (!negocioId && session.user.email) {
            const u = await prisma.usuario.findUnique({ where: { email: session.user.email } });
            negocioId = u?.negocioId;
        }

        const { id } = await params;
        const body = await req.json();

        const existing = await prisma.cliente.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
        }

        if (negocioId && existing.negocioId !== negocioId) {
            return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
        }

        const updated = await prisma.cliente.update({
            where: { id },
            data: {
                nombre: body.nombre !== undefined ? body.nombre : existing.nombre,
                telefono: body.telefono !== undefined ? body.telefono : existing.telefono,
                email: body.email !== undefined ? body.email : existing.email,
                fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : existing.fechaNacimiento,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
