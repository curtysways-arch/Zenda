// src/app/api/[slug]/negocio/route.ts
// API rápida para obtener y actualizar info del negocio por slug dinámico desde el panel admin

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();

  const negocio = await prisma.negocio.findUnique({ where: { slug } });
  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

  const {
    nombre,
    logoUrl,
    colorPrimario,
    colorSecundario,
    colorTerciario,
    colorNeutral,
    colorTexto,
    heroTitulo,
    heroSubtitulo,
    whatsapp,
    direccion,
    ciudad,
    horarioApertura,
    horarioCierre,
    bannerUrl
  } = body;

  const currentCfg = (negocio.configuracion as any) || {};
  const updatedCfg = {
    ...currentCfg,
    bannerUrl: bannerUrl !== undefined ? bannerUrl : currentCfg.bannerUrl
  };

  const updated = await prisma.negocio.update({
    where: { slug },
    data: {
      ...(nombre && { nombre }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(colorPrimario && { colorPrimario }),
      ...(colorSecundario && { colorSecundario }),
      ...(colorTerciario && { colorTerciario }),
      ...(colorNeutral && { colorNeutral }),
      ...(colorTexto && { colorTexto }),
      ...(heroTitulo !== undefined && { heroTitulo }),
      ...(heroSubtitulo !== undefined && { heroSubtitulo }),
      ...(whatsapp !== undefined && { whatsapp }),
      ...(direccion !== undefined && { direccion }),
      ...(ciudad !== undefined && { ciudad }),
      ...(horarioApertura !== undefined && { horarioApertura }),
      ...(horarioCierre !== undefined && { horarioCierre }),
      configuracion: updatedCfg as any,
      updatedAt: new Date()
    }
  });

  return NextResponse.json({ success: true, negocio: updated });
}
