import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/loyalty/client-coupons
 * Lista los cupones individuales asignados a clientes en el negocio.
 * Acepta query param ?clienteId=xxx para filtrar por cliente.
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.negocioId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const negocioId = (session.user as any).negocioId;
        const url = new URL(req.url);
        const clienteId = url.searchParams.get("clienteId") || undefined;

        const where: any = { negocioId };
        if (clienteId) where.clienteId = clienteId;

        const coupons = await prisma.clientCoupon.findMany({
            where,
            include: {
                Usuario: { select: { id: true, nombre: true, phone: true } }
            },
            orderBy: { fechaAsignacion: "desc" },
            take: 100
        });

        return NextResponse.json(coupons);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/loyalty/client-coupons
 * Asigna un cupón directamente a un cliente específico (por ID o teléfono).
 *
 * Body: {
 *   clienteId?: string,       // ID del Usuario al que asignar el cupón
 *   telefono?: string,        // Alternativa a clienteId: buscar por teléfono
 *   couponId: string,         // ID del cupón base a asignar
 *   nombre?: string,          // Nombre personalizado del cupón (opcional)
 *   descripcion?: string,
 *   fechaExpiracion?: string  // ISO date string opcional
 * }
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.negocioId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const negocioId = (session.user as any).negocioId;

        const body = await req.json();
        const { clienteId, telefono, couponId, nombre, descripcion, fechaExpiracion } = body;

        if (!couponId) {
            return NextResponse.json({ error: "couponId es requerido" }, { status: 400 });
        }
        if (!clienteId && !telefono) {
            return NextResponse.json({ error: "Debes proveer clienteId o telefono" }, { status: 400 });
        }

        // 1. Resolver usuario
        let usuario: any = null;
        if (clienteId) {
            usuario = await prisma.usuario.findUnique({ where: { id: clienteId } });
        } else if (telefono) {
            const localTelefono = telefono.replace(/^\+(\d{1,4})/, '');
            const digitsOnly = telefono.replace(/\D/g, '');
            const localNoZero = localTelefono.replace(/^0+/, '');
            usuario = await prisma.usuario.findFirst({
                where: {
                    OR: [
                        { phone: telefono },
                        { phone: localTelefono },
                        { phone: digitsOnly },
                        { phone: { endsWith: localNoZero } }
                    ]
                }
            });
        }

        if (!usuario) {
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        // 2. Verificar que el cupón base pertenece al negocio
        const couponBase = await (prisma as any).coupon.findFirst({
            where: { id: couponId, negocioId }
        });
        if (!couponBase) {
            return NextResponse.json({ error: "Cupón base no encontrado" }, { status: 404 });
        }

        // 3. Generar código único para el cupón asignado
        const codigoUnico = `MAN-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`;

        // 4. Crear el ClientCoupon
        const clientCoupon = await prisma.clientCoupon.create({
            data: {
                id: crypto.randomUUID(),
                negocioId,
                clienteId: usuario.id,
                couponId: couponBase.id,
                sourceType: "MANUAL",
                estado: "DISPONIBLE",
                codigo: codigoUnico,
                codigoOriginal: couponBase.codigo,
                nombre: nombre || couponBase.descripcion || `Cupón ${couponBase.codigo}`,
                descripcion: descripcion || couponBase.descripcion || null,
                descuento: couponBase.valor,
                tipo: couponBase.tipo,
                fechaAsignacion: new Date(),
                fechaExpiracion: fechaExpiracion ? new Date(fechaExpiracion) : (couponBase.fechaFin ? new Date(couponBase.fechaFin) : null),
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, clientCoupon });
    } catch (error: any) {
        console.error("Error asignando cupón a cliente:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/loyalty/client-coupons
 * Cancela/elimina un cupón asignado a un cliente.
 * Body: { clientCouponId: string }
 */
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.negocioId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const negocioId = (session.user as any).negocioId;
        const body = await req.json();
        const { clientCouponId } = body;

        if (!clientCouponId) {
            return NextResponse.json({ error: "clientCouponId es requerido" }, { status: 400 });
        }

        const existing = await prisma.clientCoupon.findFirst({
            where: { id: clientCouponId, negocioId }
        });
        if (!existing) {
            return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });
        }

        await prisma.clientCoupon.update({
            where: { id: clientCouponId },
            data: { estado: "CANCELADO" }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
