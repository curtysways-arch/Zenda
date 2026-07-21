import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

import { ensureDefaultLevels } from "@/lib/loyalty/levelEngine";

// GET /api/admin/loyalty/levels — Listar niveles unificados del negocio
import { ClubResolver } from "@/lib/growth/clubResolver";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const resolved = await ClubResolver.resolveLevels(negocioId);
        const levels = resolved.map((r, idx) => {
            if (r.source === 'LOCAL') {
                return {
                    ...r.data,
                    isGlobal: false,
                    mode: r.mode
                };
            } else {
                // Mapear GlobalLevel a la estructura esperada de LoyaltyLevel
                return {
                    id: r.data.id,
                    negocioId,
                    nombre: r.data.nombre ?? `Nivel ${idx + 1}`,
                    diamantesRequeridos: r.data.xpRequerida ?? 0,
                    color: r.data.Presentation?.color ?? '#ec4899',
                    icono: r.data.Presentation?.icono ?? 'Award',
                    orden: r.data.orden ?? (idx + 1),
                    beneficios: r.data.beneficios ? r.data.beneficios : null,
                    recompensaTipo: null,
                    recompensaValor: null,
                    multiplicador: 1.0,
                    isGlobal: true,
                    mode: r.mode,
                    resourceId: r.resourceId
                };
            }
        });

        return NextResponse.json(levels);
    } catch (error: any) {
        console.error("Error fetching loyalty levels:", error);
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
        const { id, nombre, diamantesRequeridos, color, icono, orden, beneficios, recompensaTipo, recompensaValor, multiplicador } = body;

        if (!nombre || diamantesRequeridos === undefined || !color || !icono || orden === undefined) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const data: any = {
            negocioId,
            nombre,
            diamantesRequeridos: parseInt(String(diamantesRequeridos)),
            color,
            icono,
            orden: parseInt(String(orden)),
            beneficios: beneficios ? beneficios : null,
            recompensaTipo: recompensaTipo || null,
            recompensaValor: recompensaValor ? recompensaValor : null,
            multiplicador: multiplicador !== undefined ? parseFloat(String(multiplicador)) : 1.0
        };

        let result;
        if (id) {
            // Actualizar nivel existente
            result = await prisma.loyaltyLevel.update({
                where: { id },
                data
            });
        } else {
            // Crear nuevo nivel
            result = await prisma.loyaltyLevel.create({
                data: {
                    id: crypto.randomUUID(),
                    ...data
                }
            });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error saving loyalty level:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
