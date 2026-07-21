import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateUserLevel } from "@/lib/loyalty/levelEngine";
import crypto from "crypto";

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return true; // Acceso temporal
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id: negocioId } = await params;
    const body = await req.json().catch(() => ({}));
    const { duracionMeses = 3, descuentoDiamantes = 100 } = body;

    // Obtener temporada activa
    const activeSeason = await prisma.loyaltySeason.findFirst({
      where: { negocioId, activa: true },
      orderBy: { createdAt: "desc" }
    });

    if (!activeSeason) {
      // Si no existe temporada activa, crearemos la primera temporada inicial
      const nextInicio = new Date();
      const nextFin = new Date(nextInicio);
      nextFin.setMonth(nextFin.getMonth() + parseInt(String(duracionMeses)));

      const nextSeason = await prisma.loyaltySeason.create({
        data: {
          id: crypto.randomUUID(),
          negocioId,
          fechaInicio: nextInicio,
          fechaFin: nextFin,
          duracionMeses: parseInt(String(duracionMeses)),
          descuentoDiamantes: parseInt(String(descuentoDiamantes)),
          activa: true,
          procesada: false
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: "No había temporada activa. Se ha iniciado la primera temporada con éxito.",
        season: nextSeason 
      });
    }

    // Forzar cierre de temporada actual
    await prisma.loyaltySeason.update({
      where: { id: activeSeason.id },
      data: { activa: false, procesada: true }
    });

    // Restar diamantes a todos los usuarios del negocio (puntos y experiencia)
    const userPointsList = await prisma.userPoints.findMany({
      where: {
        negocioId,
        OR: [
          { puntos: { gt: 0 } },
          { experiencia: { gt: 0 } }
        ]
      }
    });

    const descuento = parseInt(String(descuentoDiamantes));
    for (const up of userPointsList) {
      const nuevosPuntos = Math.max(0, up.puntos - descuento);
      const nuevaExperiencia = Math.max(0, up.experiencia - descuento);
      
      await prisma.userPoints.update({
        where: { id: up.id },
        data: { 
          puntos: nuevosPuntos,
          experiencia: nuevaExperiencia
        }
      });

      // Registrar en PointsHistory
      await prisma.pointsHistory.create({
        data: {
          userId: up.userId,
          negocioId,
          puntos: -Math.min(up.puntos, descuento),
          concepto: "AJUSTE_TEMPORADA",
          notas: `Reinicio forzado por el administrador de plataforma. Descuento aplicado.`
        }
      });

      // Recalcular nivel
      await updateUserLevel(up.userId, negocioId, nuevaExperiencia);
    }

    // Crear la siguiente temporada
    const nextInicio = new Date();
    const nextFin = new Date(nextInicio);
    nextFin.setMonth(nextFin.getMonth() + parseInt(String(duracionMeses)));

    const nextSeason = await prisma.loyaltySeason.create({
      data: {
        id: crypto.randomUUID(),
        negocioId,
        fechaInicio: nextInicio,
        fechaFin: nextFin,
        duracionMeses: parseInt(String(duracionMeses)),
        descuentoDiamantes: parseInt(String(descuentoDiamantes)),
        activa: true,
        procesada: false
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Temporada reiniciada con éxito en la plataforma para este negocio.",
      season: nextSeason 
    });

  } catch (error: any) {
    console.error("Error in superadmin season restart:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
  }
}
