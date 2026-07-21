import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TemplatePublishStatus } from '@prisma/client';

type Params = Promise<{ id: string }>;

/**
 * GET: Obtener detalles de una plantilla y sus misiones (Superadmin)
 */
export async function GET(request: Request, segmentData: { params: Params }) {
  try {
    const { id } = await segmentData.params;
    const template = await prisma.questTemplate.findUnique({
      where: { id },
      include: {
        Missions: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    console.error('[API Superadmin Templates ID GET] Error:', err.message);
    return NextResponse.json({ error: 'Error al obtener la plantilla' }, { status: 500 });
  }
}

/**
 * PUT: Actualizar una plantilla y refrescar su listado de misiones asociadas
 */
export async function PUT(request: Request, segmentData: { params: Params }) {
  try {
    const { id } = await segmentData.params;
    const body = await request.json();
    const {
      nombre,
      descripcion,
      icono,
      color,
      categorias,
      tags,
      esPredeterminada,
      featured,
      coverImage,
      thumbnail,
      banner,
      autor,
      empresa,
      licencia,
      gratuito,
      precio,
      moneda,
      versionSemantica,
      misiones, // Array completo para refrescar las misiones de la plantilla
      coupons,
      rewards,
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar datos del QuestTemplate
      const current = await tx.questTemplate.findUnique({ where: { id } });
      if (!current) throw new Error('Plantilla no encontrada');

      const newVersion = versionSemantica || current.versionSemantica;

      const updatedTemplate = await tx.questTemplate.update({
        where: { id },
        data: {
          nombre: nombre ?? current.nombre,
          descripcion: descripcion ?? current.descripcion,
          icono: icono ?? current.icono,
          color: color ?? current.color,
          categorias: categorias ?? current.categorias,
          tags: tags ?? current.tags,
          versionSemantica: newVersion,
          esPredeterminada: esPredeterminada !== undefined ? !!esPredeterminada : current.esPredeterminada,
          featured: featured !== undefined ? !!featured : current.featured,
          coverImage: coverImage ?? current.coverImage,
          thumbnail: thumbnail ?? current.thumbnail,
          banner: banner ?? current.banner,
          autor: autor ?? current.autor,
          empresa: empresa ?? current.empresa,
          licencia: licencia ?? current.licencia,
          gratuito: gratuito !== undefined ? !!gratuito : current.gratuito,
          precio: precio !== undefined ? parseFloat(String(precio)) : current.precio,
          moneda: moneda ?? current.moneda,
          coupons: coupons !== undefined ? coupons : current.coupons,
          rewards: rewards !== undefined ? rewards : current.rewards,
        },
      });

      // Refrescar misiones si vienen en el payload
      if (Array.isArray(misiones)) {
        // Eliminar las misiones anteriores de la plantilla
        await tx.questTemplateMission.deleteMany({
          where: { templateId: id },
        });

        // Crear las nuevas
        for (const mission of misiones) {
          await tx.questTemplateMission.create({
            data: {
              templateId: id,
              nombre: mission.nombre,
              descripcion: mission.descripcion,
              imagenUrl: mission.imagenUrl || null,
              icono: mission.icono || 'Award',
              color: mission.color || '#ec4899',
              visible: mission.visible !== undefined ? !!mission.visible : true,
              repetible: !!mission.repetible,
              limiteUsuario: mission.limiteUsuario ? parseInt(String(mission.limiteUsuario)) : 1,
              limiteGlobal: mission.limiteGlobal ? parseInt(String(mission.limiteGlobal)) : null,
              fechaInicio: mission.fechaInicio ? new Date(mission.fechaInicio) : null,
              fechaFin: mission.fechaFin ? new Date(mission.fechaFin) : null,
              activa: mission.activa !== undefined ? !!mission.activa : true,
              parentQuestId: mission.parentQuestId || null,
              segmentacion: mission.segmentacion || null,
              validacionTipo: mission.validacionTipo || 'AUTOMATICO',
              difficulty: mission.difficulty || 'MEDIUM',
              xp: mission.xp ? parseInt(String(mission.xp)) : 0,
              estimatedMinutes: mission.estimatedMinutes ? parseInt(String(mission.estimatedMinutes)) : 0,
              estimatedDays: mission.estimatedDays ? parseInt(String(mission.estimatedDays)) : 0,
              triggerEvent: mission.triggerEvent,
              servicioId: mission.servicioId || null,
              montoMinimo: mission.montoMinimo ? parseFloat(String(mission.montoMinimo)) : null,
              cantidadMeta: mission.cantidadMeta ? parseInt(String(mission.cantidadMeta)) : 1,
              condicionesExtra: mission.condicionesExtra || null,
              acciones: mission.acciones || [],
            },
          });
        }
      }

      return await tx.questTemplate.findUnique({
        where: { id },
        include: { Missions: true },
      });
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    console.error('[API Superadmin Templates ID PUT] Error:', err.message);
    return NextResponse.json({ error: 'Error al actualizar plantilla: ' + err.message }, { status: 500 });
  }
}

/**
 * DELETE: Archivar o eliminar una plantilla (Superadmin)
 */
export async function DELETE(request: Request, segmentData: { params: Params }) {
  try {
    const { id } = await segmentData.params;
    
    // Cambiar estado a ARCHIVADA
    const template = await prisma.questTemplate.update({
      where: { id },
      data: {
        estado: TemplatePublishStatus.ARCHIVADA,
      },
    });

    return NextResponse.json({ success: true, message: 'Plantilla archivada con éxito', template });
  } catch (err: any) {
    console.error('[API Superadmin Templates ID DELETE] Error:', err.message);
    return NextResponse.json({ error: 'Error al eliminar plantilla: ' + err.message }, { status: 500 });
  }
}
