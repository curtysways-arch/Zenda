import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isSuperAdmin() {
    // const session = await getServerSession(authOptions);
    return true;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id } = await params;
        console.log(`PATCH /api/superadmin/planes/${id} - Body received:`, body);

        // Obtener datos actuales para actualización parcial si es necesario
        const currentPlan = await prisma.plan.findUnique({ where: { id } });
        if (!currentPlan) {
            return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
        }

        const updateData: any = {};

        // Mapeo flexible de campos (soporta nombres viejos y nuevos)
        if (body.name || body.nombre) updateData.name = String(body.name || body.nombre);
        if (body.description !== undefined) updateData.description = String(body.description);
        if (body.price !== undefined || body.precioMensual !== undefined)
            updateData.price = parseFloat(String(body.price ?? body.precioMensual ?? currentPlan.price));
        if (body.trial_days !== undefined)
            updateData.trial_days = Math.floor(Number(body.trial_days));
        if (body.max_fields !== undefined || body.limiteCanchas !== undefined)
            updateData.max_fields = Math.floor(Number(body.max_fields ?? body.limiteCanchas));
        if (body.max_reservations_per_month !== undefined || body.limiteReservas !== undefined)
            updateData.max_reservations_per_month = Math.floor(Number(body.max_reservations_per_month ?? body.limiteReservas));
        if (body.tournaments_enabled !== undefined)
            updateData.tournaments_enabled = Boolean(body.tournaments_enabled);
        if (body.automatic_discounts_enabled !== undefined)
            updateData.automatic_discounts_enabled = Boolean(body.automatic_discounts_enabled);
        if (body.courses_module !== undefined)
            updateData.courses_module = Boolean(body.courses_module);
        if (body.max_locations !== undefined)
            updateData.max_locations = Math.floor(Number(body.max_locations));
        if (body.is_recommended !== undefined)
            updateData.is_recommended = Boolean(body.is_recommended);
        if (body.activo !== undefined)
            updateData.activo = Boolean(body.activo);
        if (body.features !== undefined)
            updateData.features = body.features;

        console.log("DEBUG: Update Data ->", JSON.stringify(updateData));

        const plan = await prisma.plan.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(plan);
    } catch (error: any) {
        console.error("Error updating plan:", error);
        return NextResponse.json({
            error: "Error al actualizar el plan",
            details: error.message || String(error)
        }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Verificar si hay negocios usando este plan
        const count = await (prisma.negocio as any).count({
            where: { plan_id: id }
        });

        if (count > 0) {
            return NextResponse.json({
                error: "No se puede eliminar un plan que tiene negocios suscritos. Desactívalo en su lugar."
            }, { status: 400 });
        }

        await prisma.plan.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Plan eliminado" });
    } catch (error) {
        console.error("Error deleting plan:", error);
        return NextResponse.json({ error: "Error al eliminar el plan" }, { status: 500 });
    }
}
