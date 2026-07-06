import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { addPoints, getPoints } from "@/lib/loyalty/loyaltyEngine";

// GET /api/admin/loyalty/points?userId=xxx
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (userId) {
            // Balance de un cliente específico
            const balance = await getPoints(userId, negocioId);
            const history = await (prisma as any).pointsHistory.findMany({
                where: { userId, negocioId },
                orderBy: { createdAt: "desc" },
                take: 50
            });
            return NextResponse.json({ balance, history });
        }

        // Ranking de puntos del negocio
        const rankings = await (prisma as any).userPoints.findMany({
            where: { negocioId },
            orderBy: { puntos: "desc" },
            take: 50,
            include: {
                Usuario: { select: { nombre: true, phone: true } }
            }
        });

        return NextResponse.json(rankings);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

// POST /api/admin/loyalty/points — Ajuste manual de puntos
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { userId, puntos, concepto = "AJUSTE", notas } = await req.json();

        if (!userId || !puntos) {
            return NextResponse.json({ error: "Faltan campos: userId y puntos son requeridos" }, { status: 400 });
        }

        await addPoints(userId, negocioId, parseInt(String(puntos)), concepto, undefined, notas);
        const newBalance = await getPoints(userId, negocioId);

        return NextResponse.json({ ok: true, balance: newBalance });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
