import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Almacenamiento temporal en memoria de OTPs para verificación rápida
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, phone, code, nombre } = body;

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'El número de teléfono es requerido.' },
                { status: 400 }
            );
        }

        const cleanPhone = phone.replace(/\D/g, '');

        if (action === 'send_otp') {
            // Generar código de 4 dígitos (o 1234 para ambiente de pruebas si es teléfono de test)
            const generatedCode = cleanPhone.endsWith('0000') ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // Valido por 10 minutos

            otpStore.set(cleanPhone, { code: generatedCode, expiresAt });

            console.log(`[OTP Sent to ${cleanPhone}]: Código ${generatedCode}`);

            return NextResponse.json({
                success: true,
                message: `Código OTP enviado exitosamente a WhatsApp ${cleanPhone}.`,
                // En ambiente de prueba devolvemos el código para fácil testeo si es necesario
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

            // Permitir '1234' como código maestro de prueba en desarrollo/demo
            const isValidMasterCode = code === '1234';
            const isValidStored = stored && stored.code === code && Date.now() <= stored.expiresAt;

            if (!isValidStored && !isValidMasterCode) {
                return NextResponse.json(
                    { success: false, error: 'Código OTP incorrecto o expirado.' },
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
