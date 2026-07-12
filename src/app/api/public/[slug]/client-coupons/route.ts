import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * GET /api/public/[slug]/client-coupons
 * Lista los cupones asignados individualmente al cliente autenticado.
 * Query params opcionales: ?estado=DISPONIBLE|RESERVADO|USADO|VENCIDO|CANCELADO
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const url = new URL(req.url);
        const filterEstado = url.searchParams.get("estado") || null;

        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        let payload;
        try {
            const verification = await jwtVerify(token, secret);
            payload = verification.payload;
        } catch (e) {
            return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
        }

        const phone = payload.telefono as string;
        const negocioId = payload.negocioId as string;

        // 1. Obtener usuario por teléfono
        const digitsOnly = phone.replace(/\D/g, ''); 
        const user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { phone: digitsOnly }
                ]
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no registrado" }, { status: 404 });
        }

        // 2. Obtener cupones asignados
        const whereClause: any = {
            negocioId,
            clienteId: user.id
        };

        if (filterEstado) {
            whereClause.estado = filterEstado;
        }

        const clientCoupons = await prisma.clientCoupon.findMany({
            where: whereClause,
            orderBy: { fechaAsignacion: "desc" }
        });

        // 3. Procesar fecha de expiración para actualizar estado a VENCIDO si ya caducó
        const now = new Date();
        const updatedCoupons = await Promise.all(
            clientCoupons.map(async (coupon) => {
                if (coupon.estado === "DISPONIBLE" && coupon.fechaExpiracion && coupon.fechaExpiracion < now) {
                    // Actualizar en base de datos de forma asíncrona
                    await prisma.clientCoupon.update({
                        where: { id: coupon.id },
                        data: { estado: "VENCIDO" }
                    });
                    return { ...coupon, estado: "VENCIDO" };
                }
                return coupon;
            })
        );

        return NextResponse.json(updatedCoupons);
    } catch (error: any) {
        console.error("Error in GET client-coupons:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
