import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * GET /api/[slug]/gym/totem/token
 * Genera un token criptográfico seguro y rotativo para la pantalla/tótem del gimnasio.
 * El token expira cada 90 segundos para evitar capturas o reenvío no autorizado.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, nombre: true, logoUrl: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    const timestamp = Date.now();
    const secret = process.env.NEXTAUTH_SECRET || 'citiox_totem_secret_key_2026';
    const dataToSign = `${negocio.id}:${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex').slice(0, 16);

    const token = `CITIOX_TOTEM:${negocio.id}:${timestamp}:${signature}`;

    return NextResponse.json({
      success: true,
      token,
      businessId: negocio.id,
      businessName: negocio.nombre,
      logoUrl: negocio.logoUrl,
      expiresInSeconds: 90
    });
  } catch (error: any) {
    console.error('[API_TOTEM_TOKEN_ERROR]', error);
    return NextResponse.json({ error: 'Error al generar token del tótem' }, { status: 500 });
  }
}
