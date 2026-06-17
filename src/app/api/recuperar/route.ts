import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        const user = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
        }

        if (!user.phone) {
            return NextResponse.json({ error: 'La cuenta no tiene un celular registrado para recuperar accesos' }, { status: 400 });
        }

        // Generar OTP numérico de 6 dígitos
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await prisma.usuario.update({
            where: { id: user.id },
            data: {
                otp_code: otpCode,
                otp_expiry: otpExpiry
            }
        });

        const maskedPhone = user.phone.substring(0, 3) + '****' + user.phone.slice(-3);

        const waMessage = `🔒 *Recuperación de Contraseña*

Hola ${user.nombre || 'Administrador'},

Has solicitado restablecer tu contraseña para acceder al panel.
✅ Tu código de validación PIN es: *${otpCode}*

_Este código expira en 15 minutos. Si no solicitaste esto, ignora este mensaje._`;

        // Enviar WA en background (fire-and-forget)
        Promise.resolve().then(() => {
            whatsappService.sendWhatsApp(user.phone!, waMessage, true, 'recuperacion')
                .catch((e: any) => console.error('[RECUPERAR WA ERROR]', e?.message));
        });

        return NextResponse.json({ 
            success: true, 
            maskedPhone
        });

    } catch (error: any) {
        console.error('[RECUPERAR API ERROR]', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
