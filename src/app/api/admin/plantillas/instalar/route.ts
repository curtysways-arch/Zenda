import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TemplateUpdateStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { defaultCatalogBySector } from '@/lib/services/templateService';

// Helper: mapeo de tipo de negocio a categoría de plantilla
function mapSectorToCategory(tipoNegocio: string): string {
  const sector = (tipoNegocio || '').toLowerCase().trim();
  if (sector.includes('barber')) return 'BARBERIA';
  if (sector.includes('spa') || sector.includes('masaje')) return 'SPA';
  if (sector.includes('estét') || sector.includes('belleza') || sector.includes('estet')) return 'BELLEZA';
  if (sector.includes('clínic') || sector.includes('clinic') || sector.includes('salud')) return 'CLINICA';
  if (sector.includes('gimnasio') || sector.includes('gym') || sector.includes('entrena') || sector.includes('fit') || sector.includes('academia')) return 'GIMNASIO';
  return 'GENERAL';
}

// Helper: crear cupones y premios del catálogo dentro de una transacción
async function createDefaultCatalogInTx(
  negocioId: string,
  category: string,
  tx: any,
  customCoupons?: any[] | null,
  customRewards?: any[] | null
): Promise<void> {
  const couponsList = (customCoupons && customCoupons.length > 0)
    ? customCoupons
    : (defaultCatalogBySector[category] || defaultCatalogBySector['GENERAL']).coupons;

  const rewardsList = (customRewards && customRewards.length > 0)
    ? customRewards
    : (defaultCatalogBySector[category] || defaultCatalogBySector['GENERAL']).rewards;

  for (const cp of couponsList) {
    const existingCoupon = await tx.coupon.findFirst({ where: { negocioId, codigo: cp.codigo } });
    if (!existingCoupon) {
      await tx.coupon.create({
        data: {
          id: uuidv4(),
          negocioId,
          codigo: cp.codigo,
          tipo: cp.tipo,
          valor: cp.valor,
          descripcion: cp.descripcion,
          usosActuales: 0,
          activa: true
        }
      });
    }
  }

  for (const rw of rewardsList) {
    const existingReward = await tx.loyaltyReward.findFirst({ where: { negocioId, nombre: rw.nombre } });
    if (!existingReward) {
      await tx.loyaltyReward.create({
        data: {
          id: uuidv4(),
          negocioId,
          nombre: rw.nombre,
          descripcion: rw.descripcion,
          costoPuntos: rw.costoPuntos,
          tipo: rw.tipo,
          deliveryType: rw.deliveryType,
          activa: true
        }
      });
    }
  }
}

/**
 * POST: Instalar o sincronizar inteligentemente una plantilla de misiones en el negocio.
 */
export async function POST(request: Request) {
  try {
    // 1. Validar sesión de negocio
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Falta asociar negocioId en la cuenta actual.' }, { status: 400 });
    }

    // 2. Extraer parámetros
    const body = await request.json();
    const { templateId, action } = body; // action: 'install' | 'merge' | 'replace' | 'update_rewards'

    if (!templateId || !action) {
      return NextResponse.json({ error: 'Faltan los parámetros templateId y action.' }, { status: 400 });
    }

    // 3. Obtener la plantilla original y sus misiones
    const template = await prisma.questTemplate.findUnique({
      where: { id: templateId },
      include: { Missions: true },
    });

    if (!template) {
      return NextResponse.json({ error: 'La plantilla no existe.' }, { status: 404 });
    }

    // 3.5. Obtener el tipo de negocio para el catálogo de cupones/premios
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { configuracion: true }
    });
    const tipoNegocio = (negocio?.configuracion as any)?.tipoNegocio || 'General';
    const category = mapSectorToCategory(tipoNegocio);

    // 4. Crear Snapshot Inmutable antes de realizar modificaciones
    const snapshotData = {
      template: {
        id: template.id,
        nombre: template.nombre,
        versionSemantica: template.versionSemantica,
      },
      missions: template.Missions.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        triggerEvent: m.triggerEvent,
        acciones: m.acciones,
      })),
      timestamp: new Date().toISOString(),
    };

    await prisma.installedTemplateSnapshot.create({
      data: {
        id: uuidv4(),
        negocioId,
        templateId,
        versionCopy: template.versionSemantica,
        snapshotData,
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      // 4.5. Buscar o crear la campaña del negocio para esta plantilla
      let campaign = await tx.campaign.findFirst({
        where: {
          negocioId,
          nombre: `Campaña ${template.nombre}`
        }
      });

      if (!campaign) {
        campaign = await tx.campaign.create({
          data: {
            negocioId,
            nombre: `Campaña ${template.nombre}`,
            descripcion: template.descripcion,
            activa: true,
          }
        });
      }

      // 5. Ejecutar la acción
      if (action === 'install' || action === 'replace') {
        // A. Eliminar misiones del negocio creadas previamente con esta plantilla
        await tx.quest.deleteMany({
          where: {
            negocioId,
            templateIdOrigen: templateId,
          },
        });

        // B. Copiar las misiones de la plantilla como nuevas misiones locales
        for (const m of template.Missions) {
          const questId = uuidv4();
          await tx.quest.create({
            data: {
              id: questId,
              negocioId,
              campaignId: campaign.id,
              nombre: m.nombre,
              descripcion: m.descripcion,
              imagenUrl: m.imagenUrl || null,
              icono: m.icono,
              color: m.color,
              visible: m.visible,
              repetible: m.repetible,
              limiteUsuario: m.limiteUsuario,
              limiteGlobal: m.limiteGlobal,
              fechaInicio: m.fechaInicio,
              fechaFin: m.fechaFin,
              activa: m.activa,
              parentQuestId: m.parentQuestId || null,
              segmentacion: m.segmentacion || null,
              validacionTipo: m.validacionTipo,
              difficulty: m.difficulty,
              xp: m.xp,
              estimatedMinutes: m.estimatedMinutes,
              estimatedDays: m.estimatedDays,
              triggerEvent: m.triggerEvent,
              servicioId: m.servicioId || null,
              montoMinimo: m.montoMinimo || null,
              cantidadMeta: m.cantidadMeta,
              condicionesExtra: m.condicionesExtra || null,
              acciones: m.acciones || [],
              origen: 'PLANTILLA',
              templateIdOrigen: templateId,
              templateVersionOrigen: template.versionSemantica,
              modificadaLocalmente: false,
            } as any,
          });
        }

        // C. Crear cupones y premios del catálogo por sector
        await createDefaultCatalogInTx(
          negocioId,
          category,
          tx,
          template.coupons as any[],
          template.rewards as any[]
        );

      } 
      else if (action === 'merge') {
        // A. Fusionar únicamente las misiones nuevas
        const existingQuests = await tx.quest.findMany({
          where: { negocioId, templateIdOrigen: templateId },
          select: { nombre: true },
        });
        const existingNames = new Set(existingQuests.map((q) => q.nombre.toLowerCase()));

        for (const m of template.Missions) {
          if (!existingNames.has(m.nombre.toLowerCase())) {
            const questId = uuidv4();
            await tx.quest.create({
              data: {
                id: questId,
                negocioId,
                campaignId: campaign.id,
                nombre: m.nombre,
                descripcion: m.descripcion,
                imagenUrl: m.imagenUrl || null,
                icono: m.icono,
                color: m.color,
                visible: m.visible,
                repetible: m.repetible,
                limiteUsuario: m.limiteUsuario,
                limiteGlobal: m.limiteGlobal,
                fechaInicio: m.fechaInicio,
                fechaFin: m.fechaFin,
                activa: m.activa,
                parentQuestId: m.parentQuestId || null,
                segmentacion: m.segmentacion || null,
                validacionTipo: m.validacionTipo,
                difficulty: m.difficulty,
                xp: m.xp,
                estimatedMinutes: m.estimatedMinutes,
                estimatedDays: m.estimatedDays,
                triggerEvent: m.triggerEvent,
                servicioId: m.servicioId || null,
                montoMinimo: m.montoMinimo || null,
                cantidadMeta: m.cantidadMeta,
                condicionesExtra: m.condicionesExtra || null,
                acciones: m.acciones || [],
                origen: 'PLANTILLA',
                templateIdOrigen: templateId,
                templateVersionOrigen: template.versionSemantica,
                modificadaLocalmente: false,
              } as any,
            });
          }
        }

        // B. También crear cupones y premios que no existan aún (merge no duplica)
        await createDefaultCatalogInTx(
          negocioId,
          category,
          tx,
          template.coupons as any[],
          template.rewards as any[]
        );

      } 
      else if (action === 'update_rewards') {
        // A. Actualizar solo recompensas/acciones de las misiones que coincidan en nombre
        const existingQuests = await tx.quest.findMany({
          where: { negocioId, templateIdOrigen: templateId },
        });

        for (const m of template.Missions) {
          const matched = existingQuests.find((q) => q.nombre.toLowerCase() === m.nombre.toLowerCase());
          if (matched) {
            await tx.quest.update({
              where: { id: matched.id },
              data: {
                acciones: m.acciones || [],
                templateVersionOrigen: template.versionSemantica,
                // El estado no se resetea para conservar el progreso actual de los usuarios
              },
            });
          }
        }
      }

      // 6. Registrar o actualizar el estado de InstalledTemplate
      const upsertInstalled = await tx.installedTemplate.upsert({
        where: {
          negocioId_templateId: {
            negocioId,
            templateId,
          },
        },
        update: {
          versionInstalada: template.versionSemantica,
          estadoActualizacion: TemplateUpdateStatus.UP_TO_DATE,
          reinstalledAt: new Date(),
        },
        create: {
          id: uuidv4(),
          negocioId,
          templateId,
          versionInstalada: template.versionSemantica,
          estadoActualizacion: TemplateUpdateStatus.UP_TO_DATE,
        },
      });

      // 7. Incrementar contador de instalaciones del template
      await tx.questTemplate.update({
        where: { id: templateId },
        data: {
          installCount: {
            increment: 1,
          },
        },
      });

      return upsertInstalled;
    });

    return NextResponse.json({
      success: true,
      message: `Acción '${action}' ejecutada con éxito. Cupones y premios del sector creados.`,
      installedTemplate: result,
    });
  } catch (err: any) {
    console.error('[API Admin InstallTemplate POST] Error:', err.message);
    return NextResponse.json({ error: 'Error al instalar plantilla: ' + err.message }, { status: 500 });
  }
}
