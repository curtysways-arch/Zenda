// src/app/api/demo/fix-restaurant-tipo/route.ts
// Fix puntual: actualiza tipoNegocio de parrilla-citiox-demo a 'PRODUCTOS'

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug: 'parrilla-citiox-demo' },
      select: { id: true, tipoNegocio: true, nombre: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    if (negocio.tipoNegocio === 'PRODUCTOS') {
      return NextResponse.json({ status: 'ALREADY_OK', tipoNegocio: negocio.tipoNegocio });
    }

    const updated = await prisma.negocio.update({
      where: { slug: 'parrilla-citiox-demo' },
      data: { tipoNegocio: 'PRODUCTOS', updatedAt: new Date() },
      select: { id: true, tipoNegocio: true, nombre: true }
    });

    return NextResponse.json({ 
      status: 'FIXED', 
      before: negocio.tipoNegocio,
      after: updated.tipoNegocio,
      negocio: updated
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
