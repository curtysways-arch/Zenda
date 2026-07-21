import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { updateUserLevel } from "@/lib/loyalty/levelEngine";
import crypto from "crypto";

export async function GET(req: Request) {
    try {
        console.log("[Seasons Cron] Iniciando verificación diaria de temporadas...");
        const now = new Date();

        // 1. Obtener todas las temporadas activas expiradas
        const expiredSeasons = await prisma.loyaltySeason.findMany({
            where: {
                activa: true,
                procesada: false,
                fechaFin: { lte: now }
            }
        });

        console.log(`[Seasons Cron] Se encontraron ${expiredSeasons.length} temporadas expiradas por procesar.`);
        const processed = [];

        for (const season of expiredSeasons) {
            console.log(`[Seasons Cron] Procesando fin de temporada para negocio: ${season.negocioId}`);

            // a. Marcar temporada actual como procesada e inactiva
            await prisma.loyaltySeason.update({
                where: { id: season.id },
                data: { activa: false, procesada: true }
            });

            // b. Obtener todos los clientes con saldo o experiencia en este negocio
            const userPointsList = await prisma.userPoints.findMany({
                where: {
                    negocioId: season.negocioId,
                    OR: [
                        { puntos: { gt: 0 } },
                        { experiencia: { gt: 0 } }
                    ]
                }
            });

            let affectedUsers = 0;

            // c. Restar descuentoDiamantes a cada usuario y recalcular nivel
            for (const up of userPointsList) {
                const descuento = season.descuentoDiamantes;
                const nuevosPuntos = Math.max(0, up.puntos - descuento);
                const puntosRestados = Math.min(up.puntos, descuento);

                const nuevaExperiencia = Math.max(0, up.experiencia - descuento);

                // Actualizar puntos y experiencia en DB
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
                        negocioId: season.negocioId,
                        puntos: -puntosRestados,
                        concepto: "AJUSTE_TEMPORADA",
                        notas: `Reinicio automático de temporada. Se descontaron ${puntosRestados} diamantes del saldo y se reajustó el nivel.`
                    }
                });

                // Recalcular nivel del usuario con la nueva experiencia
                await updateUserLevel(up.userId, season.negocioId, nuevaExperiencia);
                affectedUsers++;
            }

            // d. Crear automáticamente la siguiente temporada para el negocio
            const nextInicio = new Date(season.fechaFin);
            const nextFin = new Date(nextInicio);
            nextFin.setMonth(nextFin.getMonth() + season.duracionMeses);

            const nextSeason = await prisma.loyaltySeason.create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId: season.negocioId,
                    fechaInicio: nextInicio,
                    fechaFin: nextFin,
                    duracionMeses: season.duracionMeses,
                    descuentoDiamantes: season.descuentoDiamantes,
                    activa: true,
                    procesada: false
                }
            });

            processed.push({
                negocioId: season.negocioId,
                temporadaAnteriorId: season.id,
                nuevaTemporadaId: nextSeason.id,
                usuariosAfectados: affectedUsers
            });

            console.log(`[Seasons Cron] ✅ Nueva temporada creada con éxito para negocio: ${season.negocioId}`);
        }

        return NextResponse.json({
            success: true,
            now,
            temporadasProcesadasCount: processed.length,
            detalles: processed
        });

    } catch (error: any) {
        console.error("[Seasons Cron] Error en ejecución de cron de temporadas:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
