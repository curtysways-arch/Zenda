import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const seasons = await prisma.globalSeason.findMany({
      orderBy: {
        fechaInicio: 'desc'
      }
    });
    return NextResponse.json({ success: true, seasons });
  } catch (error: any) {
    console.error('[API Superadmin Temporadas GET] Error:', error.message);
    return NextResponse.json({ error: 'Error al obtener temporadas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      codigo,
      nombre,
      descripcion,
      fechaInicio,
      fechaFin,
      config,
      version,
      status
    } = body;

    if (!codigo || !nombre || !fechaInicio || !fechaFin || !status) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Si la temporada entrante se define como ACTIVE
      if (status === 'ACTIVE') {
        // Desactivar cualquier otra temporada que esté actualmente activa
        await tx.globalSeason.updateMany({
          where: {
            status: 'ACTIVE',
            id: id ? { not: id } : undefined
          },
          data: {
            status: 'FINISHED'
          }
        });
      }

      // Crear o actualizar la temporada
      let season;
      if (id) {
        season = await tx.globalSeason.update({
          where: { id },
          data: {
            codigo,
            nombre,
            descripcion,
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
            config: config || {},
            version: version || '1.0.0',
            status
          }
        });
      } else {
        season = await tx.globalSeason.create({
          data: {
            id: crypto.randomUUID(),
            codigo,
            nombre,
            descripcion,
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
            config: config || {},
            version: version || '1.0.0',
            status
          }
        });
      }

      return season;
    });

    return NextResponse.json({ success: true, season: result });
  } catch (error: any) {
    console.error('[API Superadmin Temporadas POST] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error al guardar temporada' }, { status: 500 });
  }
}
