import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/public/[slug]/coupons/validate?code=XXX&serviceId=YYY&total=ZZZ
 * Valida un cupón públicamente y devuelve el descuento calculado.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const url = new URL(req.url);
        const code = url.searchParams.get("code")?.trim().toUpperCase();
        const serviceId = url.searchParams.get("serviceId");
        const totalRaw = url.searchParams.get("total");
        const total = parseFloat(totalRaw || "0");

        if (!code) {
            return NextResponse.json({ valid: false, error: "Código requerido" }, { status: 400 });
        }

        // Obtener negocio por slug
        const negocio = await prisma.negocio.findUnique({ where: { slug } });
        if (!negocio) {
            return NextResponse.json({ valid: false, error: "Negocio no encontrado" }, { status: 404 });
        }

        // Buscar cupón
        const coupon = await prisma.coupon.findUnique({
            where: { negocioId_codigo: { negocioId: negocio.id, codigo: code } },
        });

        if (!coupon || !coupon.activa) {
            return NextResponse.json({ valid: false, error: "Cupón no válido o inactivo" });
        }

        // Verificar fechas
        const now = new Date();
        if (coupon.fechaInicio && now < coupon.fechaInicio) {
            return NextResponse.json({ valid: false, error: "El cupón aún no está vigente" });
        }
        if (coupon.fechaFin && now > coupon.fechaFin) {
            return NextResponse.json({ valid: false, error: "El cupón ha expirado" });
        }

        // Verificar máximo de usos globales
        if (coupon.maxUsos !== null && coupon.usosActuales >= coupon.maxUsos) {
            return NextResponse.json({ valid: false, error: "El cupón ha alcanzado su límite de usos" });
        }

        // Verificar si aplica solo a un servicio específico
        if (coupon.servicioId && serviceId && coupon.servicioId !== serviceId) {
            return NextResponse.json({ valid: false, error: "Este cupón no aplica para el servicio seleccionado" });
        }

        // Calcular descuento
        let descuento = 0;
        if (coupon.tipo === "PORCENTAJE") {
            descuento = Math.round((total * coupon.valor) / 100 * 100) / 100;
        } else if (coupon.tipo === "FIJO") {
            descuento = Math.min(coupon.valor, total);
        }

        const totalConDescuento = Math.max(0, total - descuento);

        return NextResponse.json({
            valid: true,
            couponId: coupon.id,
            codigo: coupon.codigo,
            tipo: coupon.tipo,
            valor: coupon.valor,
            descripcion: coupon.descripcion,
            descuento,
            totalConDescuento,
        });
    } catch (error) {
        console.error("Error validando cupón:", error);
        return NextResponse.json({ valid: false, error: "Error interno" }, { status: 500 });
    }
}
