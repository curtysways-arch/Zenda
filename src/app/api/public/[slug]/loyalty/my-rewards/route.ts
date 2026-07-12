import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
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

        // 1. Obtener usuario
        const digitsOnly = phone.replace(/\D/g, '');
        const user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { phone: digitsOnly }
                ]
            }
        });

        if (!user) return NextResponse.json({ error: "Usuario no registrado" }, { status: 404 });

        // 2. Obtener cupones asignados (ClientCoupon)
        const clientCoupons = await prisma.clientCoupon.findMany({
            where: { negocioId, clienteId: user.id },
            orderBy: { fechaAsignacion: "desc" }
        });

        // 3. Obtener premios ganados por campañas (ReferralReward)
        const referralRewards = await prisma.referralReward.findMany({
            where: { negocioId, userId: user.id },
            include: {
                Campaign: {
                    select: { id: true, nombre: true, valorRecompensa: true, rewardType: true, recompensaImagenUrl: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // 4. Obtener canjes por puntos (LoyaltyRedemption)
        const loyaltyRedemptions = await (prisma as any).loyaltyRedemption.findMany({
            where: { negocioId, userId: user.id },
            include: {
                Reward: {
                    select: { id: true, nombre: true, tipo: true, costoPuntos: true, recompensaImagenUrl: true, serviceId: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Agrupar premios
        const disponibles: any[] = [];
        const pendientesEntrega: any[] = [];
        const entregados: any[] = [];
        const vencidos: any[] = [];

        // Clasificar ClientCoupons (Automáticos directos)
        for (const coupon of clientCoupons) {
            const formatted = {
                id: coupon.id,
                tipoOrigen: "CUPON",
                rewardType: "CUPON",
                nombre: coupon.nombre || "Descuento",
                descripcion: coupon.descripcion || "Cupón de descuento",
                codigo: coupon.codigo,
                descuento: coupon.descuento,
                tipoDescuento: coupon.tipo, // PORCENTAJE | FIJO
                fechaAsignacion: coupon.fechaAsignacion,
                fechaExpiracion: coupon.fechaExpiracion,
                estado: coupon.estado
            };

            if (coupon.estado === "DISPONIBLE" || coupon.estado === "RESERVADO") {
                disponibles.push(formatted);
            } else if (coupon.estado === "USADO") {
                entregados.push(formatted);
            } else {
                vencidos.push(formatted);
            }
        }

        // Clasificar ReferralRewards (Premios por recomendados / campañas)
        for (const reward of referralRewards) {
            const isManual = reward.Campaign.rewardType === 'REGALO' || reward.Campaign.rewardType === 'PERSONALIZADO' || reward.Campaign.rewardType === 'PRODUCTO';
            const formatted = {
                id: reward.id,
                tipoOrigen: "REFERIDO",
                rewardType: reward.Campaign.rewardType,
                nombre: reward.Campaign.nombre,
                descripcion: reward.Campaign.valorRecompensa,
                claimCode: reward.claimCode,
                recompensaImagenUrl: reward.Campaign.recompensaImagenUrl,
                fechaAsignacion: reward.createdAt,
                fechaEntrega: reward.fechaEntregaConfirmada,
                observaciones: reward.observaciones,
                estado: reward.estado,
                isManual
            };

            if (reward.estado === "DISPONIBLE" || reward.estado === "RESERVADO") {
                disponibles.push(formatted);
            } else if (reward.estado === "PENDIENTE_ENTREGA") {
                pendientesEntrega.push(formatted);
            } else if (reward.estado === "ENTREGADO" || reward.estado === "CANJEADO") {
                entregados.push(formatted);
            } else {
                vencidos.push(formatted);
            }
        }

        // Clasificar LoyaltyRedemptions (Canjes por puntos)
        for (const red of loyaltyRedemptions) {
            const isManual = red.Reward.tipo === 'REGALO' || red.Reward.tipo === 'PERSONALIZADO' || red.Reward.tipo === 'PRODUCTO';
            const formatted = {
                id: red.id,
                tipoOrigen: "PUNTOS",
                rewardType: red.Reward.tipo,
                nombre: red.Reward.nombre,
                descripcion: `Canjeado por ${red.Reward.costoPuntos} PTS`,
                claimCode: red.claimCode,
                recompensaImagenUrl: red.Reward.recompensaImagenUrl,
                fechaAsignacion: red.createdAt,
                fechaEntrega: red.fechaEntregaConfirmada,
                observaciones: red.observaciones,
                estado: red.estado,
                isManual,
                serviceId: red.Reward.serviceId
            };

            if (red.estado === "DISPONIBLE" || red.estado === "RESERVADO") {
                disponibles.push(formatted);
            } else if (red.estado === "PENDIENTE_ENTREGA") {
                pendientesEntrega.push(formatted);
            } else if (red.estado === "ENTREGADO" || red.estado === "CANJEADO") {
                entregados.push(formatted);
            } else {
                vencidos.push(formatted);
            }
        }

        return NextResponse.json({
            disponibles,
            pendientesEntrega,
            entregados,
            vencidos
        });
    } catch (error: any) {
        console.error("Error fetching client rewards:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
