import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    const log: string[] = [];
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // 1. Resetear demo@cancha.com
        const demoUser = await prisma.usuario.upsert({
            where: { email: 'demo@cancha.com' },
            update: { password: hashedPassword, role: 'ADMIN' },
            create: {
                nombre: 'Demo User',
                email: 'demo@cancha.com',
                password: hashedPassword,
                role: 'ADMIN',
                status: 'verified'
            }
        });
        
        // Vincular al negocio demo
        const negocio = await prisma.negocio.findUnique({ where: { slug: 'complejo-test' } });
        if (negocio) {
            await prisma.usuario.update({
                where: { id: demoUser.id },
                data: { negocioId: negocio.id }
            });
            log.push(`✅ Usuario demo@cancha.com listo con acceso a ${negocio.nombre}`);
        }

        // 2. Asegurar superadmin@cancha.com
        const saPassword = await bcrypt.hash('superadmin123', 10);
        await prisma.usuario.upsert({
            where: { email: 'superadmin@cancha.com' },
            update: { password: saPassword, role: 'SUPER_ADMIN', negocioId: negocio?.id },
            create: {
                nombre: 'Super Admin',
                email: 'superadmin@cancha.com',
                password: saPassword,
                role: 'SUPER_ADMIN',
                negocioId: negocio?.id
            }
        });
        log.push('✅ Super Admin (superadmin@cancha.com) listo con contraseña: superadmin123');

        return NextResponse.json({ 
            success: true, 
            accesos: [
                { email: 'demo@cancha.com', password: 'admin123', role: 'ADMIN' },
                { email: 'superadmin@cancha.com', password: 'superadmin123', role: 'SUPER_ADMIN' }
            ],
            log 
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
