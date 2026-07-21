import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

/**
 * POST: Duplicar una plantilla existente en el Marketplace
 */
export async function POST(request: Request, segmentData: { params: Params }) {
  try {
    const { id } = await segmentData.params;
    
    // Obtener plantilla base con sus misiones
    const baseTemplate = await prisma.questTemplate.findUnique({
      where: { id },
      include: { Missions: true },
    });

    if (!baseTemplate) {
      return NextResponse.json({ error: 'Plantilla original no encontrada' }, { status: 404 });
    }

    const cloned = await prisma.$transaction(async (tx) => {
      // Crear nueva plantilla clonada
      const newTemplate = await tx.questTemplate.create({
        data: {
          nombre: `${baseTemplate.nombre} (Copia)`,
          descripcion: baseTemplate.descripcion,
          icono: baseTemplate.icono,
          color: baseTemplate.color,
          categorias: baseTemplate.categorias || [],
          tags: baseTemplate.tags || [],
          versionSemantica: '1.0.0',
          estado: 'BORRADOR',
          origenTipo: 'BIBLIOTECA_OFICIAL',
          esPredeterminada: false,
          featured: false,
          coverImage: baseTemplate.coverImage,
          thumbnail: baseTemplate.thumbnail,
          banner: baseTemplate.banner,
          autor: baseTemplate.autor,
          empresa: baseTemplate.empresa,
          licencia: baseTemplate.licencia,
          gratuito: baseTemplate.gratuito,
          precio: baseTemplate.precio,
          moneda: baseTemplate.moneda,
        },
      });

      // Clonar todas las misiones asociadas
      for (const m of baseTemplate.Missions) {
        await tx.questTemplateMission.create({
          data: {
            templateId: newTemplate.id,
            nombre: m.nombre,
            descripcion: m.descripcion,
            imagenUrl: m.imagenUrl,
            icono: m.icono,
            color: m.color,
            visible: m.visible,
            repetible: m.repetible,
            limiteUsuario: m.limiteUsuario,
            limiteGlobal: m.limiteGlobal,
            fechaInicio: m.fechaInicio,
            fechaFin: m.fechaFin,
            activa: m.activa,
            parentQuestId: m.parentQuestId,
            segmentacion: m.segmentacion || null,
            validacionTipo: m.validacionTipo,
            difficulty: m.difficulty,
            xp: m.xp,
            estimatedMinutes: m.estimatedMinutes,
            estimatedDays: m.estimatedDays,
            triggerEvent: m.triggerEvent,
            servicioId: m.servicioId,
            montoMinimo: m.montoMinimo,
            cantidadMeta: m.cantidadMeta,
            condicionesExtra: m.condicionesExtra || null,
            acciones: m.acciones || [],
          },
        });
      }

      return await tx.questTemplate.findUnique({
        where: { id: newTemplate.id },
        include: { Missions: true },
      });
    });

    return NextResponse.json({ success: true, template: cloned });
  } catch (err: any) {
    console.error('[API Superadmin Templates Clone POST] Error:', err.message);
    return NextResponse.json({ error: 'Error al duplicar plantilla: ' + err.message }, { status: 500 });
  }
}
