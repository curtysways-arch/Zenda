import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const negocioId = (session.user as any).negocioId;
        const data = await req.json();

        // Verificar que el resultado pertenece al negocio
        const existing = await prisma.resultado.findUnique({
            where: { id }
        });

        if (!existing || existing.businessId !== negocioId) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        const updated = await prisma.resultado.update({
            where: { id },
            data: {
                ...data,
                date: data.date ? new Date(data.date) : undefined,
                gallery: data.gallery || undefined
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating result:', error);
        return NextResponse.json({ error: 'Error al actualizar resultado' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const negocioId = (session.user as any).negocioId;

        // Verificar que el resultado pertenece al negocio
        const existing = await prisma.resultado.findUnique({
            where: { id }
        });

        if (!existing || existing.businessId !== negocioId) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        }

        await prisma.resultado.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting result:', error);
        return NextResponse.json({ error: 'Error al eliminar resultado' }, { status: 500 });
    }
}
