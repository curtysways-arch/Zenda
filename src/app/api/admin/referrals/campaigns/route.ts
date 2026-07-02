import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const campaigns = await prisma.referralCampaign.findMany({
            where: { negocioId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(campaigns);
    } catch (error: any) {
        console.error("Error fetching campaigns:", error);
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
        const {
            nombre,
            descripcion,
            imagenUrl,
            activa = true,
            tipoRecompensa,
            valorRecompensa,
            referidosRequeridos,
            fechaInicio,
            fechaFin,
            limitePremios,
            rankingActivo = false,
            tipoIncentivo,
            valorIncentivo
        } = body;

        if (!nombre || !tipoRecompensa || !valorRecompensa || !referidosRequeridos) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const campaign = await prisma.referralCampaign.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                nombre,
                descripcion: descripcion || null,
                imagenUrl: imagenUrl || null,
                activa: Boolean(activa),
                tipoRecompensa,
                valorRecompensa,
                referidosRequeridos: parseInt(String(referidosRequeridos)),
                fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                limitePremios: limitePremios !== undefined && limitePremios !== null && limitePremios !== "" ? parseInt(String(limitePremios)) : null,
                rankingActivo: Boolean(rankingActivo),
                tipoIncentivo: tipoIncentivo || null,
                valorIncentivo: valorIncentivo || null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(campaign);
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
