import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { id } = await params;

        const campaign = await prisma.referralCampaign.findFirst({
            where: { id, negocioId }
        });

        if (!campaign) {
            return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
        }

        return NextResponse.json(campaign);
    } catch (error: any) {
        console.error("Error fetching campaign details:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();

        // Verificar existencia
        const campaignExists = await prisma.referralCampaign.findFirst({
            where: { id, negocioId }
        });

        if (!campaignExists) {
            return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
        }

        const {
            nombre,
            descripcion,
            imagenUrl,
            activa,
            tipoRecompensa,
            valorRecompensa,
            referidosRequeridos,
            fechaInicio,
            fechaFin,
            limitePremios,
            rankingActivo,
            tipoIncentivo,
            valorIncentivo,
            // Nuevos campos
            tipoCampana,
            estado,
            diasInactividad,
            maxPremiosPorCliente,
            permitirRepetir,
            prioridad,
            combinable
        } = body;

        const updated = await (prisma as any).referralCampaign.update({
            where: { id },
            data: {
                nombre: nombre !== undefined ? nombre : undefined,
                descripcion: descripcion !== undefined ? descripcion : undefined,
                imagenUrl: imagenUrl !== undefined ? imagenUrl : undefined,
                activa: estado !== undefined ? (estado === "ACTIVA") : (activa !== undefined ? Boolean(activa) : undefined),
                estado: estado !== undefined ? estado : undefined,
                tipoRecompensa: tipoRecompensa !== undefined ? tipoRecompensa : undefined,
                valorRecompensa: valorRecompensa !== undefined ? valorRecompensa : undefined,
                referidosRequeridos: referidosRequeridos !== undefined ? parseInt(String(referidosRequeridos)) : undefined,
                fechaInicio: fechaInicio !== undefined ? (fechaInicio ? new Date(fechaInicio) : new Date()) : undefined,
                fechaFin: fechaFin !== undefined ? (fechaFin ? new Date(fechaFin) : null) : undefined,
                limitePremios: limitePremios !== undefined ? (limitePremios !== null && limitePremios !== "" ? parseInt(String(limitePremios)) : null) : undefined,
                rankingActivo: rankingActivo !== undefined ? Boolean(rankingActivo) : undefined,
                tipoIncentivo: tipoIncentivo !== undefined ? tipoIncentivo : undefined,
                valorIncentivo: valorIncentivo !== undefined ? valorIncentivo : undefined,
                tipoCampana: tipoCampana !== undefined ? tipoCampana : undefined,
                diasInactividad: diasInactividad !== undefined ? (diasInactividad !== null ? parseInt(String(diasInactividad)) : null) : undefined,
                maxPremiosPorCliente: maxPremiosPorCliente !== undefined ? (maxPremiosPorCliente !== null ? parseInt(String(maxPremiosPorCliente)) : null) : undefined,
                permitirRepetir: permitirRepetir !== undefined ? Boolean(permitirRepetir) : undefined,
                prioridad: prioridad !== undefined ? parseInt(String(prioridad)) : undefined,
                combinable: combinable !== undefined ? Boolean(combinable) : undefined,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Error updating campaign:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const { id } = await params;

        // Verificar existencia
        const campaign = await prisma.referralCampaign.findFirst({
            where: { id, negocioId }
        });

        if (!campaign) {
            return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
        }

        // Verificar si tiene historial para evitar errores de integridad referencial
        const hasEvents = await prisma.referralEvent.count({ where: { campaignId: id } });
        const hasRewards = await prisma.referralReward.count({ where: { campaignId: id } });

        if (hasEvents > 0 || hasRewards > 0) {
            return NextResponse.json({
                error: "No se puede eliminar la campaña porque tiene referidos registrados o premios generados. Puedes desactivarla para que ya no aparezca activa."
            }, { status: 400 });
        }

        await prisma.referralCampaign.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Campaña eliminada correctamente" });
    } catch (error: any) {
        console.error("Error deleting campaign:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
