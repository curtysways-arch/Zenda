import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET: Obtener todos los packs de misiones en el Marketplace
 */
export async function GET() {
  try {
    const packs = await prisma.questPack.findMany({
      include: {
        Templates: {
          include: {
            Template: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, packs });
  } catch (err: any) {
    console.error('[API Superadmin Packs GET] Error:', err.message);
    return NextResponse.json({ error: 'Error al obtener packs' }, { status: 500 });
  }
}

/**
 * POST: Crear un nuevo pack de misiones (Superadmin)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, icono, color, gratuito, precio, moneda, templatesIds } = body;

    if (!nombre || !descripcion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const pack = await prisma.$transaction(async (tx) => {
      // Crear el pack
      const createdPack = await tx.questPack.create({
        data: {
          nombre,
          descripcion,
          icono: icono || 'Briefcase',
          color: color || '#10b981',
          gratuito: gratuito !== undefined ? !!gratuito : true,
          precio: precio ? parseFloat(String(precio)) : 0.0,
          moneda: moneda || 'USD',
        },
      });

      // Vincular las plantillas asociadas
      if (Array.isArray(templatesIds) && templatesIds.length > 0) {
        for (const templateId of templatesIds) {
          await tx.questPackTemplate.create({
            data: {
              packId: createdPack.id,
              templateId,
            },
          });
        }
      }

      return await tx.questPack.findUnique({
        where: { id: createdPack.id },
        include: {
          Templates: {
            include: { Template: true },
          },
        },
      });
    });

    return NextResponse.json({ success: true, pack });
  } catch (err: any) {
    console.error('[API Superadmin Packs POST] Error:', err.message);
    return NextResponse.json({ error: 'Error al crear pack: ' + err.message }, { status: 500 });
  }
}
