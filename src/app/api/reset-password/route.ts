import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { email, otp, newPassword } = await req.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'Faltan campos (email, otp, contraseña nueva requeridos)' }, { status: 400 });
        }
        
        const cleanOtp = otp.toString().trim();

        const user = await prisma.usuario.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
        }

        if (!user.otp_code || !user.otp_expiry) {
            return NextResponse.json({ error: 'No se ha solicitado ningún código de recuperación' }, { status: 400 });
        }

        // Verificar si expiró
        const now = new Date();
        if (now > user.otp_expiry) {
            return NextResponse.json({ error: 'El código OTP ha expirado. Solicita uno nuevo.' }, { status: 400 });
        }

        if (user.otp_code !== cleanOtp) {
            return NextResponse.json({ error: 'El código OTP es inválido' }, { status: 400 });
        }

        // Si pasó las pruebas, hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Guardar la nueva contraseña y LIMPIAR el OTP por seguridad
        await prisma.usuario.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                otp_code: null,
                otp_expiry: null
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error: any) {
        console.error('[RESET PASSWORD API ERROR]', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
