// src/app/api/[slug]/channels/route.ts
// API para leer y actualizar la configuración de Canales Activos del Runtime
// Los canales se almacenan en negocio.configuracion.channels (Runtime Configuration Override)
// SIN modificar el manifest original

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const cfg = (negocio.configuracion as any) || {};
  const channels = cfg.channels || {};

  return NextResponse.json({ success: true, channels, negocioId: negocio.id });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { channels } = body;

  if (!channels || typeof channels !== 'object') {
    return NextResponse.json({ error: 'Se requiere un objeto channels válido.' }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const currentCfg = (negocio.configuracion as any) || {};
  const updatedCfg = {
    ...currentCfg,
    channels: { ...(currentCfg.channels || {}), ...channels }
  };

  await prisma.negocio.update({
    where: { slug },
    data: { configuracion: updatedCfg as any, updatedAt: new Date() }
  });

  return NextResponse.json({ success: true, channels: updatedCfg.channels });
}
