import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const negocioId = (session.user as any).negocioId;
        const { id } = await params;

        // 1. Buscar al cliente
        const cliente = await prisma.cliente.findUnique({
            where: { id }
        });

        if (!cliente) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
        }

        // 2. Intentar buscar el Usuario correspondiente por teléfono
        const cleanPhone = (cliente.telefono || '').replace(/\D/g, '');
        const localNoZero = cleanPhone.startsWith('593') ? cleanPhone.slice(3) : cleanPhone; // ejemplo Ecuador

        const usuario = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: cliente.telefono },
                    { phone: cleanPhone },
                    { phone: { endsWith: localNoZero } }
                ]
            }
        });

        let loyaltyData = {
            points: 0,
            cashback: 0,
            level: 'Bronce',
            levelIcon: 'Sparkles',
            cupones: [],
            misiones: [],
            regalos: []
        };

        if (usuario) {
            const userId = usuario.id;

            // Puntos y Cashback
            const userPoints = await prisma.userPoints.findUnique({
                where: { userId_negocioId: { userId, negocioId } },
                include: { NivelActual: true }
            });

            if (userPoints) {
                loyaltyData.points = userPoints.puntos;
                loyaltyData.cashback = userPoints.cashback;
                if (userPoints.NivelActual) {
                    loyaltyData.level = userPoints.NivelActual.nombre;
                }
            }

            // Cupones del cliente (ClientCoupon)
            const cupones = await prisma.clientCoupon.findMany({
                where: { clienteId: userId, negocioId },
                include: { Coupon: true },
                orderBy: { fechaAsignacion: 'desc' }
            });
            loyaltyData.cupones = cupones as any;

            // Canjes / Regalos (LoyaltyRedemption)
            const redemptions = await prisma.loyaltyRedemption.findMany({
                where: { userId, negocioId },
                include: { Reward: true },
                orderBy: { createdAt: 'desc' }
            });
            loyaltyData.regalos = redemptions as any;

            // Participación de Misiones (BusinessMissionProgress & BusinessMission)
            const businessMissions = await prisma.businessMission.findMany({
                where: {
                    negocioId,
                    status: 'ACTIVE',
                    MissionDefinition: {
                        status: 'PUBLISHED'
                    }
                },
                include: {
                    MissionDefinition: true
                }
            });

            const progressList = await prisma.businessMissionProgress.findMany({
                where: {
                    userId,
                    BusinessMission: {
                        negocioId
                    }
                },
                include: {
                    BusinessMission: {
                        include: {
                            MissionDefinition: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            const progressMap = new Map<string, typeof progressList[0]>();
            for (const p of progressList) {
                progressMap.set(p.businessMissionId, p);
            }

            const misionesResultado: any[] = [];

            // 1. Misiones activas del negocio
            for (const bm of businessMissions) {
                const def = bm.MissionDefinition;
                const p = progressMap.get(bm.id);
                const actual = p ? p.progresoActual : 0;
                const meta = p?.progresoRequerido || def.cantidadMeta || 1;
                const estado = p ? (p.estado === 'RECOMPENSADA' ? 'RECOMPENSADA' : p.estado) : 'EN_PROGRESO';

                misionesResultado.push({
                    id: p?.id || `bm-${bm.id}`,
                    businessMissionId: bm.id,
                    progresoActual: actual,
                    progresoRequerido: meta,
                    estado,
                    recompensaDada: p?.recompensaDada || false,
                    fechaCompletada: p?.fechaCompletada || null,
                    updatedAt: p?.updatedAt || bm.createdAt,
                    Quest: {
                        id: bm.id,
                        nombre: def.nombre,
                        descripcion: def.descripcion || '',
                        cantidadMeta: meta,
                        categoria: def.categoria,
                        icono: (def as any)?.icono || 'Award',
                        imagenUrl: def.imagenUrl
                    }
                });
            }

            // 2. Misiones con progreso previo que quizás ya no están activas en el negocio
            for (const p of progressList) {
                if (!misionesResultado.some(m => m.businessMissionId === p.businessMissionId)) {
                    const def = p.BusinessMission?.MissionDefinition;
                    const meta = p.progresoRequerido || def?.cantidadMeta || 1;
                    misionesResultado.push({
                        id: p.id,
                        businessMissionId: p.businessMissionId,
                        progresoActual: p.progresoActual,
                        progresoRequerido: meta,
                        estado: p.estado,
                        recompensaDada: p.recompensaDada,
                        fechaCompletada: p.fechaCompletada,
                        updatedAt: p.updatedAt,
                        Quest: {
                            id: p.businessMissionId,
                            nombre: def?.nombre || 'Misión',
                            descripcion: def?.descripcion || '',
                            cantidadMeta: meta,
                            categoria: def?.categoria,
                            icono: (def as any)?.icono || 'Award',
                            imagenUrl: def?.imagenUrl
                        }
                    });
                }
            }

            // 3. Fallback a QuestProgress legacy
            const legacyProgress = await prisma.questProgress.findMany({
                where: { 
                    userId,
                    Quest: { negocioId }
                },
                include: { Quest: true }
            });
            for (const lp of legacyProgress) {
                misionesResultado.push(lp);
            }

            // Ordenar: primero EN_PROGRESO con avance > 0, luego el resto
            misionesResultado.sort((a, b) => {
                const getScore = (m: any) => {
                    if (m.estado === 'EN_PROGRESO' && m.progresoActual > 0) return 3;
                    if (m.estado === 'EN_PROGRESO') return 2;
                    if (m.estado === 'COMPLETADA' || m.estado === 'RECLAMADA' || m.estado === 'RECOMPENSADA') return 1;
                    return 0;
                };
                return getScore(b) - getScore(a);
            });

            loyaltyData.misiones = misionesResultado as any;
        }

        return NextResponse.json({
            cliente,
            loyalty: loyaltyData
        });
    } catch (error) {
        console.error('Error fetching client details:', error);
        return NextResponse.json({ error: 'Error al obtener detalles del cliente' }, { status: 500 });
    }
}
