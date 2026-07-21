import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelResolver } from '@/lib/growth/levelResolver';

export async function GET(request: Request) {
  try {
    const levels = await prisma.globalLevel.findMany({
      include: {
        Presentation: true,
        Rewards: {
          include: {
            Reward: true
          },
          orderBy: {
            orden: 'asc'
          }
        }
      },
      orderBy: {
        orden: 'asc'
      }
    });
    return NextResponse.json({ success: true, levels });
  } catch (error: any) {
    console.error('[API Superadmin Niveles GET] Error:', error.message);
    return NextResponse.json({ error: 'Error al obtener niveles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      nombre,
      titulo,
      descripcion,
      xpRequerida,
      orden,
      version,
      activo,
      // Metadatos de presentación
      icono,
      color,
      imagen,
      tituloUi,
      descripcionUi,
      metadatos,
      // Recompensas del nivel (ID de recompensas del catálogo)
      rewardIds
    } = body;

    if (!nombre || !titulo || xpRequerida === undefined || !orden) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    // Usar transaction para crear nivel, presentación y premios
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear o actualizar nivel
      let level;
      if (id) {
        level = await tx.globalLevel.update({
          where: { id },
          data: {
            nombre,
            titulo,
            descripcion,
            xpRequerida: parseInt(xpRequerida),
            orden: parseInt(orden),
            version: version || '1.0.0',
            activo: activo !== undefined ? activo : true
          }
        });
      } else {
        level = await tx.globalLevel.create({
          data: {
            id: crypto.randomUUID(),
            nombre,
            titulo,
            descripcion,
            xpRequerida: parseInt(xpRequerida),
            orden: parseInt(orden),
            version: version || '1.0.0',
            activo: activo !== undefined ? activo : true
          }
        });
      }

      // 2. Crear o actualizar presentación
      await tx.globalLevelPresentation.upsert({
        where: { globalLevelId: level.id },
        update: {
          icono: icono || 'Award',
          color: color || '#4f46e5',
          imagen,
          tituloUi,
          descripcionUi,
          metadatos: metadatos || {}
        },
        create: {
          id: crypto.randomUUID(),
          globalLevelId: level.id,
          icono: icono || 'Award',
          color: color || '#4f46e5',
          imagen,
          tituloUi,
          descripcionUi,
          metadatos: metadatos || {}
        }
      });

      // 3. Vincular recompensas del nivel
      if (Array.isArray(rewardIds)) {
        // Borrar enlaces anteriores
        await tx.globalLevelReward.deleteMany({
          where: { globalLevelId: level.id }
        });

        // Crear enlaces nuevos con orden secuencial
        for (let i = 0; i < rewardIds.length; i++) {
          await tx.globalLevelReward.create({
            data: {
              id: crypto.randomUUID(),
              globalLevelId: level.id,
              rewardId: rewardIds[i],
              orden: i + 1
            }
          });
        }
      }

      return level;
    });

    // Invalida la caché del resolver
    LevelResolver.invalidateCache();

    return NextResponse.json({ success: true, level: result });
  } catch (error: any) {
    console.error('[API Superadmin Niveles POST] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error al guardar nivel' }, { status: 500 });
  }
}
