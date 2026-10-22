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
        const { telefono, purpose, isRegistration } = await req.json();

        if (!telefono) {
            return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 });
        }

        const negocio = await prisma.negocio.findUnique({
            where: { slug },
            select: { id: true, nombre: true, tipoNegocio: true }
        });

        if (!negocio) {
            return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
        }

        // Normalizar variaciones del teléfono
        const localTelefono = telefono.replace(/^\+(\d{1,4})/, '');   // Ej: +593098... → 098...
        const digitsOnly = telefono.replace(/\D/g, '');                // Solo dígitos
        const localNoZero = localTelefono.replace(/^0+/, '');          // Sin ceros iniciales

        const tipoNegocio = ((negocio as any).tipoNegocio || 'PRODUCTOS').toUpperCase();
        const isGym = tipoNegocio === 'GIMNASIO' || tipoNegocio === 'GYM' || slug.includes('fitness') || slug.includes('gym');
        const isLaundry = tipoNegocio === 'LAVANDERIA' || tipoNegocio === 'LAVANDERIAS' || tipoNegocio === 'LAUNDRY' || tipoNegocio === 'SHOE_CARE' || slug.includes('lavad') || slug.includes('bubble');

        // Para checkout/adquisición de membresía, registro nuevo, lavanderías o ecommerce, se permite enviar OTP
        let hasAccess = purpose === 'MEMBERSHIP_CHECKOUT' || isRegistration === true || isLaundry || tipoNegocio === 'PRODUCTOS' || tipoNegocio === 'RESTAURANTE';

        if (!hasAccess) {
            try {
                // Usar SQL directo para búsqueda flexible con LIKE
                const searchTerm = localNoZero; // Ej: "95999752" - los últimos dígitos significativos
                const clientes: any[] = await prisma.$queryRawUnsafe(
                    `SELECT id FROM Cliente WHERE 
                        negocioId = '${negocio.id}' AND (
                            telefono = '${telefono}' OR 
                            telefono = '${localTelefono}' OR 
                            telefono = '${digitsOnly}' OR
                            telefono LIKE '%${searchTerm}%' OR
                            telefono LIKE '%${localNoZero}'
                        )
                    LIMIT 5`
                );

                if (clientes.length > 0) {
                    const clienteIds = clientes.map((c: any) => c.id);

                    if (isGym) {
                        // En gimnasio, si el cliente existe o tiene membresía
                        const p = prisma as any;
                        const mem = await p.membership.findFirst({
                            where: {
                                businessId: negocio.id,
                                customerId: { in: clienteIds }
                            }
                        });
                        hasAccess = !!mem || clientes.length > 0;
                    } else {
                        // Verificar reservas en este negocio si es negocio de citas
                        const reservas: any[] = await prisma.$queryRawUnsafe(
                            `SELECT id FROM Reserva WHERE negocioId = '${negocio.id}' AND clienteId IN (${clienteIds.map((id: string) => `'${id}'`).join(',')}) LIMIT 1`
                        );
                        hasAccess = reservas.length > 0;

                        // Si no tiene reservas, buscar pedidos
                        if (!hasAccess) {
                            const pedidoMatch = await prisma.pedido.findFirst({
                                where: {
                                    negocioId: negocio.id,
                                    OR: [
                                        { telefonoCliente: telefono },
                                        { telefonoCliente: localTelefono },
                                        { telefonoCliente: digitsOnly },
                                        { telefonoCliente: { endsWith: localNoZero } }
                                    ]
                                },
                                select: { id: true }
                            });
                            hasAccess = !!pedidoMatch;
                        }

                        // Si no tiene reservas ni pedidos, buscar inscripciones
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
                            } catch (_) {}
                        }
                    }
                } else {
                    // Si no está en tabla Cliente, buscar si tiene pedidos registrados
                    const pedidoMatch = await prisma.pedido.findFirst({
                        where: {
                            negocioId: negocio.id,
                            OR: [
                                { telefonoCliente: telefono },
                                { telefonoCliente: localTelefono },
                                { telefonoCliente: digitsOnly },
                                { telefonoCliente: { endsWith: localNoZero } }
                            ]
                        },
                        select: { id: true }
                    });
                    if (pedidoMatch) {
                        hasAccess = true;
                    }
                }
            } catch (lookupErr) {
                console.error("[OTP Send] Error buscando cliente:", lookupErr);
                hasAccess = true;
            }
        }

        if (!hasAccess && tipoNegocio !== 'PRODUCTOS' && !isLaundry) {
            const notFoundMsg = isGym
                ? "No encontramos una cuenta de socio registrada con este número. Selecciona una membresía para registrarte."
                : "No encontramos registros con este número en el sistema.";
            return NextResponse.json({
                error: notFoundMsg
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
