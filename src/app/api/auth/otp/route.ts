import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── POST: Generar y enviar OTP por teléfono/WhatsApp ────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { telefono, negocioId = 'system' } = body;

    if (!telefono) {
      return NextResponse.json({ error: 'El teléfono es requerido' }, { status: 400 });
    }

    const cleanPhone = telefono.replace(/\D/g, '');
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Guardar OTP en la DB usando OtpCode
    await prisma.otpCode.create({
      data: {
        id: `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        telefono: cleanPhone,
        businessId: negocioId,
        code,
        expires_at: expiresAt,
      },
    });

    const waMessage = `Tu código de verificación Citiox es: *${code}*. Vence en 10 minutos.`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    console.log(`[OTP_SENT] Telefono: ${cleanPhone}, Code: ${code}`);

    return NextResponse.json({
      ok: true,
      message: 'OTP generado exitosamente',
      code, // Devuelto en desarrollo para testing fácil
      whatsapp: {
        phone: cleanPhone,
        message: waMessage,
        url: waUrl,
      },
    });
  } catch (error) {
    console.error('[OTP SEND ERROR]', error);
    return NextResponse.json({ error: 'Error enviando OTP' }, { status: 500 });
  }
}

// ─── PUT: Validar OTP ─────────────────────────────────────────────────────────
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { telefono, code } = body;

    if (!telefono || !code) {
      return NextResponse.json({ error: 'Teléfono y código son requeridos' }, { status: 400 });
    }

    const cleanPhone = telefono.replace(/\D/g, '');

    const otp = await prisma.otpCode.findFirst({
      where: {
        telefono: cleanPhone,
        code: code.trim(),
        verified: false,
        expires_at: { gte: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otp) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 });
    }

    // Marcar como verificado
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    console.error('[OTP VERIFY ERROR]', error);
    return NextResponse.json({ error: 'Error verificando OTP' }, { status: 500 });
  }
}
