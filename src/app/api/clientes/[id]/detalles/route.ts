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
        const cleanPhone = cliente.telefono.replace(/\D/g, '');
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

            // Participación de Misiones (QuestProgress)
            const misiones = await prisma.questProgress.findMany({
                where: { 
                    userId,
                    Quest: {
                        negocioId
                    }
                },
                include: { 
                    Quest: true
                },
                orderBy: { updatedAt: 'desc' }
            });
            loyaltyData.misiones = misiones as any;
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
