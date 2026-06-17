import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const users = await prisma.usuario.findMany({
            where: {
                OR: [
                    { role: 'SUPER_ADMIN' },
                    { negocio: { slug: 'complejo-test' } }
                ]
            },
            select: {
                nombre: true,
                email: true,
                role: true,
                negocio: { select: { nombre: true, slug: true } }
            }
        });

        return NextResponse.json({ 
            mensaje: "Accesos recomendados para la demo",
            usuarios: users,
            tip: "Usa el email de Super Admin para tener control total."
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
