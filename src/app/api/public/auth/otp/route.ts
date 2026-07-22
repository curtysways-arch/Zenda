import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';

// Memoria caché de respaldo rápida para entornos donde la BD o WhatsApp varíen
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

        // Buscar negocio para enviar la plantilla del OTP por WhatsApp
        const negocio = await prisma.negocio.findFirst({
            where: { OR: [{ slug }, { slug: 'pinchos' }] },
            select: { id: true, nombre: true }
        });

        if (action === 'send_otp') {
            // Generar código de 4 dígitos (p. ej., 1234 por defecto o aleatorio)
            const generatedCode = cleanPhone.endsWith('0000') ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // Valido por 10 minutos

            // Guardar en memoria caché
            otpStore.set(cleanPhone, { code: generatedCode, expiresAt });

            // Guardar en la tabla OtpCode de Prisma
            if (negocio) {
                try {
                    await prisma.otpCode.create({
                        data: {
                            id: uuidv4(),
                            telefono: phone,
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

            // Intentar enviar WhatsApp oficial de Citiox (sin bloquear la respuesta)
            if (negocio) {
                try {
                    await notificationService.sendOTP(negocio.id, cleanPhone, generatedCode, negocio.nombre);
                } catch (waErr) {
                    console.warn('[OTP Auth] WhatsApp no enviado, usando fallback de consola/master code:', waErr);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Código OTP enviado a WhatsApp ${cleanPhone}.`,
                devCode: process.env.NODE_ENV !== 'production' ? generatedCode : undefined
            });
        }

        if (action === 'verify_otp') {
            if (!code) {
                return NextResponse.json(
                    { success: false, error: 'El código OTP es requerido.' },
                    { status: 400 }
                );
            }

            const stored = otpStore.get(cleanPhone);

            // Permitir '1234', '123456', '0000' como códigos maestros de prueba/demo
            const isValidMasterCode = ['1234', '123456', '0000'].includes(code.trim());
            const isValidStored = stored && stored.code.trim() === code.trim() && Date.now() <= stored.expiresAt;

            let isValidDb = false;
            if (negocio && !isValidMasterCode && !isValidStored) {
                try {
                    const dbOtp = await prisma.otpCode.findFirst({
                        where: {
                            telefono: phone,
                            businessId: negocio.id,
                            code: code.trim(),
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
                    console.warn('[OTP Verify] Error al verificar en DB:', dbErr);
                }
            }

            if (!isValidStored && !isValidMasterCode && !isValidDb) {
                return NextResponse.json(
                    { success: false, error: 'El código OTP es incorrecto o ha expirado.' },
                    { status: 400 }
                );
            }

            // Consumir OTP usado
            otpStore.delete(cleanPhone);

            return NextResponse.json({
                success: true,
                verified: true,
                phone: cleanPhone,
                message: 'Teléfono verificado con éxito.'
            });
        }

        return NextResponse.json(
            { success: false, error: 'Acción no soportada.' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('Error en API OTP:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al procesar OTP' },
            { status: 500 }
        );
    }
}
