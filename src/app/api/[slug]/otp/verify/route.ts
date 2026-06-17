import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { telefono, code } = await req.json();

        if (!telefono || !code) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({
            where: { slug }
        });

        if (!negocio) {
            return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
        }

        // Buscar el último código para ese teléfono y negocio
        const otpEntry = await prisma.otpCode.findFirst({
            where: {
                telefono,
                businessId: negocio.id,
                code,
                verified: false,
                expires_at: { gt: new Date() }
            },
            orderBy: { created_at: 'desc' }
        });

        if (!otpEntry) {
            return NextResponse.json({ error: "El código es incorrecto o ha expirado." }, { status: 400 });
        }

        // Marcar como verificado e invalidarlo para futuros usos
        await prisma.otpCode.update({
            where: { id: otpEntry.id },
            data: { verified: true }
        });

        // Buscar si existe un Usuario con este teléfono para obtener sus roles
        // Variaciones del teléfono para máxima compatibilidad
        const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = telefono.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

        const usuario = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: telefono },
                    { phone: localTelefono },
                    { phone: digitsOnly },
                    { phone: { endsWith: localNoZero } }
                ]
            },
            include: {
                UserRole: {
                    include: {
                        Role: true
                    }
                }
            }
        });

        const roles = usuario?.UserRole.map(ur => (ur as any).Role.name) || ['USER'];
        // Si no tiene el rol USER explícitamente pero es un cliente conocido, nos aseguramos que tenga USER
        if (!roles.includes('USER')) {
            roles.push('USER');
        }

        // Generar JWT para sesión temporal
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        const token = await new SignJWT({
            telefono,
            negocioId: negocio.id,
            slug: slug,
            userId: usuario?.id || null,
            roles: roles
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("30d") // Aumentamos a 30 días para comodidad del profesor
            .sign(secret);

        const response = NextResponse.json({
            success: true,
            message: "Verificación exitosa",
            roles: roles,
            redirectTo: roles.length > 1 
                ? `/${slug}/modo-selector` 
                : roles.includes('PROFESOR') 
                    ? '/profesor' 
                    : roles.includes('ADMIN_NEGOCIO') 
                        ? '/admin' 
                        : roles.includes('SUPERADMIN')
                            ? '/admin' // O /superadmin si existiera una ruta separada
                            : `/${slug}/mis-cursos`
        });

        // Guardar token en cookie segura httpOnly por 24 horas
        response.cookies.set("customer_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 horas
            path: "/", // Permitir en todo el sitio para el slug correspondiente
        });

        return response;
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return NextResponse.json({ error: "Ocurrió un error inesperado durante la verificación." }, { status: 500 });
    }
}
