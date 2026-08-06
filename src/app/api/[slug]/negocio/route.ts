// src/app/api/[slug]/negocio/route.ts
// API rápida para obtener info del negocio por slug dinámico desde el panel admin y pantallas de operación

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const negocio = await prisma.negocio.findUnique({
    where: { slug },
    select: {
      id: true,
      nombre: true,
      slug: true,
      logoUrl: true,
      colorPrimario: true,
      colorSecundario: true,
      colorTerciario: true,
      colorNeutral: true,
      colorTexto: true,
      heroTitulo: true,
      heroSubtitulo: true,
      whatsapp: true,
      direccion: true,
      ciudad: true,
      horarioApertura: true,
      horarioCierre: true,
      configuracion: true,
      isDemo: true
    }
  });

  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, negocio });
}
