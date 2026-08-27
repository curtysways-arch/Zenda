import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveLandingContent } from '@/lib/landingContentResolver';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const negocio = await (prisma as any).negocio.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug }
        ]
      },
      select: { id: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const content = await resolveLandingContent(negocio.id);
    return NextResponse.json(content);
  } catch (error: any) {
    console.error('[PUBLIC_LANDING_CONTENT_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener el contenido de landing' }, { status: 500 });
  }
}
