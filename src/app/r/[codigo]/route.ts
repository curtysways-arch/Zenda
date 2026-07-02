import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ codigo: string }> }
) {
    try {
        const { codigo } = await params;
        if (!codigo) {
            return NextResponse.redirect(new URL('/', req.url));
        }

        const cleanCode = codigo.trim().toUpperCase();

        // Buscar el código de referido en la base de datos
        const refCode = await prisma.referralCode.findUnique({
            where: { codigo: cleanCode },
            include: { Negocio: true }
        });

        if (!refCode) {
            console.log(`[Referidos] Enlace con código ${cleanCode} no válido. Redirigiendo a home.`);
            return NextResponse.redirect(new URL('/', req.url));
        }

        const slug = refCode.Negocio.slug;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
        const targetUrl = new URL(`/${slug}`, appUrl);

        // Crear la respuesta de redirección
        const response = NextResponse.redirect(targetUrl);

        // Guardar la cookie del código y del negocio por 7 días
        response.cookies.set('referral_code', refCode.codigo, {
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 días
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        response.cookies.set('referral_negocio', refCode.negocioId, {
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 días
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        console.log(`[Referidos] Redirección exitosa: Código ${refCode.codigo} -> Negocio /${slug}`);
        return response;
    } catch (error) {
        console.error("[Referidos] Error en redirección de referido:", error);
        return NextResponse.redirect(new URL('/', req.url));
    }
}
