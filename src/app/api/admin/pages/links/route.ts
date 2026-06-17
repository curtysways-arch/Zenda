import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const businessId = (session.user as any).negocioId;
        if (!businessId) return new NextResponse('No business ID', { status: 400 });

        // Obtener canchas (servicios)
        const canchas = await prisma.service.findMany({
            where: { negocioId: businessId, estaActivo: true },
            select: { id: true, nombre: true }
        });

        // Obtener promociones
        let promociones = [];
        try {
            promociones = await prisma.promotion.findMany({
                where: { businessId: businessId },
                select: { id: true, titulo: true }
            });
        } catch (e) {
            console.error('Error fetching promotions in links api', e);
        }

        // Obtener cursos / academia
        let cursos = [];
        try {
            cursos = await prisma.course.findMany({
                where: { businessId: businessId, status: 'active' },
                select: { id: true, name: true }
            });
        } catch (e) {
            console.error('Error fetching courses in links api', e);
        }

        return NextResponse.json({
            canchas,
            promociones,
            cursos
        });
    } catch (error) {
        console.error('[LINKS_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
