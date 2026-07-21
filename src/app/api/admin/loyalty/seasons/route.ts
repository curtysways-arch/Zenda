import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

import { updateUserLevel } from "@/lib/loyalty/levelEngine";

// GET /api/admin/loyalty/seasons — Listar temporadas unificadas del negocio
import { ClubResolver } from "@/lib/growth/clubResolver";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const { searchParams } = new URL(req.url);
        const negocioId = searchParams.get("negocioId") || user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const resolved = await ClubResolver.resolveSeason(negocioId);
        let season: any = null;

        if (resolved) {
            if (resolved.source === 'LOCAL') {
                season = {
                    ...resolved.data,
                    isGlobal: false,
                    mode: resolved.mode
                };
            } else {
                // Mapear GlobalSeason a LoyaltySeason para el frontend
                season = {
                    id: resolved.data.id,
                    negocioId,
                    fechaInicio: resolved.data.fechaInicio,
                    fechaFin: resolved.data.fechaFin,
                    duracionMeses: resolved.data.duracionMeses ?? 3,
                    descuentoDiamantes: resolved.data.descuentoDiamantes ?? 0,
                    activa: resolved.data.status === 'ACTIVE',
                    procesada: resolved.data.status === 'FINISHED',
                    isGlobal: true,
                    mode: resolved.mode,
                    resourceId: resolved.resourceId
                };
            }
        }

        // Obtener historial de temporadas locales previas
        const history = await prisma.loyaltySeason.findMany({
            where: { negocioId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ season, history });
    } catch (error: any) {
        console.error("Error fetching loyalty seasons:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const body = await req.json();
        const { duracionMeses, descuentoDiamantes, reiniciarAhora } = body;

        if (duracionMeses === undefined || descuentoDiamantes === undefined) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        // Obtener si ya existe una temporada activa
        const activeSeason = await prisma.loyaltySeason.findFirst({
            where: { negocioId, activa: true },
            orderBy: { createdAt: "desc" }
        });

        let result;
        if (reiniciarAhora && activeSeason) {
            // Forzar cierre de temporada actual y reiniciar
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

            for (const up of userPointsList) {
                const descuento = parseInt(String(descuentoDiamantes));
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
                        notas: `Reinicio manual de temporada. Descuento aplicado.`
                    }
                });

                // Recalcular nivel con la nueva experiencia
                await updateUserLevel(up.userId, negocioId, nuevaExperiencia);
            }

            // Crear la nueva temporada activa
            const fechaInicio = new Date();
            const fechaFin = new Date();
            fechaFin.setMonth(fechaFin.getMonth() + parseInt(String(duracionMeses)));

            result = await prisma.loyaltySeason.create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId,
                    fechaInicio,
                    fechaFin,
                    duracionMeses: parseInt(String(duracionMeses)),
                    descuentoDiamantes: parseInt(String(descuentoDiamantes)),
                    activa: true,
                    procesada: false
                }
            });
        } else if (activeSeason) {
            // Si ya hay una temporada activa, sólo actualizamos la configuración
            result = await prisma.loyaltySeason.update({
                where: { id: activeSeason.id },
                data: {
                    duracionMeses: parseInt(String(duracionMeses)),
                    descuentoDiamantes: parseInt(String(descuentoDiamantes))
                }
            });
        } else {
            // Si no hay temporada activa, creamos una de inmediato
            const fechaInicio = new Date();
            const fechaFin = new Date();
            fechaFin.setMonth(fechaFin.getMonth() + parseInt(String(duracionMeses)));

            result = await prisma.loyaltySeason.create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId,
                    fechaInicio,
                    fechaFin,
                    duracionMeses: parseInt(String(duracionMeses)),
                    descuentoDiamantes: parseInt(String(descuentoDiamantes)),
                    activa: true,
                    procesada: false
                }
            });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error saving loyalty season:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
