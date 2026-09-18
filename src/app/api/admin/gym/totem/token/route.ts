import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * GET /api/admin/gym/totem/token
 * Genera el token rotativo firmado para el modo pantalla/tótem del admin.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, nombre: true, logoUrl: true, slug: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
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
      slug: negocio.slug,
      expiresInSeconds: 90
    });
  } catch (error: any) {
    console.error('[API_ADMIN_TOTEM_TOKEN_ERROR]', error);
    return NextResponse.json({ error: 'Error al generar token del tótem' }, { status: 500 });
  }
}
