import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const negocio = await prisma.negocio.findFirst({
            where: { slug }
        });
        if (!negocio) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

        // Obtener catálogo de premios por puntos activos
        const rewards = await (prisma as any).loyaltyReward.findMany({
            where: { negocioId: negocio.id, activa: true },
            orderBy: { costoPuntos: "asc" }
        });

        return NextResponse.json(rewards);
    } catch (error: any) {
        console.error("Error fetching public rewards:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function POST(
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

        const body = await req.json();
        const { rewardId } = body;

        if (!rewardId) return NextResponse.json({ error: "ID de recompensa faltante" }, { status: 400 });

        // 2. Obtener la recompensa del catálogo con su relación al cupón original si aplica
        const reward = await (prisma as any).loyaltyReward.findFirst({
            where: { id: rewardId, negocioId, activa: true },
            include: { Coupon: true }
        });

        if (!reward) return NextResponse.json({ error: "Premio no disponible en el catálogo" }, { status: 404 });

        if (reward.tipo === 'CUPON' && (!reward.couponId || !reward.Coupon)) {
            return NextResponse.json({ error: "Este premio de tipo cupón no tiene un cupón válido asociado en el catálogo." }, { status: 400 });
        }

        // 3. Obtener balance de puntos actual del usuario
        const pointsRecord = await (prisma as any).userPoints.findUnique({
            where: { userId_negocioId: { userId: user.id, negocioId } }
        });

        const balanceActual = pointsRecord?.puntos || 0;

        if (balanceActual < reward.costoPuntos) {
            return NextResponse.json({ error: `Puntos insuficientes. Requieres ${reward.costoPuntos} pts y tienes ${balanceActual} pts.` }, { status: 400 });
        }

        // 4. Iniciar transacción para el canje
        const result = await prisma.$transaction(async (tx) => {
            // Descontar puntos
            const updatedPoints = await (tx as any).userPoints.update({
                where: { userId_negocioId: { userId: user.id, negocioId } },
                data: {
                    puntos: {
                        decrement: reward.costoPuntos
                    }
                }
            });

            // Registrar movimiento en el historial
            await (tx as any).pointsHistory.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    negocioId,
                    puntos: -reward.costoPuntos,
                    concepto: 'CANJE',
                    notas: `Canje de premio: ${reward.nombre}`
                }
            });

            // Registrar canje en estado DISPONIBLE (pendiente de entrega física por staff)
            const redemption = await (tx as any).loyaltyRedemption.create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId,
                    userId: user.id,
                    rewardId,
                    estado: 'DISPONIBLE'
                }
            });

            // Si el premio es de tipo cupón, crear el ClientCoupon para el usuario
            let clientCouponCreated = null;
            if (reward.tipo === 'CUPON' && reward.Coupon) {
                const parentCoupon = reward.Coupon;
                
                // Generar código único CTX-XXXXX
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let uniqueCode = '';
                let isUnique = false;
                
                // Asegurar unicidad del código generado
                for (let attempt = 0; attempt < 5; attempt++) {
                    let tempCode = 'CTX-';
                    for (let i = 0; i < 5; i++) {
                        tempCode += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    const check = await tx.clientCoupon.findUnique({
                        where: { codigo: tempCode }
                    });
                    if (!check) {
                        uniqueCode = tempCode;
                        isUnique = true;
                        break;
                    }
                }
                
                if (!isUnique) {
                    uniqueCode = `CTX-${Date.now().toString().slice(-5)}`;
                }

                // Calcular fecha de expiración
                let expirationDate = parentCoupon.fechaFin;
                if (!expirationDate) {
                    // Si no tiene fecha de fin del catálogo, vence por defecto en 30 días
                    expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }

                clientCouponCreated = await tx.clientCoupon.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId,
                        clienteId: user.id,
                        couponId: parentCoupon.id,
                        sourceType: 'LOYALTY_REWARD',
                        sourceId: reward.id,
                        estado: 'DISPONIBLE',
                        codigo: uniqueCode,
                        codigoOriginal: parentCoupon.codigo,
                        nombre: reward.nombre,
                        descripcion: parentCoupon.descripcion || reward.descripcion || `Cupón obtenido canjeando ${reward.costoPuntos} puntos`,
                        descuento: parentCoupon.valor,
                        tipo: parentCoupon.tipo,
                        fechaAsignacion: new Date(),
                        fechaExpiracion: expirationDate
                    }
                });

                // Incrementar usos globales del cupón del catálogo
                await tx.coupon.update({
                    where: { id: parentCoupon.id },
                    data: { usosActuales: { increment: 1 } }
                });
            }

            return { updatedPoints, redemption, clientCouponCreated };
        });

        return NextResponse.json({ success: true, balance: result.updatedPoints.puntos });
    } catch (error: any) {
        console.error("Error in public reward redemption:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
