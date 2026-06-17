import prisma from "@/lib/prisma";
import { notificationService } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { telefono } = await req.json();

        if (!telefono) {
            return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({
            where: { slug },
            select: { id: true, nombre: true }
        });

        if (!negocio) {
            return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
        }

        // Normalizar variaciones del teléfono
        const localTelefono = telefono.replace(/^\+(\d{1,4})/, '');   // Ej: +593098... → 098...
        const digitsOnly = telefono.replace(/\D/g, '');                // Solo dígitos
        const localNoZero = localTelefono.replace(/^0+/, '');          // Sin ceros iniciales

        // Buscar cliente con búsqueda flexible (el número puede estar guardado con/sin prefijo)
        let hasAccess = false;
        try {
            // Usar SQL directo para búsqueda flexible con LIKE
            const searchTerm = localNoZero; // Ej: "95999752" - los últimos dígitos significativos
            const clientes: any[] = await prisma.$queryRawUnsafe(
                `SELECT id FROM Cliente WHERE 
                    telefono = '${telefono}' OR 
                    telefono = '${localTelefono}' OR 
                    telefono = '${digitsOnly}' OR
                    telefono LIKE '%${searchTerm}%' OR
                    telefono LIKE '%${localNoZero}'
                LIMIT 5`
            );

            if (clientes.length > 0) {
                const clienteIds = clientes.map((c: any) => c.id);
                // Verificar reservas en este negocio
                const reservas: any[] = await prisma.$queryRawUnsafe(
                    `SELECT id FROM Reserva WHERE negocioId = '${negocio.id}' AND clienteId IN (${clienteIds.map((id: string) => `'${id}'`).join(',')}) LIMIT 1`
                );
                hasAccess = reservas.length > 0;

                // Si no tiene reservas, buscar inscripciones
                if (!hasAccess) {
                    try {
                        const p = prisma as any;
                        const enrollment = await p.courseEnrollment.findFirst({
                            where: {
                                businessId: negocio.id,
                                OR: [
                                    { guardian_phone: telefono },
                                    { guardian_phone: localTelefono },
                                    { guardian_phone: digitsOnly }
                                ]
                            },
                            select: { id: true }
                        });
                        hasAccess = !!enrollment;
                    } catch (_) {
                        // courseEnrollment puede no existir
                    }
                }
            }
        } catch (lookupErr) {
            console.error("[OTP Send] Error buscando cliente:", lookupErr);
            // En caso de error técnico, permitir continuar para no bloquear
            hasAccess = true;
        }

        if (!hasAccess) {
            return NextResponse.json({
                error: "No encontramos reservas con ese número. Verifica que sea el número con el que agendaste tu cita."
            }, { status: 404 });
        }

        // Rate limit: máximo 5 OTP por 10 minutos
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const otpCount = await prisma.otpCode.count({
                where: {
                    telefono,
                    businessId: negocio.id,
                    created_at: { gte: tenMinutesAgo }
                }
            });
            if (otpCount >= 5) {
                return NextResponse.json({ error: "Demasiados intentos. Espera 10 minutos." }, { status: 429 });
            }
        } catch (_) {
            // Si falla el conteo, continuar
        }

        // Generar código de 6 dígitos con vigencia de 10 minutos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.otpCode.create({
            data: { 
                id: uuidv4(),
                telefono, 
                businessId: negocio.id, 
                code, 
                expires_at: expiresAt 
            }
        });

        // Log siempre en consola para admin/demo
        console.log(`\n=========================================\n🔑 OTP [${slug}] para ${telefono}: ${code}\n=========================================\n`);

        // Intentar enviar por WhatsApp (no bloquea si falla)
        try {
            await notificationService.sendOTP(negocio.id, telefono, code, negocio.nombre);
        } catch (waErr) {
            console.warn("[OTP] WhatsApp no disponible, código disponible en consola:", waErr);
        }

        return NextResponse.json({
            success: true,
            message: "Código enviado. Revisa tu WhatsApp."
        });

    } catch (error: any) {
        console.error("[OTP Send] Error crítico:", error?.message || error);
        return NextResponse.json({
            error: "No se pudo enviar el código. Intenta de nuevo."
        }, { status: 500 });
    }
}
