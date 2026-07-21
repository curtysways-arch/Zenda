import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ClubResolver } from "@/lib/growth/clubResolver";

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

        // Obtener el catálogo unificado de premios mediante el ClubResolver (soporta herencia y overrides)
        const resolved = await ClubResolver.resolveRewards(negocio.id);
        
        // Mapear a la estructura plana tradicional de LoyaltyReward que la app del cliente espera
        const rewards = resolved.map(r => {
            if (r.source === 'LOCAL') {
                return {
                    ...r.data,
                    isGlobal: false,
                    mode: r.mode
                };
            } else {
                return {
                    id: r.data.id,
                    negocioId: negocio.id,
                    nombre: r.data.nombre,
                    descripcion: r.data.descripcion ?? '',
                    imagenUrl: r.data.config?.imagenUrl ?? null,
                    recompensaImagenUrl: null,
                    costoPuntos: r.data.config?.costoPuntos ?? 0,
                    tipo: r.data.tipo,
                    deliveryType: 'AUTOMATICO',
                    valor: r.data.config?.valor ? String(r.data.config?.valor) : null,
                    serviceId: r.data.config?.serviceId ?? null,
                    couponId: r.data.config?.couponId ?? null,
                    cantidadTotal: null,
                    cantidadDisponible: null,
                    activa: r.data.activo ?? true,
                    isGlobal: true,
                    mode: r.mode
                };
            }
        });

        // Cargar los servicios relacionados en una consulta única para las imágenes/detalles
        const serviceIds = rewards.map(r => r.serviceId).filter(Boolean) as string[];
        const services = serviceIds.length > 0 ? await prisma.service.findMany({
            where: { id: { in: serviceIds } },
            include: {
                imageMedia: true,
                Imagen: true
            }
        }) : [];
        const servicesMap = new Map(services.map(s => [s.id, s]));

        // Integrar el objeto Service a cada recompensa
        const rewardsWithService = rewards.map(r => ({
            ...r,
            Service: r.serviceId ? (servicesMap.get(r.serviceId) || null) : null
        }));

        return NextResponse.json(rewardsWithService);
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

        // Variaciones del teléfono para máxima compatibilidad
        const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = phone.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

        // 1. Obtener usuario
        const user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { phone: localTelefono },
                    { phone: digitsOnly },
                    { phone: { endsWith: localNoZero } }
                ]
            }
        });

        if (!user) return NextResponse.json({ error: "Usuario no registrado" }, { status: 404 });

        const body = await req.json();
        const { rewardId } = body;

        if (!rewardId) return NextResponse.json({ error: "ID de recompensa faltante" }, { status: 400 });

        // 2. Resolver recompensa (local o global con herencia)
        let reward = await (prisma as any).loyaltyReward.findFirst({
            where: { id: rewardId, negocioId, activa: true },
            include: { Coupon: true }
        });

        let isGlobalReward = false;
        let globalReward = null;

        if (!reward) {
            globalReward = await prisma.rewardCatalog.findUnique({
                where: { id: rewardId }
            });

            if (globalReward) {
                // Verificar modo de herencia
                const inheritance = await prisma.businessInheritance.findUnique({
                    where: {
                        negocioId_resourceType_resourceId: {
                            negocioId,
                            resourceType: "REWARD",
                            resourceId: rewardId
                        }
                    }
                });

                if (inheritance?.mode === 'DISABLED') {
                    return NextResponse.json({ error: "Recompensa no disponible en este negocio" }, { status: 404 });
                }

                if (inheritance?.mode === 'CUSTOMIZED' && inheritance.customId) {
                    reward = await (prisma as any).loyaltyReward.findFirst({
                        where: { id: inheritance.customId, negocioId, activa: true },
                        include: { Coupon: true }
                    });
                } else {
                    isGlobalReward = true;
                    reward = {
                        id: globalReward.id,
                        negocioId,
                        nombre: globalReward.nombre,
                        descripcion: globalReward.descripcion ?? '',
                        costoPuntos: (globalReward.config as any)?.costoPuntos ?? 0,
                        tipo: globalReward.tipo,
                        deliveryType: 'AUTOMATICO',
                        valor: (globalReward.config as any)?.valor ? String((globalReward.config as any)?.valor) : null,
                        serviceId: (globalReward.config as any)?.serviceId ?? null,
                        couponId: (globalReward.config as any)?.couponId ?? null,
                        Coupon: null
                    };
                }
            }
        }

        if (!reward) return NextResponse.json({ error: "Premio no disponible en el catálogo" }, { status: 404 });

        // Si el premio es de tipo cupón, asegurar que exista el cupón local en la base de datos (Copy-On-Write)
        if (reward.tipo === 'CUPON') {
            let coupon = reward.Coupon;
            
            if (!coupon && reward.couponId) {
                coupon = await prisma.coupon.findUnique({
                    where: { id: reward.couponId }
                });

                if (!coupon) {
                    const template = await prisma.couponTemplate.findUnique({
                        where: { id: reward.couponId }
                    });

                    if (template) {
                        const couponCode = (template.config as any)?.codigo || `CITIOX-${template.id.substring(0, 5).toUpperCase()}`;
                        coupon = await prisma.coupon.create({
                            data: {
                                id: template.id,
                                negocioId,
                                codigo: couponCode.trim().toUpperCase(),
                                tipo: (template.config as any)?.tipo || 'PORCENTAJE',
                                valor: Number((template.config as any)?.valor || 0),
                                descripcion: template.descripcion || template.nombre,
                                maxUsos: null,
                                usosActuales: 0,
                                fechaFin: null,
                                activa: true
                            }
                        });
                        await ClubResolver.setCustomized(negocioId, "COUPON_TEMPLATE", template.id, template.id);
                    }
                }
            }

            if (!coupon) {
                return NextResponse.json({ error: "Este premio de tipo cupón no tiene un cupón válido asociado en el catálogo." }, { status: 400 });
            }

            reward.Coupon = coupon;
            reward.couponId = coupon.id;
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
            const deliveryType = reward.deliveryType || 'AUTOMATICO';
            const rewardType = reward.tipo || 'PERSONALIZADO';

            // Extraer monto de cashback si aplica
            let cashbackMonto = 10;
            if (rewardType === 'CASHBACK') {
                if (reward.valor) {
                    const parsedVal = parseFloat(reward.valor);
                    if (!isNaN(parsedVal)) {
                        cashbackMonto = parsedVal;
                    }
                } else {
                    const moneyMatch = reward.nombre.match(/\$\s*(\d+(\.\d+)?)/) || reward.nombre.match(/\b(\d+(\.\d+)?)\b/);
                    if (moneyMatch) {
                        cashbackMonto = parseFloat(moneyMatch[1]) || 10;
                    }
                }
            }

            // Descontar puntos e incrementar cashback
            const updatePointsData: any = {
                puntos: {
                    decrement: reward.costoPuntos
                }
            };
            if (rewardType === 'CASHBACK') {
                updatePointsData.cashback = {
                    increment: cashbackMonto
                };
            }

            const updatedPoints = await (tx as any).userPoints.upsert({
                where: { userId_negocioId: { userId: user.id, negocioId } },
                update: updatePointsData,
                create: {
                    userId: user.id,
                    negocioId,
                    puntos: -reward.costoPuntos,
                    cashback: rewardType === 'CASHBACK' ? cashbackMonto : 0.0
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
                    notes: `Canje de premio: ${reward.nombre}`,
                    notas: `Canje de premio: ${reward.nombre}` // soportar ambas columnas por compatibilidad
                }
            });

            let estadoInicial = 'DISPONIBLE';
            let claimCode = null;

            if (deliveryType === 'MANUAL') {
                estadoInicial = 'PENDIENTE_ENTREGA';
                
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let isUnique = false;
                for (let attempt = 0; attempt < 10; attempt++) {
                    let tempCode = 'PX-';
                    for (let i = 0; i < 6; i++) {
                        tempCode += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    const checkRef = await tx.referralReward.findFirst({ where: { claimCode: tempCode } });
                    const checkLoy = await tx.loyaltyRedemption.findFirst({ where: { claimCode: tempCode } });
                    if (!checkRef && !checkLoy) {
                        claimCode = tempCode;
                        isUnique = true;
                        break;
                    }
                }
                if (!isUnique) {
                    claimCode = `PX-${Date.now().toString().slice(-6)}`;
                }
            } else if (rewardType === 'CUPON' || rewardType === 'CASHBACK') {
                estadoInicial = 'CANJEADO';
            }

            // Si el premio es global heredado, realizamos Copy-On-Write a la tabla LoyaltyReward local dentro de la transacción
            let finalRewardId = reward.id;
            if (isGlobalReward) {
                const customId = crypto.randomUUID();
                await (tx as any).loyaltyReward.create({
                    data: {
                        id: customId,
                        negocioId,
                        nombre: reward.nombre,
                        descripcion: reward.descripcion || null,
                        imagenUrl: reward.imagenUrl || null,
                        recompensaImagenUrl: null,
                        costoPuntos: reward.costoPuntos,
                        tipo: reward.tipo,
                        deliveryType: 'AUTOMATICO',
                        valor: reward.valor,
                        serviceId: reward.serviceId,
                        couponId: reward.couponId,
                        cantidadTotal: null,
                        cantidadDisponible: null,
                        activa: true
                    }
                });

                // Registrar en la tabla de herencia para enlazar el recurso global con el local
                await (tx as any).businessInheritance.upsert({
                    where: {
                        negocioId_resourceType_resourceId: {
                            negocioId,
                            resourceType: "REWARD",
                            resourceId: reward.id
                        }
                    },
                    update: {
                        mode: "CUSTOMIZED",
                        customId: customId
                    },
                    create: {
                        id: crypto.randomUUID(),
                        negocioId,
                        resourceType: "REWARD",
                        resourceId: reward.id,
                        mode: "CUSTOMIZED",
                        customId: customId
                    }
                });

                finalRewardId = customId;
                reward.id = customId; // Actualizar el ID para crear el ClientCoupon correctamente
            }

            // Registrar canje
            const redemption = await (tx as any).loyaltyRedemption.create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId,
                    userId: user.id,
                    rewardId: finalRewardId,
                    estado: estadoInicial as any,
                    claimCode
                }
            });

            // Si el premio es de tipo cupón, crear el ClientCoupon para el usuario
            let clientCouponCreated = null;
            if (rewardType === 'CUPON' && reward.Coupon) {
                const parentCoupon = reward.Coupon;
                
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let uniqueCode = '';
                let isUnique = false;
                
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

                let expirationDate = parentCoupon.fechaFin;
                if (!expirationDate) {
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

                await tx.coupon.update({
                    where: { id: parentCoupon.id },
                    data: { usosActuales: { increment: 1 } }
                });
            }

            return { updatedPoints, redemption, clientCouponCreated };
        });

        return NextResponse.json({ 
            success: true, 
            balance: result.updatedPoints.puntos,
            redemptionId: result.redemption.id,
            claimCode: result.redemption.claimCode,
            estado: result.redemption.estado
        });
    } catch (error: any) {
        console.error("Error in public reward redemption:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
