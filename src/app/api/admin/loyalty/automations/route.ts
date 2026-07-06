import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

// GET /api/admin/loyalty/automations — Listar automatizaciones del negocio
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const rules = await (prisma as any).automationRule.findMany({
            where: { negocioId },
            orderBy: { createdAt: "desc" }
        });

        // Incluir estadísticas de ejecuciones
        const rulesWithStats = await Promise.all(rules.map(async (rule: any) => {
            const totalRuns = await (prisma as any).automationLog.count({
                where: { ruleId: rule.id }
            });
            const lastRun = await (prisma as any).automationLog.findFirst({
                where: { ruleId: rule.id },
                orderBy: { createdAt: "desc" }
            });
            return { ...rule, totalRuns, lastRun: lastRun?.createdAt || null };
        }));

        return NextResponse.json(rulesWithStats);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

// POST /api/admin/loyalty/automations — Crear regla de automatización
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const body = await req.json();
        const { nombre, descripcion, disparador, condiciones, acciones, activa = true } = body;

        if (!nombre || !disparador || !acciones || !Array.isArray(acciones) || acciones.length === 0) {
            return NextResponse.json({ error: "Faltan campos: nombre, disparador y acciones son requeridos" }, { status: 400 });
        }

        const rule = await (prisma as any).automationRule.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                nombre,
                descripcion: descripcion || null,
                disparador,
                condiciones: condiciones || null,
                acciones,
                activa: Boolean(activa),
                updatedAt: new Date()
            }
        });

        return NextResponse.json(rule);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
