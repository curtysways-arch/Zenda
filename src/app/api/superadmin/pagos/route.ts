import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTeamContext, canAccessBusinessId, outsidePortfolio } from "@/lib/admin/teamGuard";

async function isSuperAdmin() {
    // Usuario del equipo Citiox; el permiso de cada acción lo valida el middleware (lib/admin/teamAccessMap)
    return Boolean(await getTeamContext());
}

export async function POST(req: NextRequest) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { negocioId, monto, metodoPago, referencia, comprobante, planId } = body;

        if (!negocioId || !monto) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }
        const ctx = await getTeamContext();
        if (!ctx || !(await canAccessBusinessId(ctx, negocioId))) return outsidePortfolio();
        const montoNum = parseFloat(String(monto).replace(',', '.'));
        if (!Number.isFinite(montoNum) || montoNum <= 0) {
            return NextResponse.json({ error: "El monto debe ser mayor que cero" }, { status: 400 });
        }

        const payment = await (prisma as any).payment.create({
            data: {
                negocio_id: negocioId,
                plan_id: planId || '',
                monto: montoNum,
                metodo_pago: metodoPago,
                referencia: referencia,
                comprobante: comprobante,
                estado_pago: 'completado',
                fecha_pago: new Date()
            }
        });

        return NextResponse.json(payment);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 });
    }
}
