import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

// GET /api/admin/loyalty/coupons — Listar cupones del negocio (unificados con globales)
import { ClubResolver } from "@/lib/growth/clubResolver";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const resolved = await ClubResolver.resolveCoupons(negocioId);
        const coupons = resolved.map(r => {
            if (r.source === 'LOCAL') {
                return {
                    ...r.data,
                    isGlobal: false,
                    mode: r.mode
                };
            } else {
                // Mapear CouponTemplate a estructura de Coupon esperado por el frontend
                const config = r.data.config ?? {};
                return {
                    id: r.data.id,
                    negocioId,
                    codigo: config.codigo ?? `CITIOX-${r.data.id.substring(0, 5).toUpperCase()}`,
                    tipo: config.tipo ?? 'PORCENTAJE',
                    valor: config.valor ?? 0,
                    descripcion: r.data.descripcion ?? '',
                    fechaInicio: null,
                    fechaFin: null,
                    maxUsos: null,
                    usosActuales: 0,
                    maxUsosPorCliente: null,
                    acumulable: false,
                    activa: r.data.activo ?? true,
                    isGlobal: true,
                    mode: r.mode,
                    resourceId: r.resourceId
                };
            }
        });

        return NextResponse.json(coupons);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

// POST /api/admin/loyalty/coupons — Crear nuevo cupón
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const user = session.user as any;
        const negocioId = user.negocioId;
        if (!negocioId) return NextResponse.json({ error: "Negocio no especificado" }, { status: 400 });

        const body = await req.json();
        const {
            codigo,
            tipo = "PORCENTAJE",
            valor,
            servicioId,
            descripcion,
            fechaInicio,
            fechaFin,
            maxUsos,
            maxUsosPorCliente,
            acumulable = false
        } = body;

        if (!tipo || valor === undefined) {
            return NextResponse.json({ error: "Faltan campos: tipo y valor son requeridos" }, { status: 400 });
        }

        // Generar código si no se provee
        const finalCodigo = codigo
            ? codigo.toUpperCase().trim()
            : `DESC${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const coupon = await (prisma as any).coupon.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                codigo: finalCodigo,
                tipo,
                valor: parseFloat(String(valor)),
                servicioId: servicioId || null,
                descripcion: descripcion || null,
                fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                maxUsos: maxUsos ? parseInt(String(maxUsos)) : null,
                maxUsosPorCliente: maxUsosPorCliente ? parseInt(String(maxUsosPorCliente)) : null,
                acumulable: Boolean(acumulable),
                activa: true,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(coupon);
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "El código de cupón ya existe para este negocio" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
