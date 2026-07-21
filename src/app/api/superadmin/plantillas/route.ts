import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TemplatePublishStatus, TemplateSourceType } from '@prisma/client';

/**
 * GET: Listar todas las plantillas del Marketplace (Superadmin)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('categoria');
    const isPredeterminada = url.searchParams.get('esPredeterminada');

    const where: any = {};
    if (category) {
      where.categorias = {
        array_contains: category,
      };
    }
    if (isPredeterminada) {
      where.esPredeterminada = isPredeterminada === 'true';
    }

    const templates = await prisma.questTemplate.findMany({
      where,
      include: {
        Missions: true,
      },
      orderBy: {
        installCount: 'desc',
      },
    });

    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    console.error('[API Superadmin Templates GET] Error:', err.message);
    return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 });
  }
}

/**
 * POST: Crear una nueva plantilla oficial (Superadmin)
 */
export async function POST(request: Request) {
  try {
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
      misiones, // Array de QuestTemplateMission a crear atómicamente
      coupons,
      rewards,
    } = body;

    if (!nombre || !descripcion || !categorias || !tags) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Guardar plantilla y misiones asociadas mediante transacciones Prisma
    const template = await prisma.$transaction(async (tx) => {
      const createdTemplate = await tx.questTemplate.create({
        data: {
          nombre,
          descripcion,
          icono: icono || 'Award',
          color: color || '#ec4899',
          categorias: categorias || [],
          tags: tags || [],
          versionSemantica: '1.0.0',
          estado: TemplatePublishStatus.PUBLICADA,
          origenTipo: TemplateSourceType.BIBLIOTECA_OFICIAL,
          esPredeterminada: !!esPredeterminada,
          featured: !!featured,
          coverImage: coverImage || null,
          thumbnail: thumbnail || null,
          banner: banner || null,
          autor: autor || 'Citiox',
          empresa: empresa || 'Citiox',
          licencia: licencia || 'Comercial',
          gratuito: gratuito !== undefined ? !!gratuito : true,
          precio: precio ? parseFloat(String(precio)) : 0.0,
          moneda: moneda || 'USD',
          coupons: coupons || null,
          rewards: rewards || null,
        },
      });

      if (Array.isArray(misiones) && misiones.length > 0) {
        for (const mission of misiones) {
          await tx.questTemplateMission.create({
            data: {
              templateId: createdTemplate.id,
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
        where: { id: createdTemplate.id },
        include: { Missions: true },
      });
    });

    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    console.error('[API Superadmin Templates POST] Error:', err.message);
    return NextResponse.json({ error: 'Error al crear plantilla: ' + err.message }, { status: 500 });
  }
}
