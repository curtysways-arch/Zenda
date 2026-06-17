import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isSuperAdmin() {
    // const session = await getServerSession(authOptions);
    // return (session?.user as any)?.role === 'SUPER_ADMIN';
    return true; // DEBUG
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

        const payment = await (prisma as any).payment.create({
            data: {
                negocio_id: negocioId,
                plan_id: planId || '',
                monto: parseFloat(monto),
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
