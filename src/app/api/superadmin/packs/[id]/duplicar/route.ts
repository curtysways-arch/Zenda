import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

/**
 * POST: Duplicar un pack existente
 */
export async function POST(request: Request, segmentData: { params: Params }) {
  try {
    const { id } = await segmentData.params;
    
    // Obtener el pack original
    const basePack = await prisma.questPack.findUnique({
      where: { id },
      include: { Templates: true },
    });

    if (!basePack) {
      return NextResponse.json({ error: 'Pack original no encontrado' }, { status: 404 });
    }

    const cloned = await prisma.$transaction(async (tx) => {
      // Crear nuevo pack
      const newPack = await tx.questPack.create({
        data: {
          nombre: `${basePack.nombre} (Copia)`,
          descripcion: basePack.descripcion,
          icono: basePack.icono,
          color: basePack.color,
          gratuito: basePack.gratuito,
          precio: basePack.precio,
          moneda: basePack.moneda,
        },
      });

      // Vincular las mismas plantillas
      for (const t of basePack.Templates) {
        await tx.questPackTemplate.create({
          data: {
            packId: newPack.id,
            templateId: t.templateId,
          },
        });
      }

      return await tx.questPack.findUnique({
        where: { id: newPack.id },
        include: {
          Templates: {
            include: { Template: true },
          },
        },
      });
    });

    return NextResponse.json({ success: true, pack: cloned });
  } catch (err: any) {
    console.error('[API Superadmin Packs Clone POST] Error:', err.message);
    return NextResponse.json({ error: 'Error al duplicar pack: ' + err.message }, { status: 500 });
  }
}
