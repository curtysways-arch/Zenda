import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';
import { whatsappService } from '@/lib/whatsapp';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT } from 'jose';

// Memoria caché de respaldo rápida para entornos de desarrollo y producción
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, phone, code, slug = 'pinchos' } = body;

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'El número de teléfono es requerido.' },
                { status: 400 }
            );
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 7) {
            return NextResponse.json(
                { success: false, error: 'Número de teléfono inválido.' },
                { status: 400 }
            );
        }

        // Buscar negocio flexiblemente para enviar el OTP por WhatsApp
        let negocio = await prisma.negocio.findFirst({
            where: { OR: [{ slug }, { slug: 'pinchos' }, { slug: 'pincho-listo' }] },
            select: { id: true, nombre: true }
        });

        if (!negocio) {
            negocio = await prisma.negocio.findFirst({
                select: { id: true, nombre: true }
            });
        }

        const storeName = negocio?.nombre || 'PinchoListo';

        if (action === 'send_otp') {
            // Generar código OTP real de 6 dígitos aleatorios
            const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // Válido por 10 minutos

            // Guardar en memoria caché
            otpStore.set(cleanPhone, { code: generatedCode, expiresAt });

            // Guardar en la tabla OtpCode de Prisma
            if (negocio) {
                try {
                    await prisma.otpCode.create({
                        data: {
                            id: uuidv4(),
                            telefono: cleanPhone,
                            businessId: negocio.id,
                            code: generatedCode,
                            expires_at: new Date(expiresAt)
                        }
                    });
                } catch (e) {
                    console.warn('[OTP Auth] No se pudo guardar en OtpCode, usando respaldo en memoria:', e);
                }
            }

            console.log(`\n=========================================\n🔑 OTP Citiox [${cleanPhone}]: ${generatedCode}\n=========================================\n`);

            // 1. Enviar mensaje de WhatsApp directo a través del Bot oficial de WhatsApp
            const waMsg = `🔑 *Código de Verificación OTP*\n\nHola, tu código de acceso para *${storeName}* es: *${generatedCode}*\n\n_Válido por 10 minutos. No compartas este código con nadie._`;
            
            try {
                await whatsappService.sendWhatsApp(cleanPhone, waMsg);
            } catch (directWaErr) {
                console.warn('[OTP Auth] WhatsApp directo no enviado:', directWaErr);
            }

            // 2. Intentar también vía notificationService por plantilla oficial
            if (negocio) {
                try {
                    await notificationService.sendOTP(negocio.id, cleanPhone, generatedCode, storeName);
                } catch (waErr) {
                    console.warn('[OTP Auth] NotificationService sendOTP omitido:', waErr);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Código OTP de 6 dígitos enviado a tu WhatsApp (${cleanPhone}).`
            });
        }

        if (action === 'verify_otp') {
            if (!code || code.trim().length === 0) {
                return NextResponse.json(
                    { success: false, error: 'El código OTP es requerido.' },
                    { status: 400 }
                );
            }

            const cleanCode = code.trim();
            const stored = otpStore.get(cleanPhone);

            const isValidStored = stored && stored.code.trim() === cleanCode && Date.now() <= stored.expiresAt;

            let isValidDb = false;
            if (negocio && !isValidStored) {
                try {
                    const dbOtp = await prisma.otpCode.findFirst({
                        where: {
                            telefono: cleanPhone,
                            businessId: negocio.id,
                            code: cleanCode,
                            verified: false,
                            expires_at: { gt: new Date() }
                        },
                        orderBy: { created_at: 'desc' }
                    });
                    if (dbOtp) {
                        isValidDb = true;
                        await prisma.otpCode.update({
                            where: { id: dbOtp.id },
                            data: { verified: true }
                        });
                    }
                } catch (dbErr) {
                    console.warn('[OTP Auth] Error buscando en DB:', dbErr);
                }
            }

            if (isValidStored || isValidDb) {
                // Generar token JWT universal de cliente (customer_token)
                const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
                const token = await new SignJWT({
                    telefono: cleanPhone,
                    negocioId: negocio?.id || '',
                    slug: slug
                })
                    .setProtectedHeader({ alg: "HS256" })
                    .setIssuedAt()
                    .setExpirationTime("30d")
                    .sign(secret);

                const response = NextResponse.json({
                    success: true,
                    message: 'Sesión verificada exitosamente.',
                    phone: cleanPhone,
                    token
                });

                // Cookie principal httpOnly de sesión cliente en todo el dominio
                response.cookies.set("customer_token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 60 * 60 * 24 * 30, // 30 días
                    path: "/",
                });

                // Cookie de señal pública para JS del navegador
                response.cookies.set("cs", "1", {
                    httpOnly: false,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 60 * 60 * 24 * 30, // 30 días
                    path: "/",
                });

                return response;
            }

            return NextResponse.json(
                { success: false, error: 'El código OTP ingresado es incorrecto o ha expirado.' },
                { status: 400 }
            );
        }

        if (action === 'restore_session') {
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
            const token = await new SignJWT({
                telefono: cleanPhone,
                negocioId: negocio?.id || '',
                slug: slug
            })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("30d")
                .sign(secret);

            const response = NextResponse.json({
                success: true,
                message: 'Sesión restaurada exitosamente.',
                phone: cleanPhone,
                token
            });

            response.cookies.set("customer_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 30, // 30 días
                path: "/",
            });

            response.cookies.set("cs", "1", {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 30, // 30 días
                path: "/",
            });

            return response;
        }

        return NextResponse.json(
            { success: false, error: 'Acción no válida.' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('[OTP Auth] Error crítico:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error interno al procesar OTP.' },
            { status: 500 }
        );
    }
}
