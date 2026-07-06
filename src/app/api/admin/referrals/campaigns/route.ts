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

        const campaigns = await (prisma as any).referralCampaign.findMany({
            where: { negocioId },
            orderBy: [{ prioridad: "desc" }, { createdAt: "desc" }]
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
            estado = "ACTIVA",
            tipoRecompensa,
            valorRecompensa,
            referidosRequeridos,
            fechaInicio,
            fechaFin,
            limitePremios,
            rankingActivo = false,
            tipoIncentivo,
            valorIncentivo,
            // Nuevos campos de fidelización
            tipoCampana = "CLIENTES_NUEVOS",
            diasInactividad,
            maxPremiosPorCliente,
            permitirRepetir = false,
            prioridad = 0,
            combinable = false,
            color,
            icono
        } = body;

        if (!nombre || !tipoRecompensa || !valorRecompensa || !referidosRequeridos) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const campaign = await (prisma as any).referralCampaign.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                nombre,
                descripcion: descripcion || null,
                imagenUrl: imagenUrl || null,
                activa: estado === "ACTIVA",
                estado,
                tipoRecompensa,
                valorRecompensa,
                referidosRequeridos: parseInt(String(referidosRequeridos)),
                fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                limitePremios: limitePremios !== undefined && limitePremios !== null && limitePremios !== "" ? parseInt(String(limitePremios)) : null,
                rankingActivo: Boolean(rankingActivo),
                tipoIncentivo: tipoIncentivo || null,
                valorIncentivo: valorIncentivo || null,
                tipoCampana,
                diasInactividad: diasInactividad ? parseInt(String(diasInactividad)) : null,
                maxPremiosPorCliente: maxPremiosPorCliente ? parseInt(String(maxPremiosPorCliente)) : null,
                permitirRepetir: Boolean(permitirRepetir),
                prioridad: parseInt(String(prioridad)) || 0,
                combinable: Boolean(combinable),
                color: color || null,
                icono: icono || null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(campaign);
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
